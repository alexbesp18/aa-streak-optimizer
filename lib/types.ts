// Database types
export interface HotelRate {
  id: string
  destination: string
  hotel_name: string
  stay_date: string // YYYY-MM-DD
  cash_price: number
  points_required: number
  pts_per_dollar: number
  stars: number
  scraped_at: string
}

export interface ScrapeJob {
  id: string
  destination: string
  check_in_date: string
  status: 'pending' | 'running' | 'completed' | 'partial' | 'failed'
  hotels_found: number
  error_message?: string
  created_at: string
  completed_at?: string
}

// Search mode
export type SearchMode = 'optimal' | 'anomaly'

// Night selection for a streak
export interface NightSelection {
  date: string // YYYY-MM-DD
  hotel_name: string
  cash_price: number
  points_required: number
  pts_per_dollar: number
  stars: number
}

// Mode 1: Optimal streak result (one per duration)
export interface StreakResult {
  duration: number // 1-10 nights
  nights: NightSelection[]
  total_points: number
  total_cost: number
  avg_pts_per_dollar: number
}

// Mode 2: Anomaly detection result
export interface AnomalyResult {
  hotel_name: string
  destination: string
  duration: number // 4-7 nights
  check_in: string
  check_out: string
  nights: NightSelection[]
  total_points: number
  total_cost: number
  pts_per_dollar: number
  historical_avg: number
  pct_above: number // Percentage above historical average
}

// Historical average for anomaly detection
export interface HistoricalAvg {
  hotel_name: string
  day_of_week: number // 0-6 (Sun-Sat)
  avg_pts_per_dollar: number
  observation_count: number
}

// API request/response types
export interface ScrapeRequest {
  destination: string
  checkIn: string // YYYY-MM-DD
  mode: SearchMode
}

export interface ScrapeResponse {
  jobId: string
  status: 'running' | 'completed' | 'partial' | 'failed'
  progress: number // 0-100
  results?: {
    mode: SearchMode
    streaks?: StreakResult[] // Mode 1
    anomalies?: AnomalyResult[] // Mode 2
  }
  error?: string
}

// Destination options
export const DESTINATIONS = [
  { name: 'Austin', state: 'TX', placeId: 'AGODA_CITY|4542' },
  { name: 'Dallas', state: 'TX', placeId: 'AGODA_CITY|8683' },
  { name: 'Houston', state: 'TX', placeId: 'AGODA_CITY|1178' },
  { name: 'Las Vegas', state: 'NV', placeId: 'AGODA_CITY|17072' },
  { name: 'New York', state: 'NY', placeId: 'AGODA_CITY|318' },
  { name: 'Boston', state: 'MA', placeId: 'AGODA_CITY|9254' },
  { name: 'San Francisco', state: 'CA', placeId: 'AGODA_CITY|13801' },
  { name: 'Los Angeles', state: 'CA', placeId: 'AGODA_CITY|12772' },
] as const

export type DestinationName = typeof DESTINATIONS[number]['name']

// Helper to get state from city name
export const CITY_STATE_MAP: Record<string, string> = Object.fromEntries(
  DESTINATIONS.map(d => [d.name, d.state])
)
