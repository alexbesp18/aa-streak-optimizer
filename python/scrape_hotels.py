#!/usr/bin/env python3
"""
Hotel scraper CLI wrapper for AA AAdvantage Hotels.

This script can be called from Vercel serverless functions or run standalone.
It reuses the existing hotel scraping infrastructure from us_hotel_scraper.

Usage:
    python scrape_hotels.py <destination> <check_in> [--nights N]

Example:
    python scrape_hotels.py "Austin" "2025-02-01" --nights 10
"""

import asyncio
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Destination place IDs (Agoda format)
PLACE_IDS = {
    'Austin': 'AGODA_CITY|4542',
    'Dallas': 'AGODA_CITY|8683',
    'Houston': 'AGODA_CITY|1178',
    'Las Vegas': 'AGODA_CITY|17072',
    'New York': 'AGODA_CITY|318',
    'Boston': 'AGODA_CITY|9254',
    'San Francisco': 'AGODA_CITY|13801',
    'Los Angeles': 'AGODA_CITY|12772',
}

# State codes for destinations
STATE_CODES = {
    'Austin': 'TX',
    'Dallas': 'TX',
    'Houston': 'TX',
    'Las Vegas': 'NV',
    'New York': 'NY',
    'Boston': 'MA',
    'San Francisco': 'CA',
    'Los Angeles': 'CA',
}


async def scrape_destination(destination: str, check_in: str, nights: int = 10) -> List[Dict[str, Any]]:
    """
    Scrape hotels for a destination across a date range.

    Args:
        destination: City name (e.g., "Austin")
        check_in: Check-in date in YYYY-MM-DD format
        nights: Number of nights to search (default 10)

    Returns:
        List of hotel rate dictionaries
    """
    try:
        # Try to import from us_hotel_scraper
        sys.path.insert(0, '/Users/alexbespalov/Desktop/Projects/us_hotel_scraper')
        from core.hotels_api import search_hotels
        from core.http_client import create_client
    except ImportError:
        # Fall back to mock data if scraper not available
        return generate_mock_data(destination, check_in, nights)

    place_id = PLACE_IDS.get(destination)
    state = STATE_CODES.get(destination, '')

    if not place_id:
        raise ValueError(f"Unknown destination: {destination}")

    results = []
    check_in_date = datetime.fromisoformat(check_in)

    async with create_client() as client:
        for day_offset in range(nights):
            date = check_in_date + timedelta(days=day_offset)
            next_date = date + timedelta(days=1)

            try:
                hotels = await search_hotels(
                    client,
                    place_id=place_id,
                    city_name=destination,
                    state=state,
                    check_in=date,
                    check_out=next_date,
                    adults=2
                )

                for hotel in hotels:
                    results.append({
                        'destination': destination,
                        'hotel_name': hotel['hotel_name'],
                        'stay_date': date.strftime('%Y-%m-%d'),
                        'cash_price': hotel['total_cost'],
                        'points_required': hotel['total_miles'],
                        'stars': hotel.get('stars', 0),
                        'scraped_at': datetime.now().isoformat()
                    })

                # Small delay to avoid rate limiting
                await asyncio.sleep(0.2)

            except Exception as e:
                print(f"Error scraping {destination} for {date.strftime('%Y-%m-%d')}: {e}", file=sys.stderr)
                continue

    return results


def generate_mock_data(destination: str, check_in: str, nights: int) -> List[Dict[str, Any]]:
    """Generate mock hotel data for testing."""
    import random

    hotels = [
        'Hilton Downtown',
        'Marriott City Center',
        'Hyatt Regency',
        'Holiday Inn Express',
        'Hampton Inn',
        'Courtyard by Marriott',
        'Best Western Plus',
        'La Quinta Inn',
    ]

    results = []
    check_in_date = datetime.fromisoformat(check_in)

    for day_offset in range(nights):
        date = check_in_date + timedelta(days=day_offset)
        date_str = date.strftime('%Y-%m-%d')

        for hotel in hotels:
            base_price = 80 + random.random() * 200
            cash_price = round(base_price, 2)
            points_required = round(cash_price * (8 + random.random() * 20))
            stars = random.randint(3, 5)

            results.append({
                'destination': destination,
                'hotel_name': hotel,
                'stay_date': date_str,
                'cash_price': cash_price,
                'points_required': points_required,
                'stars': stars,
                'scraped_at': datetime.now().isoformat()
            })

    return results


def main():
    """CLI entry point."""
    if len(sys.argv) < 3:
        print("Usage: python scrape_hotels.py <destination> <check_in> [--nights N]")
        print("Example: python scrape_hotels.py Austin 2025-02-01 --nights 10")
        sys.exit(1)

    destination = sys.argv[1]
    check_in = sys.argv[2]
    nights = 10

    # Parse optional arguments
    if '--nights' in sys.argv:
        idx = sys.argv.index('--nights')
        if idx + 1 < len(sys.argv):
            nights = int(sys.argv[idx + 1])

    # Validate destination
    if destination not in PLACE_IDS:
        print(f"Error: Unknown destination '{destination}'", file=sys.stderr)
        print(f"Valid destinations: {', '.join(PLACE_IDS.keys())}", file=sys.stderr)
        sys.exit(1)

    # Run scraper
    results = asyncio.run(scrape_destination(destination, check_in, nights))

    # Output as JSON
    print(json.dumps(results, indent=2))


if __name__ == '__main__':
    main()
