'use client'

import { SearchMode, StreakResult, AnomalyResult } from '@/lib/types'
import DurationTabs from './DurationTabs'
import AnomalyList from './AnomalyList'

interface ResultsPanelProps {
  mode: SearchMode
  checkIn: string
  streaks?: StreakResult[]
  anomalies?: AnomalyResult[]
}

export default function ResultsPanel({
  mode,
  checkIn,
  streaks = [],
  anomalies = [],
}: ResultsPanelProps) {
  if (mode === 'optimal') {
    if (streaks.length === 0) {
      return (
        <div className="text-center py-12 bg-white rounded-lg border">
          <div className="text-4xl mb-4">🏨</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Yet</h3>
          <p className="text-gray-500">
            Enter a destination and date above to find optimal hotel sequences.
          </p>
        </div>
      )
    }

    return <DurationTabs results={streaks} checkIn={checkIn} />
  }

  // Anomaly mode
  return <AnomalyList anomalies={anomalies} />
}
