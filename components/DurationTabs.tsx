'use client'

import { useState } from 'react'
import { StreakResult } from '@/lib/types'
import StreakCard from './StreakCard'

interface DurationTabsProps {
  results: StreakResult[]
  checkIn: string
}

export default function DurationTabs({ results, checkIn }: DurationTabsProps) {
  const [selectedDuration, setSelectedDuration] = useState(1)

  const selectedResult = results.find(r => r.duration === selectedDuration)

  // Format check-in for display
  const formatDateRange = (duration: number) => {
    const start = new Date(checkIn)
    const end = new Date(checkIn)
    end.setDate(end.getDate() + duration)

    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', opts)}`
  }

  return (
    <div>
      {/* Duration tabs - horizontal scroll on mobile */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((duration) => {
          const hasData = results.some(r => r.duration === duration)
          return (
            <button
              key={duration}
              onClick={() => setSelectedDuration(duration)}
              disabled={!hasData}
              className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedDuration === duration
                  ? 'bg-aa-red text-white'
                  : hasData
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gray-50 text-gray-300 cursor-not-allowed'
              }`}
            >
              {duration}N
            </button>
          )
        })}
      </div>

      {/* Selected result */}
      {selectedResult ? (
        <StreakCard
          title={`Best ${selectedResult.duration}-Night Sequence`}
          subtitle={formatDateRange(selectedResult.duration)}
          nights={selectedResult.nights}
          totalPoints={selectedResult.total_points}
          totalCost={selectedResult.total_cost}
          avgPtsPerDollar={selectedResult.avg_pts_per_dollar}
        />
      ) : (
        <div className="text-center py-8 text-gray-500">
          No data available for {selectedDuration}-night stays
        </div>
      )}

      {/* Summary of all durations */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">All Durations Summary</h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
          {results.map((r) => (
            <button
              key={r.duration}
              onClick={() => setSelectedDuration(r.duration)}
              className={`p-2 rounded text-center transition-colors ${
                selectedDuration === r.duration
                  ? 'bg-aa-red text-white'
                  : 'bg-white hover:bg-gray-100'
              }`}
            >
              <div className="font-medium">{r.duration}N</div>
              <div className={selectedDuration === r.duration ? 'text-white/80' : 'text-gray-500'}>
                {r.avg_pts_per_dollar.toFixed(1)} pts/$
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
