import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { findOptimalStreaks } from '@/lib/optimizer'
import { findAnomalies, calculateHistoricalAverages } from '@/lib/anomaly'
import { HotelRate, SearchMode } from '@/lib/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get job status
    const { data: job, error: jobError } = await supabase
      .from('scrape_jobs')
      .select('*')
      .eq('id', id)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // If still running, return progress
    if (job.status === 'running' || job.status === 'pending') {
      return NextResponse.json({
        jobId: id,
        status: job.status,
        progress: job.status === 'pending' ? 0 : 50,
        results: null,
      })
    }

    // If failed, return error
    if (job.status === 'failed') {
      return NextResponse.json({
        jobId: id,
        status: 'failed',
        progress: 0,
        error: job.error_message ?? 'Unknown error',
      })
    }

    // Get rates for this job (by destination and date range)
    const checkInDate = new Date(job.check_in_date)
    const checkOutDate = new Date(checkInDate)
    checkOutDate.setDate(checkOutDate.getDate() + 10)

    const { data: rates, error: ratesError } = await supabase
      .from('hotel_rates')
      .select('*')
      .eq('destination', job.destination)
      .gte('stay_date', job.check_in_date)
      .lt('stay_date', checkOutDate.toISOString().split('T')[0])
      .order('stay_date', { ascending: true })

    if (ratesError) {
      console.error('Failed to fetch rates:', ratesError)
      return NextResponse.json({
        jobId: id,
        status: 'partial',
        progress: 100,
        error: 'Failed to fetch hotel rates',
      })
    }

    const hotelRates: HotelRate[] = rates ?? []
    const mode = (job.mode as SearchMode) ?? 'optimal'

    // Calculate results based on mode
    let results
    if (mode === 'optimal') {
      const streaks = findOptimalStreaks(hotelRates, job.check_in_date)
      results = { mode, streaks }
    } else {
      const historicalData = calculateHistoricalAverages(hotelRates)
      const anomalies = findAnomalies(hotelRates, job.check_in_date, historicalData)
      results = { mode, anomalies }
    }

    return NextResponse.json({
      jobId: id,
      status: job.status,
      progress: 100,
      results,
    })
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
