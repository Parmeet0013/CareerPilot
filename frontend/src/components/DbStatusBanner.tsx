import React, { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'

interface HealthData {
  status: string
  database: {
    connected: boolean
    engine: string
    error: string | null
  }
}

/**
 * Shows a persistent banner when the backend cannot reach the database.
 * The app stays usable; writes will fail until the DB is back.
 */
export const DbStatusBanner: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const res = await fetch('/api/health')
        if (res.ok && !cancelled) setHealth(await res.json())
      } catch {
        if (!cancelled) setHealth({ status: 'degraded', database: { connected: false, engine: 'unknown', error: 'Backend unreachable' } })
      }
    }
    check()
    const timer = setInterval(check, 30000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  if (!health || health.database.connected) return null

  return (
    <div className="mb-6 p-3 bg-red-soft border border-red/30 rounded text-[13px] text-red flex items-start gap-2">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span>
        Database connection failed{health.database.error ? `: ${health.database.error}` : '.'}{' '}
        Data may be stale and saving will not work until the connection is restored.
      </span>
    </div>
  )
}
