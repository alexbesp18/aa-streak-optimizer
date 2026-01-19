'use client'

import { AnomalyResult } from '@/lib/types'
import StreakCard from './StreakCard'

interface AnomalyListProps {
  anomalies: AnomalyResult[]
}

export default function AnomalyList({ anomalies }: AnomalyListProps) {
  if (anomalies.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border">
        <div className="text-4xl mb-4">🔍</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Anomalies Found</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          No hotels are currently offering rates ≥50% above their historical average.
          Try a different destination or check back later.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Found {anomalies.length} anomal{anomalies.length === 1 ? 'y' : 'ies'} — stays with pts/$ ≥50% above historical average
      </p>

      {anomalies.map((anomaly, idx) => (
        <StreakCard
          key={`${anomaly.hotel_name}-${anomaly.duration}`}
          title={anomaly.hotel_name}
          subtitle={`${anomaly.duration} nights • ${anomaly.check_in} to ${anomaly.check_out}`}
          nights={anomaly.nights}
          totalPoints={anomaly.total_points}
          totalCost={anomaly.total_cost}
          avgPtsPerDollar={anomaly.pts_per_dollar}
          pctAbove={anomaly.pct_above}
          historicalAvg={anomaly.historical_avg}
          isNew={idx < 3} // Animate first 3
        />
      ))}
    </div>
  )
}
