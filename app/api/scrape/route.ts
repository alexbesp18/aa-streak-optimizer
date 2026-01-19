import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, fetchHotelDeals } from '@/lib/supabase'
import { DESTINATIONS, ScrapeRequest, HotelRate } from '@/lib/types'
import { findOptimalStreaks } from '@/lib/optimizer'
import { findAnomalies, calculateHistoricalAverages } from '@/lib/anomaly'

// Mock hotel data for development (replace with actual scraper)
function generateMockHotelData(destination: string, checkIn: string): HotelRate[] {
  const hotels = [
    'Hilton Downtown',
    'Marriott City Center',
    'Hyatt Regency',
    'Holiday Inn Express',
    'Hampton Inn',
    'Courtyard by Marriott',
    'Best Western Plus',
    'La Quinta Inn',
  ]

  const rates: HotelRate[] = []
  const startDate = new Date(checkIn)

  for (let dayOffset = 0; dayOffset < 10; dayOffset++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + dayOffset)
    const dateStr = date.toISOString().split('T')[0]

    for (const hotel of hotels) {
      // Generate somewhat realistic random data
      const basePrice = 80 + Math.random() * 200
      const cashPrice = Math.round(basePrice * 100) / 100
      const pointsRequired = Math.round(cashPrice * (8 + Math.random() * 20))
      const stars = Math.floor(Math.random() * 3) + 3 // 3-5 stars

      rates.push({
        id: `${destination}-${hotel}-${dateStr}`,
        destination,
        hotel_name: hotel,
        stay_date: dateStr,
        cash_price: cashPrice,
        points_required: pointsRequired,
        pts_per_dollar: Math.round((pointsRequired / cashPrice) * 100) / 100,
        stars,
        scraped_at: new Date().toISOString(),
      })
    }
  }

  return rates
}

export async function POST(request: NextRequest) {
  try {
    const body: ScrapeRequest = await request.json()
    const { destination, checkIn, mode } = body

    // Validate destination
    const dest = DESTINATIONS.find(d => d.name === destination)
    if (!dest) {
      return NextResponse.json(
        { error: 'Invalid destination' },
        { status: 400 }
      )
    }

    // Validate check-in date
    const checkInDate = new Date(checkIn)
    if (isNaN(checkInDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid check-in date' },
        { status: 400 }
      )
    }

    // Create job in database
    const supabase = createServerClient()
    const { data: job, error: jobError } = await supabase
      .from('scrape_jobs')
      .insert({
        destination,
        check_in_date: checkIn,
        mode,
        status: 'running',
      })
      .select()
      .single()

    if (jobError) {
      console.error('Failed to create job:', jobError)
      // Continue without database - use mock data
    }

    // Try to fetch real data from us_hotel_deals table
    let rates = await fetchHotelDeals(destination, checkInDate, 10)
    const usingRealData = rates.length > 0

    if (!usingRealData) {
      // Fall back to mock data if no real data available
      console.log(`No real data for ${destination}, using mock data`)
      rates = generateMockHotelData(`${destination}, ${dest.state}`, checkIn)
    } else {
      console.log(`Found ${rates.length} real hotel rates for ${destination}`)
    }

    // Store rates in database
    if (job) {
      const { error: ratesError } = await supabase
        .from('hotel_rates')
        .upsert(
          rates.map(r => ({
            destination: r.destination,
            hotel_name: r.hotel_name,
            stay_date: r.stay_date,
            cash_price: r.cash_price,
            points_required: r.points_required,
            stars: r.stars,
            scraped_at: r.scraped_at,
          })),
          { onConflict: 'destination,hotel_name,stay_date,scraped_at' }
        )

      if (ratesError) {
        console.error('Failed to store rates:', ratesError)
      }
    }

    // Calculate results based on mode
    let results
    if (mode === 'optimal') {
      const streaks = findOptimalStreaks(rates, checkIn)
      results = { mode, streaks }
    } else {
      // For anomaly mode, we need historical data
      // In production, this would query the database
      const historicalData = calculateHistoricalAverages(rates)
      const anomalies = findAnomalies(rates, checkIn, historicalData)
      results = { mode, anomalies }
    }

    // Update job status
    if (job) {
      await supabase
        .from('scrape_jobs')
        .update({
          status: 'completed',
          hotels_found: rates.length,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id)
    }

    return NextResponse.json({
      jobId: job?.id ?? 'mock',
      status: 'completed',
      progress: 100,
      results,
      dataSource: usingRealData ? 'real' : 'mock',
    })
  } catch (error) {
    console.error('Scrape error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
