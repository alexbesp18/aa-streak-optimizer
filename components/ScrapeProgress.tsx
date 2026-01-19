'use client'

interface ScrapeProgressProps {
  destination: string
  progress: number // 0-100
  hotelsFound: number
}

export default function ScrapeProgress({
  destination,
  progress,
  hotelsFound,
}: ScrapeProgressProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          Scraping {destination}...
        </span>
        <span className="text-sm text-gray-500">
          {hotelsFound} hotels found
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-aa-red transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-gray-500">
        {progress < 100
          ? 'Results will appear below as they come in...'
          : 'Calculating optimal sequences...'}
      </p>
    </div>
  )
}
