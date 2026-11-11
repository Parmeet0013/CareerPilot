import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  AlertCircle,
  Download,
  ExternalLink,
  GraduationCap,
  Upload,
  PenTool,
} from 'lucide-react'
import { TopBar } from '../components/TopBar'

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

interface UpcomingEvent {
  date: string
  title: string
  subtitle: string
  tag: string
}

interface TodayData {
  today_formatted: string
  attention_items: AttentionItem[]
  weekly_counts: TodayCounts
  week_strip: DayDeadline[]
  upcoming: UpcomingEvent[]
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const fmtDate = (iso: string) => {
  const d = new Date(iso + 'T00:00:00')
  return `${monthNames[d.getMonth()]} ${d.getDate()}`
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
    return <div className="py-20 text-center text-muted text-[13px]">Loading today's agenda...</div>
  }

  if (!data) {
    return (
      <div className="p-8 text-center bg-surface border border-line rounded-lg">
        <p className="text-muted text-[13px]">Dashboard unavailable.</p>
      </div>
    )
  }

  const strip = data.week_strip
  const weekRange =
    strip.length > 0
      ? `${monthNames[new Date(strip[0].date + 'T00:00:00').getMonth()]} ${strip[0].day_num} – ${monthNames[new Date(strip[6].date + 'T00:00:00').getMonth()]} ${strip[6].day_num}`
      : ''

  return (
    <div className="space-y-6">
      <TopBar />

      {/* Editorial header */}
      <div className="border-b border-line pb-5">
        <h1 className="font-serif text-[30px] font-normal text-ink tracking-tight">
          {data.today_formatted}
        </h1>
        <p className="text-[13px] text-muted mt-1">
          You have {data.attention_items.length} items pending review and {data.upcoming.length}{' '}
          scheduled events in the placement ledger.
        </p>
        <div className="mt-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-accent-soft text-accent border border-accent/20 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
            Placement Ledger Synced
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-soft border border-red/30 rounded text-[13px] text-red flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Needs your attention */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-[15px] font-semibold text-ink">Needs your attention</h2>
              <span className="px-1.5 py-0.5 rounded bg-surface border border-line text-[11px] font-medium text-ink tabular-nums">
                {data.attention_items.length}
              </span>
            </div>

            <div className="bg-surface border border-line rounded-lg divide-y divide-line overflow-hidden">
              {data.attention_items.length === 0 ? (
                <div className="p-8 text-center text-muted text-[13px]">
                  No pending items. All applications are up to date.
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
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            item.badge_variant === 'amber'
                              ? 'bg-amber'
                              : item.badge_variant === 'red'
                              ? 'bg-red'
                              : 'bg-accent'
                          }`}
                        ></span>
                        <h3 className="font-medium text-ink text-[14px] leading-tight">{item.title}</h3>
                      </div>
                      <p className="text-[12px] text-muted pl-4 leading-normal">{item.subtitle}</p>
                    </div>
                    <div className="pl-4 sm:pl-0 shrink-0 flex items-center gap-2">
                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                            item.badge_variant === 'amber'
                              ? 'bg-amber-soft text-amber border-amber/30'
                              : 'bg-canvas text-muted border-line'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
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
          </section>

          {/* Upcoming schedule */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-semibold text-ink">Upcoming Schedule</h2>
              <span className="text-[11px] text-muted">Next 5 Days</span>
            </div>

            <div className="bg-surface border border-line rounded-lg divide-y divide-line overflow-hidden">
              {data.upcoming.length === 0 ? (
                <div className="p-8 text-center text-muted text-[13px]">
                  No scheduled events or deadlines in the next 5 days.
                </div>
              ) : (
                data.upcoming.map((ev, i) => {
                  const d = new Date(ev.date + 'T00:00:00')
                  return (
                    <div key={`${ev.date}-${i}`} className="p-4 flex items-center gap-4 hover:bg-canvas transition-colors">
                      <div className="w-11 shrink-0 text-center">
                        <div className="text-[10px] uppercase tracking-wider text-muted">
                          {monthNames[d.getMonth()]}
                        </div>
                        <div className="text-[20px] font-semibold text-ink tabular-nums leading-none mt-0.5">
                          {d.getDate()}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-ink text-[13.5px] leading-tight">{ev.title}</h3>
                        <p className="text-[12px] text-muted mt-0.5 truncate">{ev.subtitle}</p>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0 ${
                          ev.tag === 'Deadline'
                            ? 'bg-amber-soft text-amber border-amber/30'
                            : 'bg-canvas text-muted border-line'
                        }`}
                      >
                        {ev.tag}
                      </span>
                      <ExternalLink size={13} className="text-muted shrink-0" />
                    </div>
                  )
                })
              )}
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="lg:col-span-4 space-y-5">
          {/* This week */}
          <div className="bg-surface border border-line rounded-lg p-4 shadow-none">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-semibold text-ink">This week</h2>
              <span className="text-[11px] text-muted tabular-nums">{weekRange}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="block text-[26px] font-semibold text-ink tabular-nums leading-none">
                  {data.weekly_counts.applied}
                </span>
                <span className="text-[11px] text-muted block mt-1">Applied</span>
              </div>
              <div>
                <span className="block text-[26px] font-semibold text-ink tabular-nums leading-none">
                  {data.weekly_counts.interviews}
                </span>
                <span className="text-[11px] text-muted block mt-1">Interviews</span>
              </div>
              <div>
                <span className="block text-[26px] font-semibold text-ink tabular-nums leading-none">
                  {data.weekly_counts.saved}
                </span>
                <span className="text-[11px] text-muted block mt-1">Saved / drafts</span>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-line">
              <div className="text-[11px] text-muted mb-2">Placement Timeline</div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {strip.map((day) => (
                  <div
                    key={day.date}
                    className={`p-1 rounded flex flex-col items-center gap-1 ${
                      day.is_today
                        ? 'bg-accent-soft text-accent'
                        : 'text-muted'
                    }`}
                  >
                    <span className="text-[10px] font-medium">{day.day_name}</span>
                    <span className={`text-[11px] tabular-nums ${day.is_today ? 'text-accent font-semibold' : 'text-ink'}`}>
                      {String(day.day_num).padStart(2, '0')}
                    </span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${day.has_deadline ? 'bg-amber' : 'bg-line'}`}
                      title={day.has_deadline ? 'Deadline on this day' : undefined}
                    ></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick shortcuts */}
          <div className="bg-surface border border-line rounded-lg p-4 space-y-2.5 text-[12.5px]">
            <span className="text-[11px] uppercase tracking-wider text-muted font-semibold block mb-1">
              Quick Shortcuts
            </span>
            <a
              href="/api/log/export"
              className="flex items-center gap-2.5 py-1 text-ink hover:text-accent transition-colors"
            >
              <Download size={14} className="text-muted" />
              <span>Download Ledger CSV</span>
            </a>
            <Link
              to="/profile"
              className="flex items-center gap-2.5 py-1 text-ink hover:text-accent transition-colors"
            >
              <GraduationCap size={14} className="text-muted" />
              <span>Update CGPA & Resume Master</span>
            </Link>
            <Link
              to="/jobs"
              className="flex items-center gap-2.5 py-1 text-ink hover:text-accent transition-colors"
            >
              <Upload size={14} className="text-muted" />
              <span>Placement Cell Notice Board</span>
            </Link>
          </div>

          {/* Policy note */}
          <div className="bg-accent-soft border border-accent/20 rounded-lg p-4">
            <div className="flex items-start gap-2.5">
              <PenTool size={14} className="text-accent mt-0.5 shrink-0" />
              <div>
                <p className="text-[12px] font-semibold text-accent">Approval Gate In Effect</p>
                <p className="text-[11.5px] text-accent/80 mt-1 leading-relaxed">
                  Nothing is ever sent without your explicit sign-off. Every draft shows a full
                  before/after diff before you approve.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
