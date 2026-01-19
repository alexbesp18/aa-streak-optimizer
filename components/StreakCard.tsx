'use client'

import { useState } from 'react'
import { NightSelection } from '@/lib/types'

interface StreakCardProps {
  title: string
  subtitle?: string
  nights: NightSelection[]
  totalPoints: number
  totalCost: number
  avgPtsPerDollar: number
  pctAbove?: number // For anomaly mode
  historicalAvg?: number // For anomaly mode
  isNew?: boolean // For animation
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatPoints(points: number): string {
  return new Intl.NumberFormat('en-US').format(points)
}

export default function StreakCard({
  title,
  subtitle,
  nights,
  totalPoints,
  totalCost,
  avgPtsPerDollar,
  pctAbove,
  historicalAvg,
  isNew = false,
}: StreakCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border overflow-hidden ${
        isNew ? 'animate-fade-slide-in' : ''
      }`}
    >
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-500 truncate">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Anomaly badge */}
            {pctAbove !== undefined && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                +{pctAbove}% above avg
              </span>
            )}

            {/* Pts/$ display */}
            <div className="text-right">
              <div className="text-lg font-bold text-aa-red">
                {avgPtsPerDollar.toFixed(1)} pts/$
              </div>
              <div className="text-xs text-gray-500">
                {formatPoints(totalPoints)} pts / {formatCurrency(totalCost)}
              </div>
            </div>

            {/* Expand icon */}
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Expanded content - per-night breakdown */}
      {isExpanded && (
        <div className="border-t px-4 pb-4">
          {/* Historical comparison for anomaly mode */}
          {historicalAvg !== undefined && (
            <div className="py-3 text-sm text-gray-600 border-b">
              Historical average: <span className="font-medium">{historicalAvg.toFixed(1)} pts/$</span>
            </div>
          )}

          {/* Per-night table */}
          <table className="w-full mt-3 text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Hotel</th>
                <th className="pb-2 font-medium text-right">Price</th>
                <th className="pb-2 font-medium text-right">Points</th>
                <th className="pb-2 font-medium text-right">Pts/$</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {nights.map((night, idx) => (
                <tr key={idx}>
                  <td className="py-2 text-gray-600">{formatDate(night.date)}</td>
                  <td className="py-2 text-gray-900 truncate max-w-[150px]">{night.hotel_name}</td>
                  <td className="py-2 text-gray-600 text-right">{formatCurrency(night.cash_price)}</td>
                  <td className="py-2 text-gray-600 text-right">{formatPoints(night.points_required)}</td>
                  <td className="py-2 text-gray-900 font-medium text-right">
                    {night.pts_per_dollar.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-medium">
                <td colSpan={2} className="pt-2 text-gray-900">Total</td>
                <td className="pt-2 text-right text-gray-900">{formatCurrency(totalCost)}</td>
                <td className="pt-2 text-right text-gray-900">{formatPoints(totalPoints)}</td>
                <td className="pt-2 text-right text-aa-red">{avgPtsPerDollar.toFixed(1)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
