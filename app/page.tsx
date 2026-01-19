'use client'

import { useState } from 'react'
import { SearchMode, StreakResult, AnomalyResult, ScrapeResponse } from '@/lib/types'
import ConfigPanel from '@/components/ConfigPanel'
import ScrapeProgress from '@/components/ScrapeProgress'
import ResultsPanel from '@/components/ResultsPanel'

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search state
  const [currentMode, setCurrentMode] = useState<SearchMode>('optimal')
  const [currentCheckIn, setCurrentCheckIn] = useState('')
  const [currentDestination, setCurrentDestination] = useState('')

  // Progress state
  const [progress, setProgress] = useState(0)
  const [hotelsFound, setHotelsFound] = useState(0)

  // Results state
  const [streaks, setStreaks] = useState<StreakResult[]>([])
  const [anomalies, setAnomalies] = useState<AnomalyResult[]>([])

  const handleSubmit = async (destination: string, checkIn: string, mode: SearchMode) => {
    setIsLoading(true)
    setError(null)
    setProgress(10)
    setHotelsFound(0)
    setStreaks([])
    setAnomalies([])
    setCurrentMode(mode)
    setCurrentCheckIn(checkIn)
    setCurrentDestination(destination)

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination, checkIn, mode }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? 'Failed to start search')
      }

      const data: ScrapeResponse = await response.json()

      setProgress(100)
      setHotelsFound(data.results?.streaks?.reduce((sum, s) => sum + s.nights.length, 0) ?? 0)

      if (data.results) {
        if (data.results.mode === 'optimal' && data.results.streaks) {
          setStreaks(data.results.streaks)
        } else if (data.results.mode === 'anomaly' && data.results.anomalies) {
          setAnomalies(data.results.anomalies)
        }
      }

      if (data.error) {
        setError(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          AA Hotel Streak Optimizer
        </h1>
        <p className="mt-2 text-gray-600">
          Find the best points-per-dollar hotel sequences for your trip
        </p>
      </header>

      {/* Config Panel */}
      <div className="mb-6">
        <ConfigPanel onSubmit={handleSubmit} isLoading={isLoading} />
      </div>

      {/* Progress (when loading) */}
      {isLoading && (
        <div className="mb-6">
          <ScrapeProgress
            destination={currentDestination}
            progress={progress}
            hotelsFound={hotelsFound}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Error</span>
          </div>
          <p className="mt-1 text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {!isLoading && (streaks.length > 0 || anomalies.length > 0 || (!error && currentCheckIn)) && (
        <ResultsPanel
          mode={currentMode}
          checkIn={currentCheckIn}
          streaks={streaks}
          anomalies={anomalies}
        />
      )}

      {/* Empty state */}
      {!isLoading && !error && streaks.length === 0 && anomalies.length === 0 && !currentCheckIn && (
        <div className="text-center py-16 bg-white rounded-lg border">
          <div className="text-5xl mb-4">✈️</div>
          <h2 className="text-xl font-medium text-gray-900 mb-2">
            Find Your Best Hotel Deals
          </h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Enter a destination and check-in date above to discover optimal hotel sequences
            that maximize your AAdvantage points per dollar.
          </p>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 pt-8 border-t text-center text-sm text-gray-500">
        <p>
          Data sourced from AA AAdvantage Hotels. Rates may change.
        </p>
      </footer>
    </main>
  )
}
