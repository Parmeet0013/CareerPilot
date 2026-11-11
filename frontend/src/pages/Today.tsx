import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Clock,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  FileText,
  Briefcase,
  PenTool,
  Bookmark
} from 'lucide-react'

interface AttentionItem {
  id: string
  type: string
  title: string
  subtitle: string
  action_label: string
  action_url: string
  badge?: string
  badge_variant?: string
}

interface TodayCounts {
  applied: number
  interviews: number
  saved: number
}

interface DayDeadline {
  date: string
  day_name: string
  day_num: number
  has_deadline: boolean
  is_today: boolean
}

interface TodayData {
  today_formatted: string
  attention_items: AttentionItem[]
  weekly_counts: TodayCounts
  week_strip: DayDeadline[]
}

export const TodayPage: React.FC = () => {
  const [data, setData] = useState<TodayData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const navigate = useNavigate()

  const fetchToday = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/today')
      if (!res.ok) throw new Error('Failed to load dashboard')
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err.message || 'Error loading dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchToday()
  }, [])

  if (loading) {
    return (
      <div className="py-20 text-center text-muted text-[13px]">
        Loading today's agenda...
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 text-center bg-surface border border-line rounded-lg">
        <p className="text-muted text-[13px]">Dashboard unavailable.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Editorial Header Section */}
      <div className="flex flex-col md:flex-row md:items-baseline justify-between border-b border-line pb-4 gap-2 bg-canvas">
        <div>
          <h1 className="font-serif text-[28px] font-normal text-ink tracking-tight">
            {data.today_formatted}
          </h1>
          <p className="text-[13px] text-muted mt-0.5">
            {data.attention_items.length} items require your attention • Campus Placement Season Drive
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-accent-soft text-accent border border-accent/20 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
            Ledger Active
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-soft border border-red/30 rounded text-[13px] text-red flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Two-Column Grid (8 cols / 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Needs your attention */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-ink">Needs your attention</h2>
              <span className="px-1.5 py-0.2 rounded bg-surface border border-line text-[11px] font-mono font-medium text-ink">
                {data.attention_items.length}
              </span>
            </div>
            <span className="text-[11px] text-muted">Priority items</span>
          </div>

          <div className="bg-surface border border-line rounded-lg divide-y divide-line overflow-hidden shadow-none">
            {data.attention_items.length === 0 ? (
              <div className="p-8 text-center text-muted text-[13px]">
                No pending items. All applications are up to date!
              </div>
            ) : (
              data.attention_items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-canvas transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.badge_variant === 'amber'
                            ? 'bg-amber'
                            : item.badge_variant === 'red'
                            ? 'bg-red'
                            : 'bg-accent'
                        }`}
                      ></span>
                      <h3 className="font-medium text-ink text-[14px] leading-tight">
                        {item.title}
                      </h3>
                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${
                            item.badge_variant === 'amber'
                              ? 'bg-amber-soft text-amber border-amber/30'
                              : 'bg-canvas text-muted border-line'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-muted pl-4 leading-normal">
                      {item.subtitle}
                    </p>
                  </div>

                  <div className="pl-4 sm:pl-0 shrink-0">
                    <Link
                      to={item.action_url}
                      className={`h-8 px-3 rounded text-[12px] font-medium inline-flex items-center gap-1 transition-colors ${
                        item.type === 'review_draft'
                          ? 'bg-accent text-white hover:opacity-90'
                          : 'border border-line bg-surface text-ink hover:bg-canvas'
                      }`}
                    >
                      <span>{item.action_label}</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column (4 cols): This week stats + 7-day strip */}
        <div className="lg:col-span-4 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-ink">This week</h2>
            <span className="text-[11px] text-muted font-mono">Ledger Metrics</span>
          </div>

          <div className="bg-surface border border-line rounded-lg p-4 space-y-4 shadow-none">
            {/* Counts Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-canvas border border-line rounded">
                <span className="block text-[22px] font-semibold text-ink tabular-nums">
                  {data.weekly_counts.applied}
                </span>
                <span className="text-[11px] text-muted uppercase tracking-wider block mt-0.5">
                  Applied
                </span>
              </div>
              <div className="p-2.5 bg-canvas border border-line rounded">
                <span className="block text-[22px] font-semibold text-ink tabular-nums">
                  {data.weekly_counts.interviews}
                </span>
                <span className="text-[11px] text-muted uppercase tracking-wider block mt-0.5">
                  Interview
                </span>
              </div>
              <div className="p-2.5 bg-canvas border border-line rounded">
                <span className="block text-[22px] font-semibold text-ink tabular-nums">
                  {data.weekly_counts.saved}
                </span>
                <span className="text-[11px] text-muted uppercase tracking-wider block mt-0.5">
                  Saved
                </span>
              </div>
            </div>

            {/* 7-Day Deadline Strip */}
            <div className="pt-3 border-t border-line space-y-2">
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>Upcoming Deadlines</span>
                <span className="font-mono">Current Week</span>
              </div>

              <div className="grid grid-cols-7 gap-1 pt-1 text-center">
                {data.week_strip.map((day) => (
                  <div
                    key={day.date}
                    className={`p-1.5 rounded flex flex-col items-center gap-1 ${
                      day.is_today
                        ? 'bg-accent-soft border border-accent/30 font-semibold text-accent'
                        : 'bg-canvas text-muted border border-transparent'
                    }`}
                  >
                    <span className="text-[10px] uppercase">{day.day_name}</span>
                    <span className="text-[12px] font-mono text-ink">{day.day_num}</span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                        day.has_deadline ? 'bg-amber' : 'bg-transparent'
                      }`}
                      title={day.has_deadline ? 'Deadline on this day' : undefined}
                    ></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-surface border border-line rounded-lg p-4 space-y-2 text-[12px]">
            <span className="text-[11px] uppercase tracking-wider text-muted font-semibold block mb-1">
              Ledger Quick Links
            </span>
            <Link
              to="/jobs"
              className="flex items-center justify-between py-1 text-ink hover:text-accent transition-colors"
            >
              <div className="flex items-center gap-2">
                <Briefcase size={14} className="text-muted" />
                <span>Explore 40 fresher & intern listings</span>
              </div>
              <ArrowRight size={13} className="text-muted" />
            </Link>
            <Link
              to="/practice"
              className="flex items-center justify-between py-1 text-ink hover:text-accent transition-colors pt-2 border-t border-line/60"
            >
              <div className="flex items-center gap-2">
                <PenTool size={14} className="text-muted" />
                <span>Practice mock technical interviews</span>
              </div>
              <ArrowRight size={13} className="text-muted" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
