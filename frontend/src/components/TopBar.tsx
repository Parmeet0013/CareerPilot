import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bell, Download } from 'lucide-react'

interface TopBarProps {
  left?: React.ReactNode
  right?: React.ReactNode
}

export const TopBar: React.FC<TopBarProps> = ({ left, right }) => {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  return (
    <div className="flex items-center gap-4 pb-4 border-b border-line">
      {left !== undefined ? (
        <div className="flex-1 min-w-0">{left}</div>
      ) : (
        <div className="relative w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && q.trim()) {
                navigate(`/jobs?q=${encodeURIComponent(q.trim())}`)
                setQ('')
              }
            }}
            placeholder="Search jobs, companies..."
            className="w-full pl-9 pr-14 py-2 rounded border border-line bg-surface text-[13px] text-ink placeholder:text-muted/70 focus:outline-none focus:border-accent/40"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted border border-line rounded px-1.5 py-0.5 tabular-nums">
            ⌘K
          </span>
        </div>
      )}

      {!left && (
        <div className="flex items-center gap-2 text-[13px]">
          <span className="font-medium text-ink underline underline-offset-4 decoration-accent decoration-2">
            Season 2026–27
          </span>
          <span className="text-muted">Phase 1 Drives</span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        {right ?? (
          <>
            <a
              href="/api/log/export"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-line text-[12px] font-medium text-ink hover:bg-canvas transition-colors"
            >
              <Download size={14} strokeWidth={1.5} />
              Export Ledger
            </a>
            <button
              className="p-2 rounded border border-line text-muted hover:bg-canvas hover:text-ink transition-colors"
              title="Notifications"
            >
              <Bell size={15} strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
