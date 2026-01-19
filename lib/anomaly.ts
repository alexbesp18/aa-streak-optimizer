import { HotelRate, NightSelection, AnomalyResult, HistoricalAvg } from './types'

/**
 * Add days to a date string (YYYY-MM-DD)
 */
function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

/**
 * Get day of week (0-6, Sunday = 0)
 */
function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr).getDay()
}

/**
 * Check if two date strings are the same day
 */
function isSameDay(date1: string, date2: string): boolean {
  return date1.split('T')[0] === date2.split('T')[0]
}

/**
 * Get historical average for a hotel on a specific day of week
 */
function getHistoricalAverage(
  historicalData: HistoricalAvg[],
  hotelName: string,
  dayOfWeek: number
): number | null {
  const match = historicalData.find(
    h => h.hotel_name === hotelName && h.day_of_week === dayOfWeek
  )
  return match?.avg_pts_per_dollar ?? null
}

/**
 * Build all possible same-hotel streaks for a given duration
 */
function buildSameHotelStreaks(
  rates: HotelRate[],
  checkIn: string,
  duration: number
): Map<string, NightSelection[]> {
  const streaks = new Map<string, NightSelection[]>()

  // Group rates by hotel
  const hotelRates = new Map<string, HotelRate[]>()
  for (const rate of rates) {
    if (!hotelRates.has(rate.hotel_name)) {
      hotelRates.set(rate.hotel_name, [])
    }
    hotelRates.get(rate.hotel_name)!.push(rate)
  }

  // For each hotel, try to build a streak
  for (const [hotelName, hotelData] of hotelRates) {
    const nights: NightSelection[] = []

    for (let i = 0; i < duration; i++) {
      const targetDate = addDays(checkIn, i)
      const match = hotelData.find(r => isSameDay(r.stay_date, targetDate))

      if (match) {
        nights.push({
          date: targetDate,
          hotel_name: match.hotel_name,
          cash_price: match.cash_price,
          points_required: match.points_required,
          pts_per_dollar: match.pts_per_dollar,
          stars: match.stars,
        })
      }
    }

    // Only include if we have all nights
    if (nights.length === duration) {
      streaks.set(hotelName, nights)
    }
  }

  return streaks
}

/**
 * Mode 2: Find anomalies - streaks where pts/$ is ≥50% above historical average.
 * Only checks 4-7 night durations.
 * Only considers same-hotel streaks for anomaly detection.
 */
export function findAnomalies(
  rates: HotelRate[],
  checkIn: string,
  historicalData: HistoricalAvg[]
): AnomalyResult[] {
  const anomalies: AnomalyResult[] = []
  const ANOMALY_THRESHOLD = 1.5 // 50% above average
  const DURATIONS = [4, 5, 6, 7]

  for (const duration of DURATIONS) {
    const streaks = buildSameHotelStreaks(rates, checkIn, duration)

    for (const [hotelName, nights] of streaks) {
      // Calculate total pts/$
      const totalPoints = nights.reduce((sum, n) => sum + n.points_required, 0)
      const totalCost = nights.reduce((sum, n) => sum + n.cash_price, 0)
      const ptsPerDollar = totalCost > 0 ? totalPoints / totalCost : 0

      // Get historical average for this hotel (using check-in day of week)
      const dayOfWeek = getDayOfWeek(checkIn)
      const historicalAvg = getHistoricalAverage(historicalData, hotelName, dayOfWeek)

      // Skip if no historical data
      if (historicalAvg === null || historicalAvg === 0) continue

      const threshold = historicalAvg * ANOMALY_THRESHOLD

      if (ptsPerDollar >= threshold) {
        const pctAbove = ((ptsPerDollar - historicalAvg) / historicalAvg) * 100

        anomalies.push({
          hotel_name: hotelName,
          destination: rates[0]?.destination ?? '',
          duration,
          check_in: checkIn,
          check_out: addDays(checkIn, duration),
          nights,
          total_points: totalPoints,
          total_cost: totalCost,
          pts_per_dollar: Math.round(ptsPerDollar * 100) / 100,
          historical_avg: Math.round(historicalAvg * 100) / 100,
          pct_above: Math.round(pctAbove),
        })
      }
    }
  }

  // Sort by percentage above average (descending)
  return anomalies.sort((a, b) => b.pct_above - a.pct_above)
}

/**
 * Calculate 90-day historical averages from rate data
 * This would typically be called with data from the database
 */
export function calculateHistoricalAverages(rates: HotelRate[]): HistoricalAvg[] {
  const averages: Map<string, { sum: number; count: number }> = new Map()

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 90)

  for (const rate of rates) {
    const scrapedAt = new Date(rate.scraped_at)
    if (scrapedAt < cutoffDate) continue

    const dayOfWeek = getDayOfWeek(rate.stay_date)
    const key = `${rate.hotel_name}|${dayOfWeek}`

    if (!averages.has(key)) {
      averages.set(key, { sum: 0, count: 0 })
    }

    const data = averages.get(key)!
    data.sum += rate.pts_per_dollar
    data.count += 1
  }

  const results: HistoricalAvg[] = []

  for (const [key, data] of averages) {
    const [hotelName, dow] = key.split('|')
    results.push({
      hotel_name: hotelName,
      day_of_week: parseInt(dow),
      avg_pts_per_dollar: Math.round((data.sum / data.count) * 100) / 100,
      observation_count: data.count,
    })
  }

  return results
}
