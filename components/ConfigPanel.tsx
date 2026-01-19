'use client'

import { useState } from 'react'
import { DESTINATIONS, SearchMode, DestinationName } from '@/lib/types'

interface ConfigPanelProps {
  onSubmit: (destination: string, checkIn: string, mode: SearchMode) => void
  isLoading: boolean
}

export default function ConfigPanel({ onSubmit, isLoading }: ConfigPanelProps) {
  const [destination, setDestination] = useState<DestinationName>('Austin')
  const [checkIn, setCheckIn] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  })
  const [mode, setMode] = useState<SearchMode>('optimal')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(destination, checkIn, mode)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Destination */}
        <div className="flex-1">
          <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
            Destination
          </label>
          <select
            id="destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value as DestinationName)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-aa-red focus:border-aa-red"
            disabled={isLoading}
          >
            {DESTINATIONS.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}, {d.state}
              </option>
            ))}
          </select>
        </div>

        {/* Check-in Date */}
        <div className="flex-1">
          <label htmlFor="checkIn" className="block text-sm font-medium text-gray-700 mb-1">
            Check-in Date
          </label>
          <input
            type="date"
            id="checkIn"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-aa-red focus:border-aa-red"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Mode
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('optimal')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              mode === 'optimal'
                ? 'bg-aa-red text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            disabled={isLoading}
          >
            Optimal by Duration
          </button>
          <button
            type="button"
            onClick={() => setMode('anomaly')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              mode === 'anomaly'
                ? 'bg-aa-red text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            disabled={isLoading}
          >
            Find Anomalies
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {mode === 'optimal'
            ? 'Find best pts/$ sequence for 1-10 nights (can switch hotels each night)'
            : 'Find 4-7 night stays ≥50% above historical average'}
        </p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="mt-4 w-full py-3 px-4 bg-aa-red hover:bg-aa-red-dark text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Searching...' : 'Search Hotels'}
      </button>
    </form>
  )
}
