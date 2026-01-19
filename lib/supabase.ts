import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { HotelRate, CITY_STATE_MAP } from './types'

// Lazy-load to avoid build-time errors when env vars not set
let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables not configured')
  }

  _supabase = createClient(supabaseUrl, supabaseAnonKey)
  return _supabase
}

// For backwards compatibility
export const supabase = {
  from: (table: string) => getSupabase().from(table),
}

// Server-side client with service role for writes
export function createServerClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    // Return a mock client that does nothing (for local dev without Supabase)
    console.warn('Supabase not configured, using mock client')
    return {
      from: () => ({
        select: () => ({ data: [], error: null }),
        insert: () => ({ data: [], error: null, select: () => ({ single: () => ({ data: null, error: null }) }) }),
        update: () => ({ eq: () => ({ data: null, error: null }) }),
        upsert: () => ({ data: [], error: null }),
        eq: () => ({ single: () => ({ data: null, error: null }) }),
      }),
    } as unknown as SupabaseClient
  }

  return createClient(supabaseUrl, serviceKey)
}

// Raw deal from database
interface RawDeal {
  id: number
  hotel_name: string
  city_name: string
  state: string
  check_in: string
  check_out: string
  nights: number
  nightly_rate: number
  total_cost: number
  total_miles: number
  yield_ratio: number
  stars: string | number | null
  scraped_at: string
}

/**
 * Fetch hotel deals from us_hotel_deals table and transform to HotelRate format.
 * Multi-night deals are expanded into individual night records.
 */
export async function fetchHotelDeals(
  cityName: string,
  checkIn: Date,
  nightsRange: number = 10
): Promise<HotelRate[]> {
  const supabase = createServerClient()

  // Calculate date range
  const checkInStr = checkIn.toISOString().split('T')[0]
  const checkOutDate = new Date(checkIn)
  checkOutDate.setDate(checkOutDate.getDate() + nightsRange)
  const checkOutStr = checkOutDate.toISOString().split('T')[0]

  // Query with RPC for join (Supabase JS doesn't support joins directly)
  // Use raw SQL query via rpc
  const { data, error } = await supabase.rpc('get_hotel_deals_for_city', {
    p_city_name: cityName,
    p_check_in_start: checkInStr,
    p_check_in_end: checkOutStr
  })

  if (error) {
    console.error('Error fetching hotel deals via RPC:', error)
    // Fall back to direct table query with manual join simulation
    return fetchHotelDealsFallback(cityName, checkInStr, checkOutStr)
  }

  if (!data || data.length === 0) {
    console.log(`No hotel deals found for ${cityName} from ${checkInStr} to ${checkOutStr}`)
    return []
  }

  return expandDealsToNights(data as RawDeal[], cityName)
}

/**
 * Fallback: Query tables separately and join in memory
 */
async function fetchHotelDealsFallback(
  cityName: string,
  checkInStart: string,
  checkInEnd: string
): Promise<HotelRate[]> {
  const supabase = createServerClient()

  // First get city ID
  const { data: cities } = await supabase
    .from('us_hotel_cities')
    .select('id, city_name, state')
    .ilike('city_name', cityName)
    .limit(1)

  if (!cities || cities.length === 0) {
    console.log(`City not found: ${cityName}`)
    return []
  }

  const city = cities[0]

  // Get hotels in this city
  const { data: hotels } = await supabase
    .from('us_hotels')
    .select('id, hotel_name, stars')
    .eq('city_id', city.id)

  if (!hotels || hotels.length === 0) {
    console.log(`No hotels found for city: ${cityName}`)
    return []
  }

  const hotelIds = hotels.map(h => h.id)
  const hotelMap = new Map(hotels.map(h => [h.id, h]))

  // Get deals for these hotels in date range
  const { data: deals, error } = await supabase
    .from('us_hotel_deals')
    .select('*')
    .in('hotel_id', hotelIds)
    .gte('check_in', checkInStart)
    .lt('check_in', checkInEnd)
    .order('check_in', { ascending: true })

  if (error) {
    console.error('Error fetching deals:', error)
    return []
  }

  if (!deals || deals.length === 0) {
    console.log(`No deals found for ${cityName} in date range`)
    return []
  }

  // Transform to RawDeal format with joins
  const rawDeals: RawDeal[] = deals.map(d => {
    const hotel = hotelMap.get(d.hotel_id)
    return {
      id: d.id,
      hotel_name: hotel?.hotel_name || 'Unknown Hotel',
      city_name: city.city_name,
      state: city.state,
      check_in: d.check_in,
      check_out: d.check_out,
      nights: d.nights,
      nightly_rate: d.nightly_rate,
      total_cost: d.total_cost,
      total_miles: d.total_miles,
      yield_ratio: d.yield_ratio,
      stars: hotel?.stars,
      scraped_at: d.scraped_at
    }
  })

  return expandDealsToNights(rawDeals, cityName)
}

/**
 * Expand multi-night deals into individual night records.
 * For a 3-night deal, creates 3 HotelRate records (one per night).
 */
function expandDealsToNights(deals: RawDeal[], cityName: string): HotelRate[] {
  const rates: HotelRate[] = []
  const state = CITY_STATE_MAP[cityName] || ''
  const destination = state ? `${cityName}, ${state}` : cityName

  for (const deal of deals) {
    const nights = deal.nights || 1
    const pointsPerNight = Math.round(deal.total_miles / nights)
    const stars = parseFloat(String(deal.stars || 3))

    // For each night in the deal, create a HotelRate
    for (let i = 0; i < nights; i++) {
      const stayDate = new Date(deal.check_in)
      stayDate.setDate(stayDate.getDate() + i)
      const stayDateStr = stayDate.toISOString().split('T')[0]

      const ptsPerDollar = deal.nightly_rate > 0
        ? Math.round((pointsPerNight / deal.nightly_rate) * 100) / 100
        : 0

      rates.push({
        id: `${deal.id}-${i}`,
        destination,
        hotel_name: deal.hotel_name,
        stay_date: stayDateStr,
        cash_price: deal.nightly_rate,
        points_required: pointsPerNight,
        pts_per_dollar: ptsPerDollar,
        stars: stars,
        scraped_at: deal.scraped_at
      })
    }
  }

  return rates
}
