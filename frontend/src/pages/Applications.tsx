import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  History,
  Download,
  Calendar,
  Clock,
  ArrowRight,
  FileText,
  CheckCircle,
  X,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react'
import { TopBar } from '../components/TopBar'

interface JobData {
  id: number
  role: string
  company: string
  location: string
  type: string
  stipend_or_ctc?: string
  closes_on: string
  required_skills: string[]
  fit?: string
}

interface ApplicationData {
  id: number
  job_id: number
  status: string // saved, drafted, awaiting_approval, applied, interview, offer, rejected
  tailored_resume_path?: string | null
  cover_note?: string | null
  created_at: string
  updated_at: string
  applied_at?: string | null
  job: JobData
}

interface ActionLogEntry {
  id: number
  timestamp: string
  tool: string
  input_summary?: string
  output_summary?: string
  status: string
}

export const ApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<ApplicationData[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [activityOpen, setActivityOpen] = useState<boolean>(false)
  const [logs, setLogs] = useState<ActionLogEntry[]>([])
  const [logsLoading, setLogsLoading] = useState<boolean>(false)
  const [selectedApp, setSelectedApp] = useState<ApplicationData | null>(null)

  const navigate = useNavigate()

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/applications')
      if (!res.ok) throw new Error('Failed to load applications')
      const data = await res.json()
      setApplications(data)
    } catch (err: any) {
      setError(err.message || 'Error loading applications')
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async () => {
    try {
      setLogsLoading(true)
      const res = await fetch('/api/log')
      if (res.ok) {
        const data = await res.json()
        setLogs(data)
      }
    } catch (e) {
      // Non-blocking
    } finally {
      setLogsLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
    fetchLogs()
  }, [])

  // Handle reminder .ics generation & download
  const handleDownloadReminder = async (appId: number) => {
    try {
      const res = await fetch(`/api/applications/${appId}/reminder`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json()
        window.open(`/api/files/${data.ics_path}`, '_blank')
      }
    } catch (e) {
      alert('Could not download calendar reminder.')
    }
  }

  // Update status for non-applied states (Saved, Drafted, Interview, Offer, Rejected)
  const handleUpdateStatus = async (appId: number, nextStatus: string) => {
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Status update failed')
      }
      fetchApplications()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const columns = [
    { key: 'saved', label: 'Saved', statuses: ['saved'] },
    { key: 'drafted', label: 'Drafted', statuses: ['drafted', 'awaiting_approval'] },
    { key: 'applied', label: 'Applied', statuses: ['applied'] },
    { key: 'interview', label: 'Interview', statuses: ['interview'] },
    { key: 'offer', label: 'Offer', statuses: ['offer'] },
  ]

  const getDaysLeft = (dateStr?: string) => {
    if (!dateStr) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(dateStr)
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 3600 * 24))
  }

  const formatLogTime = (isoStr: string) => {
    const d = new Date(isoStr)
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  }

  const avatarStyles = [
    'bg-accent-soft text-accent border-accent/20',
    'bg-amber-soft text-amber border-amber/30',
    'bg-red-soft text-red border-red/20',
    'bg-canvas text-ink border-line',
  ]
  const avatarFor = (company: string) =>
    avatarStyles[(company.charCodeAt(0) + company.length) % avatarStyles.length]

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <div className="space-y-6">
      <TopBar />

      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-[28px] font-normal text-ink tracking-tight">
              Applications
            </h1>
            <span className="text-[11px] bg-accent-soft text-accent border border-accent/20 px-2 py-0.5 rounded font-medium">
              Phase 1 On-Campus
            </span>
          </div>
          <p className="text-[13px] text-muted mt-1">
            {applications.length} active processes tracked in your recruitment pipeline
          </p>
        </div>

        {/* Right utility: Activity log button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setActivityOpen(true)
              fetchLogs()
            }}
            className="h-8 px-3 rounded border border-line bg-surface hover:bg-canvas text-ink text-[12px] font-medium flex items-center gap-2 transition-colors"
          >
            <History size={14} className="text-accent" />
            <span>Activity ledger</span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-soft border border-red/30 rounded text-[13px] text-red flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 5-Column Kanban Board */}
      {loading ? (
        <div className="py-20 text-center text-muted text-[13px]">
          Loading application pipeline...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start min-h-[500px]">
          {columns.map((col) => {
            const colApps = applications.filter((app) =>
              col.statuses.includes(app.status)
            )

            return (
              <div
                key={col.key}
                className="bg-canvas border border-line rounded-lg p-3 flex flex-col gap-3 min-h-[420px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-ink">{col.label}</span>
                    <span className="px-1.5 py-0.2 rounded bg-surface border border-line text-[11px] font-mono font-medium text-ink">
                      {colApps.length}
                    </span>
                  </div>
                  {col.key === 'drafted' && (
                    <span className="text-[10px] text-amber font-medium">
                      {colApps.filter((a) => a.status === 'awaiting_approval').length} need review
                    </span>
                  )}
                </div>

                {/* Cards Container */}
                <div className="space-y-2.5 flex-1">
                  {colApps.length === 0 ? (
                    <div className="p-4 text-center text-muted text-[11px] border border-dashed border-line rounded">
                      No applications
                    </div>
                  ) : (
                    colApps.map((app) => {
                      const daysLeft = getDaysLeft(app.job?.closes_on)
                      const isAwaiting = app.status === 'awaiting_approval'
                      const isClosingSoon = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0

                      return (
                        <div
                          key={app.id}
                          className={`bg-surface border rounded-lg p-3 space-y-2 hover:border-accent/40 transition-colors shadow-none ${
                            isAwaiting ? 'border-amber/50 bg-amber-soft/20' : 'border-line'
                          }`}
                        >
                          {/* Card Header: Avatar, Company & Status Tag */}
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-8 h-8 rounded border flex items-center justify-center text-[13px] font-semibold shrink-0 ${avatarFor(
                                  app.job?.company || '?'
                                )}`}
                              >
                                {(app.job?.company || '?').charAt(0).toUpperCase()}
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold text-ink text-[13px] leading-tight truncate">
                                  {app.job?.company || 'Company'}
                                </p>
                                <p className="text-[12px] text-muted leading-tight mt-0.5 truncate">
                                  {app.job?.role}
                                </p>
                              </div>
                            </div>
                            {isAwaiting && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-soft text-amber border border-amber/30 text-[10px] font-medium whitespace-nowrap">
                                Awaiting approval
                              </span>
                            )}
                          </div>

                          {/* Deadline & Compensation Tags */}
                          {app.job?.closes_on && (
                            <div className="flex items-center gap-1.5 flex-wrap text-[11px] pt-1">
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${
                                  isClosingSoon
                                    ? 'bg-amber-soft text-amber border-amber/20 font-medium'
                                    : 'bg-canvas text-muted border-line'
                                }`}
                              >
                                <Clock size={11} />
                                <span>Closes {app.job.closes_on}</span>
                              </span>
                              {app.job.stipend_or_ctc && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-canvas border border-line text-ink font-medium tabular-nums">
                                  {app.job.stipend_or_ctc}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Card Actions */}
                          <div className="flex items-center justify-between pt-1 gap-1">
                            <Link
                              to={`/prepare/${app.job_id}`}
                              className="text-[11px] text-accent hover:underline flex items-center gap-1 font-medium"
                            >
                              <span>{isAwaiting ? 'Review draft' : 'View details'}</span>
                              <ArrowRight size={11} />
                            </Link>

                            <div className="flex items-center gap-1">
                              {app.tailored_resume_path && (
                                <a
                                  href={`/api/files/${app.tailored_resume_path}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 rounded text-accent hover:bg-accent-soft"
                                  title="Download tailored resume PDF"
                                >
                                  <FileText size={13} />
                                </a>
                              )}
                              <button
                                onClick={() => handleDownloadReminder(app.id)}
                                className="p-1 rounded text-muted hover:text-ink hover:bg-canvas"
                                title="Download .ics calendar reminder"
                              >
                                <Calendar size={13} />
                              </button>

                              {/* Status Transition Select for non-applied */}
                              {app.status !== 'applied' && (
                                <select
                                  value={app.status}
                                  onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                                  className="text-[10px] bg-canvas border border-line rounded px-1 py-0.5 text-muted focus:ring-0 cursor-pointer"
                                  title="Change stage"
                                >
                                  <option value="saved">Saved</option>
                                  <option value="drafted">Drafted</option>
                                  <option value="interview">Interview</option>
                                  <option value="offer">Offer</option>
                                  <option value="rejected">Rejected</option>
                                </select>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Activity Log Sliding Drawer */}
      {activityOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setActivityOpen(false)}
            className="fixed inset-0 bg-ink/20 transition-opacity"
          ></div>

          {/* Drawer Canvas */}
          <aside className="relative z-50 w-full max-w-xl bg-surface border-l border-line h-full flex flex-col justify-between select-text shadow-none">
            {/* Drawer Header */}
            <div className="p-5 pb-4 border-b border-line flex items-start justify-between">
              <div>
                <h2 className="font-serif text-[20px] text-ink">Agent Activity Ledger</h2>
                <p className="text-[12px] text-muted mt-0.5">
                  Verifiable audit trail of every recruitment automation
                </p>
              </div>
              <button
                onClick={() => setActivityOpen(false)}
                className="text-muted hover:text-ink p-1 rounded"
              >
                <X size={18} />
              </button>
            </div>

            {/* Truth-First banner */}
            <div className="px-5 pt-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded bg-accent-soft border border-accent/20 text-[12px] text-accent font-medium">
                <ShieldCheck size={14} />
                <span>Truth-First Guarantee — only verified profile facts are recorded here.</span>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="px-5 py-4 overflow-y-auto flex-1 text-[12px]">
              {logsLoading ? (
                <p className="text-muted text-center py-10">Loading audit records...</p>
              ) : logs.length === 0 ? (
                <p className="text-muted text-center py-10">No action logs found.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-line text-muted text-[10px] uppercase tracking-wider select-none">
                      <th className="py-2 pr-2 font-medium w-24">Timestamp</th>
                      <th className="py-2 pr-2 font-medium">Action / Operation</th>
                      <th className="py-2 pl-2 font-medium w-24 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {logs.map((log) => (
                      <tr key={log.id} className="align-top">
                        <td className="py-2.5 pr-2 text-muted tabular-nums whitespace-nowrap">
                          {formatLogTime(log.timestamp)}
                        </td>
                        <td className="py-2.5 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-medium text-ink bg-canvas border border-line px-1.5 py-0.5 rounded text-[10px]">
                              {log.tool}
                            </span>
                          </div>
                          {log.input_summary && (
                            <p className="text-muted text-[11px] mt-1 leading-snug">{log.input_summary}</p>
                          )}
                          {log.output_summary && (
                            <p className="text-ink text-[11px] mt-0.5 leading-snug">{log.output_summary}</p>
                          )}
                        </td>
                        <td className="py-2.5 pl-2 text-right">
                          <span
                            className={`inline-block text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border ${
                              log.status === 'success'
                                ? 'bg-accent-soft text-accent border-accent/20'
                                : log.status === 'warning'
                                ? 'bg-amber-soft text-amber border-amber/30'
                                : 'bg-red-soft text-red border-red/20'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-line bg-canvas flex items-center justify-between text-[12px] text-muted">
              <span>Local immutable storage log</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchLogs}
                  className="h-7 px-2.5 rounded border border-line bg-surface text-ink text-[11px] hover:bg-canvas"
                >
                  Refresh
                </button>
                <a
                  href="/api/log/export"
                  className="h-7 px-2.5 rounded border border-line bg-surface text-ink text-[11px] hover:bg-canvas inline-flex items-center gap-1"
                >
                  <Download size={11} />
                  Export Audit CSV
                </a>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
