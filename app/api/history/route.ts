import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { HistoricalAvg } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const destination = searchParams.get('destination')
    const hotelName = searchParams.get('hotelName')

    if (!destination) {
      return NextResponse.json(
        { error: 'destination parameter is required' },
        { status: 400 }
      )
    }

    // Calculate 90-day cutoff
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 90)

    // Build query
    let query = supabase
      .from('hotel_rates')
      .select('hotel_name, stay_date, pts_per_dollar')
      .eq('destination', destination)
      .gte('scraped_at', cutoffDate.toISOString())

    if (hotelName) {
      query = query.eq('hotel_name', hotelName)
    }

    const { data: rates, error } = await query

    if (error) {
      console.error('Failed to fetch historical data:', error)
      return NextResponse.json(
        { error: 'Failed to fetch historical data' },
        { status: 500 }
      )
    }

    // Calculate averages by hotel + day of week
    const aggregates = new Map<string, { sum: number; count: number }>()

    for (const rate of rates ?? []) {
      const dayOfWeek = new Date(rate.stay_date).getDay()
      const key = `${rate.hotel_name}|${dayOfWeek}`

      if (!aggregates.has(key)) {
        aggregates.set(key, { sum: 0, count: 0 })
      }

      const agg = aggregates.get(key)!
      agg.sum += rate.pts_per_dollar
      agg.count += 1
    }

    // Convert to response format
    const averages: HistoricalAvg[] = []
    for (const [key, agg] of aggregates) {
      const [hotel, dow] = key.split('|')
      averages.push({
        hotel_name: hotel,
        day_of_week: parseInt(dow),
        avg_pts_per_dollar: Math.round((agg.sum / agg.count) * 100) / 100,
        observation_count: agg.count,
      })
    }

    return NextResponse.json({ averages })
  } catch (error) {
    console.error('Error in history API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
