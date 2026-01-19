import { HotelRate, NightSelection, StreakResult } from './types'

/**
 * Add days to a date string (YYYY-MM-DD)
 */
function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

/**
 * Check if two date strings are the same day
 */
function isSameDay(date1: string, date2: string): boolean {
  return date1.split('T')[0] === date2.split('T')[0]
}

/**
 * Find the best hotel for a specific night based on pts/$
 */
function findBestForNight(rates: HotelRate[], targetDate: string): NightSelection | null {
  const matchingRates = rates.filter(r => isSameDay(r.stay_date, targetDate))

  if (matchingRates.length === 0) return null

  // Sort by pts_per_dollar descending
  const sorted = matchingRates.sort((a, b) => b.pts_per_dollar - a.pts_per_dollar)
  const best = sorted[0]

  return {
    date: targetDate,
    hotel_name: best.hotel_name,
    cash_price: best.cash_price,
    points_required: best.points_required,
    pts_per_dollar: best.pts_per_dollar,
    stars: best.stars,
  }
}

/**
 * Mode 1: Find optimal streaks for durations 1-10 nights.
 * Each night can be a different hotel - picks best pts/$ per night.
 */
export function findOptimalStreaks(rates: HotelRate[], checkIn: string): StreakResult[] {
  const results: StreakResult[] = []

  for (let duration = 1; duration <= 10; duration++) {
    const nights: NightSelection[] = []
    let totalPoints = 0
    let totalCost = 0

    for (let i = 0; i < duration; i++) {
      const targetDate = addDays(checkIn, i)
      const best = findBestForNight(rates, targetDate)

      if (best) {
        nights.push(best)
        totalPoints += best.points_required
        totalCost += best.cash_price
      }
    }

    // Only include if we found hotels for all nights
    if (nights.length === duration) {
      results.push({
        duration,
        nights,
        total_points: totalPoints,
        total_cost: totalCost,
        avg_pts_per_dollar: totalCost > 0
          ? Math.round((totalPoints / totalCost) * 100) / 100
          : 0,
      })
    }
  }

  return results
}

/**
 * Get unique hotels from rates (for displaying options)
 */
export function getUniqueHotels(rates: HotelRate[]): string[] {
  return [...new Set(rates.map(r => r.hotel_name))].sort()
}

/**
 * Group rates by date for display
 */
export function groupRatesByDate(rates: HotelRate[]): Map<string, HotelRate[]> {
  const grouped = new Map<string, HotelRate[]>()

  for (const rate of rates) {
    const date = rate.stay_date.split('T')[0]
    if (!grouped.has(date)) {
      grouped.set(date, [])
    }
    grouped.get(date)!.push(rate)
  }

  // Sort each day's rates by pts_per_dollar
  for (const [date, dayRates] of grouped) {
    grouped.set(date, dayRates.sort((a, b) => b.pts_per_dollar - a.pts_per_dollar))
  }

  return grouped
}
