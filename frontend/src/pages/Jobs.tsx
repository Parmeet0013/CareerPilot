import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Search,
  CheckCircle,
  X,
  Bookmark,
  BookmarkCheck,
  ArrowRight,
  RotateCcw,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { TopBar } from '../components/TopBar'

interface Facets {
  locations: Record<string, number>
  types: Record<string, number>
  closing_windows: { '48h': number; week: number; month: number }
}

interface JobItem {
  id: number
  role: string
  company: string
  location: string
  type: string // 'internship' | 'full-time'
  stipend_or_ctc?: string
  closes_on: string
  description: string
  required_skills: string[]
  fit: string // 'Strong' | 'Medium' | 'Weak'
  match_ratio?: number
  why_bullets?: string[]
  missing_skills?: string[]
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const fmtDate = (iso: string) => {
  const d = new Date(iso + 'T00:00:00')
  return `${monthNames[d.getMonth()]} ${d.getDate()}`
}

// Deterministic letter avatar color per company
const avatarStyles = [
  'bg-accent-soft text-accent border-accent/20',
  'bg-amber-soft text-amber border-amber/30',
  'bg-red-soft text-red border-red/20',
  'bg-canvas text-ink border-line',
]
const avatarFor = (company: string) =>
  avatarStyles[(company.charCodeAt(0) + company.length) % avatarStyles.length]

export const JobsPage: React.FC = () => {
  const [jobs, setJobs] = useState<JobItem[]>([])
  const [total, setTotal] = useState<number>(0)
  const [pages, setPages] = useState<number>(1)
  const [facets, setFacets] = useState<Facets | null>(null)
  const [drawerJob, setDrawerJob] = useState<JobItem | null>(null)
  const [drawerLoading, setDrawerLoading] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null)
  const [savedJobIds, setSavedJobIds] = useState<Set<number>>(new Set())
  const [savingId, setSavingId] = useState<number | null>(null)
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set())

  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // Filter params from URL
  const searchQuery = searchParams.get('q') || ''
  const selectedRole = searchParams.get('role') || 'all'
  const selectedLocation = searchParams.get('location') || 'all'
  const selectedType = searchParams.get('type') || 'all'
  const closingWindow = searchParams.get('closing_window') || ''
  const savedOnly = searchParams.get('saved_only') === 'true'
  const sortBy = searchParams.get('sort') || 'deadline'
  const currentPage = parseInt(searchParams.get('page') || '1', 10)

  // Fetch jobs from backend (server-side filtering + pagination + facet counts)
  const fetchJobs = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (searchQuery) params.append('q', searchQuery)
      if (selectedRole !== 'all') params.append('role', selectedRole)
      if (selectedLocation !== 'all') params.append('location', selectedLocation)
      if (selectedType !== 'all') params.append('type', selectedType)
      if (closingWindow) params.append('closing_window', closingWindow)
      params.append('page', String(currentPage))

      const res = await fetch(`/api/jobs?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load job listings')
      const data = await res.json()
      setJobs(data.items || [])
      setTotal(data.total || 0)
      setPages(data.pages || 1)
      setFacets(data.facets || null)

      const highlight = searchParams.get('highlight')
      if (highlight) {
        setSelectedJobId(parseInt(highlight, 10))
      } else if ((data.items || []).length > 0 && selectedJobId === null) {
        setSelectedJobId(data.items[0].id)
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching jobs')
    } finally {
      setLoading(false)
    }
  }

  // Drawer detail fetch: the only call where the LLM writes "why it fits" bullets
  const fetchJobDetail = async (jobId: number) => {
    setDrawerLoading(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}`)
      if (res.ok) setDrawerJob(await res.json())
      else setDrawerJob(null)
    } catch {
      setDrawerJob(null)
    } finally {
      setDrawerLoading(false)
    }
  }

  const selectJob = (jobId: number) => {
    setSelectedJobId(jobId)
    setDrawerJob(null)
    fetchJobDetail(jobId)
  }

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/applications')
      if (res.ok) {
        const apps = await res.json()
        const ids = new Set<number>(apps.map((a: any) => a.job_id))
        setSavedJobIds(ids)
      }
    } catch (e) {
      // Non-blocking
    }
  }

  useEffect(() => {
    fetchJobs()
    fetchApplications()
  }, [searchQuery, selectedRole, selectedLocation, selectedType, closingWindow, currentPage])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedJobId(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const updateFilter = (key: string, value: string | boolean) => {
    const next = new URLSearchParams(searchParams)
    if (value === 'all' || value === false || value === '') {
      next.delete(key)
    } else {
      next.set(key, String(value))
    }
    if (key !== 'page') {
      next.set('page', '1')
    }
    setSearchParams(next)
  }

  const resetFilters = () => {
    setSearchParams(new URLSearchParams())
  }

  const handleSaveJob = async (jobId: number) => {
    try {
      setSavingId(jobId)
      const res = await fetch('/api/applications/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId }),
      })
      if (res.ok) {
        setSavedJobIds((prev) => new Set(prev).add(jobId))
      }
    } catch (e) {
      alert('Failed to save job')
    } finally {
      setSavingId(null)
    }
  }

  const toggleChecked = (jobId: number) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(jobId)) next.delete(jobId)
      else next.add(jobId)
      return next
    })
  }

  const filteredJobs = useMemo(() => {
    let result = [...jobs]
    if (savedOnly) {
      result = result.filter((j) => savedJobIds.has(j.id))
    }
    if (sortBy === 'deadline') {
      result.sort((a, b) => a.closes_on.localeCompare(b.closes_on))
    } else if (sortBy === 'fit') {
      const rank: Record<string, number> = { Strong: 3, Medium: 2, Weak: 1 }
      result.sort((a, b) => (rank[b.fit] || 0) - (rank[a.fit] || 0))
    } else if (sortBy === 'company') {
      result.sort((a, b) => a.company.localeCompare(b.company))
    }
    return result
  }, [jobs, savedOnly, savedJobIds, sortBy])

  const selectedJob = useMemo(() => {
    if (drawerJob && drawerJob.id === selectedJobId) return drawerJob
    return jobs.find((j) => j.id === selectedJobId) || null
  }, [drawerJob, jobs, selectedJobId])

  const getDaysLeft = (dateStr: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(dateStr)
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 3600 * 24))
  }

  const typeCount = (v: string) => {
    if (v === 'all') return total
    return facets?.types?.[v] ?? 0
  }

  return (
    <div className="space-y-4">
      <TopBar />

      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-[28px] font-normal text-ink tracking-tight">Jobs Directory</h1>
            <span className="text-[11px] bg-accent-soft text-accent border border-accent/20 px-2 py-0.5 rounded font-medium">
              Phase 1 Active
            </span>
          </div>
          <p className="text-[13px] text-muted mt-1">
            {total} verified campus & off-campus opportunities • ranked by profile fit •{' '}
            <span className="text-muted/70">mock data</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-surface border border-line rounded px-2 h-8 text-[12px] text-muted">
            <span className="mr-1">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="bg-transparent border-0 p-0 text-ink text-[12px] font-medium focus:ring-0 cursor-pointer"
            >
              <option value="deadline">Closes soonest</option>
              <option value="fit">Fit (Strong first)</option>
              <option value="company">Company (A-Z)</option>
            </select>
          </div>
          <button
            onClick={resetFilters}
            className="h-8 px-2.5 rounded border border-line bg-surface hover:bg-canvas text-muted hover:text-ink text-[12px] flex items-center gap-1 transition-colors"
            title="Reset all filters"
          >
            <RotateCcw size={13} />
            <span>Reset filters</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-soft border border-red/30 rounded text-[13px] text-red flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left filter rail */}
        <aside className="col-span-12 md:col-span-3 bg-surface border border-line rounded-lg p-4 space-y-5 select-none text-[13px]">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <span className="font-medium text-ink">Saved roles only</span>
            <input
              type="checkbox"
              checked={savedOnly}
              onChange={(e) => updateFilter('saved_only', e.target.checked)}
              className="w-4 h-4 rounded text-accent focus:ring-0 border-line cursor-pointer"
            />
          </div>

          {/* Role type with counts */}
          <div>
            <h3 className="text-[11px] text-muted uppercase tracking-wider font-semibold mb-2">Role Type</h3>
            <div className="space-y-1.5">
              {[
                { label: 'Backend', value: 'backend' },
                { label: 'Frontend', value: 'frontend' },
                { label: 'Data & Analyst', value: 'data' },
                { label: 'Machine Learning', value: 'machine learning' },
                { label: 'DevOps / Cloud', value: 'devops' },
              ].map((r) => (
                <label
                  key={r.value}
                  className="flex items-center gap-2 text-ink hover:text-accent cursor-pointer text-[12px]"
                >
                  <input
                    type="radio"
                    name="role_filter"
                    checked={selectedRole === r.value}
                    onChange={() => updateFilter('role', r.value)}
                    className="w-3.5 h-3.5 text-accent focus:ring-0 border-line"
                  />
                  <span className="flex-1">{r.label}</span>
                  <span className="text-[11px] text-muted tabular-nums">{typeCount(r.value)}</span>
                </label>
              ))}
              {selectedRole !== 'all' && (
                <button
                  onClick={() => updateFilter('role', 'all')}
                  className="text-[11px] text-accent hover:underline pl-5"
                >
                  Clear role filter
                </button>
              )}
            </div>
          </div>

          {/* Location with counts */}
          <div className="pt-3 border-t border-line">
            <h3 className="text-[11px] text-muted uppercase tracking-wider font-semibold mb-2">Location</h3>
            <div className="space-y-1.5">
              {['bengaluru', 'hyderabad', 'pune', 'remote', 'patna'].map((loc) => (
                <label
                  key={loc}
                  className="flex items-center gap-2 text-ink hover:text-accent cursor-pointer text-[12px]"
                >
                  <input
                    type="radio"
                    name="location_filter"
                    checked={selectedLocation === loc}
                    onChange={() => updateFilter('location', loc)}
                    className="w-3.5 h-3.5 text-accent focus:ring-0 border-line"
                  />
                  <span className="flex-1 capitalize">{loc}</span>
                  <span className="text-[11px] text-muted tabular-nums">
                    {facets?.locations?.[loc] ?? 0}
                  </span>
                </label>
              ))}
              {selectedLocation !== 'all' && (
                <button
                  onClick={() => updateFilter('location', 'all')}
                  className="text-[11px] text-accent hover:underline pl-5"
                >
                  Clear location filter
                </button>
              )}
            </div>
          </div>

          {/* Closing window with counts */}
          <div className="pt-3 border-t border-line">
            <h3 className="text-[11px] text-muted uppercase tracking-wider font-semibold mb-2">
              Closing Window
            </h3>
            <div className="space-y-1.5">
              {[
                { label: 'Closing in 48h', value: '48h' },
                { label: 'This week', value: 'week' },
                { label: 'Later this month', value: 'month' },
              ].map((w) => (
                <label
                  key={w.value}
                  className="flex items-center gap-2 text-ink hover:text-accent cursor-pointer text-[12px]"
                >
                  <input
                    type="radio"
                    name="closing_filter"
                    checked={closingWindow === w.value}
                    onChange={() => updateFilter('closing_window', w.value)}
                    className="w-3.5 h-3.5 text-accent focus:ring-0 border-line"
                  />
                  <span className="flex-1">{w.label}</span>
                  <span className="text-[11px] text-muted tabular-nums">
                    {facets?.closing_windows?.[w.value as keyof Facets['closing_windows']] ?? 0}
                  </span>
                </label>
              ))}
              {closingWindow && (
                <button
                  onClick={() => updateFilter('closing_window', '')}
                  className="text-[11px] text-accent hover:underline pl-5"
                >
                  Clear window filter
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Center table */}
        <section
          className={`${
            selectedJob ? 'col-span-12 md:col-span-5' : 'col-span-12 md:col-span-9'
          } bg-surface border border-line rounded-lg overflow-hidden flex flex-col`}
        >
          {loading ? (
            <div className="py-20 text-center text-muted text-[13px]">Loading matching opportunities...</div>
          ) : filteredJobs.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-[14px] font-medium text-ink">No jobs match your filter criteria.</p>
              <p className="text-[12px] text-muted">Try clearing some filters or searching a broader term.</p>
              <button
                onClick={resetFilters}
                className="h-8 px-3 rounded bg-accent text-white text-[12px] font-medium mt-2"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="h-9 bg-canvas border-b border-line text-muted text-[11px] uppercase tracking-wider select-none">
                    <th className="py-2 px-3 w-8">
                      <input
                        type="checkbox"
                        checked={filteredJobs.length > 0 && filteredJobs.every((j) => checkedIds.has(j.id))}
                        onChange={(e) =>
                          setCheckedIds(
                            e.target.checked
                              ? new Set(filteredJobs.map((j) => j.id))
                              : new Set()
                          )
                        }
                        className="w-3.5 h-3.5 rounded text-accent focus:ring-0 border-line cursor-pointer"
                      />
                    </th>
                    <th className="py-2 px-3 font-medium">Role</th>
                    <th className="py-2 px-3 font-medium">Company</th>
                    <th className="py-2 px-3 font-medium">Location</th>
                    <th className="py-2 px-3 font-medium">Closes</th>
                    <th className="py-2 px-2 font-medium text-center">Fit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredJobs.map((job) => {
                    const isSelected = selectedJobId === job.id
                    const daysLeft = getDaysLeft(job.closes_on)
                    const isClosingSoon = daysLeft <= 3 && daysLeft >= 0

                    return (
                      <tr
                        key={job.id}
                        onClick={() => selectJob(job.id)}
                        className={`hover:bg-canvas/80 transition-colors duration-75 cursor-pointer ${
                          isSelected ? 'bg-accent-soft/40' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={checkedIds.has(job.id)}
                            onChange={() => toggleChecked(job.id)}
                            className="w-3.5 h-3.5 rounded text-accent focus:ring-0 border-line cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3 max-w-[180px]">
                          <p className="font-medium text-ink leading-tight truncate">{job.role}</p>
                          <p className="text-[11px] text-muted capitalize mt-0.5">
                            {job.type}
                            {savedJobIds.has(job.id) && (
                              <span className="text-accent ml-1 inline-flex items-center gap-0.5 align-middle">
                                <BookmarkCheck size={11} /> Saved
                              </span>
                            )}
                          </p>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-7 h-7 rounded border flex items-center justify-center text-[12px] font-semibold shrink-0 ${avatarFor(
                                job.company
                              )}`}
                            >
                              {job.company.charAt(0).toUpperCase()}
                            </span>
                            {isSelected && (
                              <span className="px-1.5 py-0.5 rounded bg-surface border border-accent/30 text-accent text-[10px] font-medium whitespace-nowrap">
                                Active View
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-muted text-[12px] whitespace-nowrap">{job.location}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-[12px] tabular-nums">
                          {isClosingSoon ? (
                            <span className="inline-flex items-center gap-1 bg-amber-soft text-amber border border-amber/20 px-1.5 py-0.5 rounded text-[11px] font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber"></span>
                              {daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d`}
                            </span>
                          ) : (
                            <span className="text-muted">{fmtDate(job.closes_on)}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                              job.fit === 'Strong'
                                ? 'bg-accent-soft text-accent border border-accent/20'
                                : job.fit === 'Medium'
                                ? 'bg-canvas text-ink border border-line'
                                : 'text-muted border border-line'
                            }`}
                          >
                            {job.fit}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination bar */}
          <div className="mt-auto border-t border-line p-3 px-4 bg-canvas flex items-center justify-between text-[12px] text-muted">
            <span className="tabular-nums">
              Showing <strong className="text-ink font-mono">{total === 0 ? 0 : (currentPage - 1) * 25 + 1}–{Math.min(currentPage * 25, total)}</strong>{' '}
              of <strong className="text-ink font-mono">{total}</strong>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateFilter('page', String(currentPage - 1))}
                disabled={currentPage <= 1}
                className="h-7 px-2 border border-line rounded bg-surface text-ink hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed text-[11px]"
              >
                Previous
              </button>
              <span className="px-2 font-mono text-ink text-[11px] tabular-nums">
                {currentPage} / {pages}
              </span>
              <button
                onClick={() => updateFilter('page', String(currentPage + 1))}
                disabled={currentPage >= pages}
                className="h-7 px-2 border border-line rounded bg-surface text-ink hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed text-[11px]"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        {/* Right detail drawer */}
        {selectedJob && (
          <aside className="col-span-12 md:col-span-4 bg-surface border border-line rounded-lg flex flex-col overflow-hidden sticky top-4">
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <span className="text-[11px] uppercase tracking-wider text-muted font-medium">Role Details</span>
                <button
                  onClick={() => setSelectedJobId(null)}
                  className="text-muted hover:text-ink w-6 h-6 flex items-center justify-center rounded hover:bg-canvas"
                  title="Close inspector (Esc)"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Role identity */}
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <span
                    className={`w-10 h-10 rounded border flex items-center justify-center text-[16px] font-semibold shrink-0 ${avatarFor(
                      selectedJob.company
                    )}`}
                  >
                    {selectedJob.company.charAt(0).toUpperCase()}
                  </span>
                  <div className="text-[12px] text-muted min-w-0">
                    <div className="font-semibold text-ink truncate">{selectedJob.company}</div>
                    <div className="truncate">
                      {selectedJob.location} • <span className="capitalize">{selectedJob.type}</span>
                    </div>
                  </div>
                </div>
                <h2 className="font-serif text-[20px] font-normal text-ink leading-snug">{selectedJob.role}</h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {(() => {
                    const dl = getDaysLeft(selectedJob.closes_on)
                    const urgent = dl <= 3 && dl >= 0
                    return (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                          urgent
                            ? 'bg-amber-soft text-amber border border-amber/20'
                            : 'bg-canvas text-muted border border-line'
                        }`}
                      >
                        <Clock size={12} />
                        <span>
                          {urgent
                            ? dl === 0
                              ? 'Closes today'
                              : `Closes in ${dl}d`
                            : 'Closes'}{' '}
                          • {fmtDate(selectedJob.closes_on)}
                        </span>
                      </span>
                    )
                  })()}
                  {selectedJob.stipend_or_ctc && (
                    <span className="px-2 py-0.5 rounded bg-canvas border border-line text-ink text-[11px] font-medium tabular-nums">
                      {selectedJob.stipend_or_ctc}
                    </span>
                  )}
                </div>
              </div>

              {/* Compensation & bond */}
              {selectedJob.stipend_or_ctc && (
                <div className="pt-3 border-t border-line">
                  <h3 className="text-[12px] font-semibold text-ink uppercase tracking-wider mb-2">
                    Compensation
                  </h3>
                  <div className="bg-canvas border border-line rounded p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-muted capitalize">{selectedJob.type === 'internship' ? 'Internship stipend' : 'Compensation'}</span>
                      <span className="font-semibold text-ink tabular-nums">{selectedJob.stipend_or_ctc}</span>
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-muted">Service bond</span>
                      <span className="font-medium text-accent">None</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="pt-3 border-t border-line">
                <h3 className="text-[12px] font-semibold text-ink uppercase tracking-wider mb-1">
                  About the Opportunity
                </h3>
                <p className="text-[13px] text-ink leading-relaxed">{selectedJob.description}</p>
              </div>

              {/* Required skills */}
              <div className="pt-3 border-t border-line">
                <h3 className="text-[12px] font-semibold text-ink uppercase tracking-wider mb-1.5">
                  Required Technologies
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {selectedJob.required_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-canvas border border-line rounded text-[11px] text-ink font-mono"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Why it fits */}
              <div className="pt-3 border-t border-line">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[12px] font-semibold text-ink uppercase tracking-wider">Why it fits</h3>
                  {selectedJob.match_ratio != null && (
                    <span className="text-[11px] font-semibold text-accent bg-accent-soft border border-accent/20 px-1.5 py-0.5 rounded tabular-nums">
                      {selectedJob.match_ratio}% profile match
                    </span>
                  )}
                </div>
                {drawerLoading ? (
                  <p className="text-[12px] text-muted">Loading match details...</p>
                ) : (
                  <ul className="space-y-2 text-[12px] text-muted">
                    {(selectedJob.why_bullets || [
                      'Upload your resume in Profile to see personalized fit bullets.',
                    ]).map((bullet, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle size={14} className="text-accent mt-0.5 shrink-0" />
                        <span className="text-ink leading-snug">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Missing skills */}
              {selectedJob.missing_skills && selectedJob.missing_skills.length > 0 && (
                <div className="pt-3 border-t border-line">
                  <h3 className="text-[12px] font-semibold text-ink uppercase tracking-wider mb-1.5">
                    Skills you're missing
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedJob.missing_skills.map((ms, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-canvas border border-line text-muted rounded text-[11px] font-mono"
                      >
                        {ms}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted mt-1.5">
                    Can be reviewed and practiced in the Practice section before interviews.
                  </p>
                </div>
              )}
            </div>

            {/* Pinned bottom actions */}
            <div className="p-4 border-t border-line bg-surface flex items-center gap-2 mt-auto">
              <button
                onClick={() => navigate(`/prepare/${selectedJob.id}`)}
                className="flex-1 h-9 bg-accent hover:opacity-90 text-white font-medium text-[13px] rounded flex items-center justify-center gap-1.5 transition-opacity"
              >
                <span>Prepare application →</span>
              </button>
              <button
                onClick={() => handleSaveJob(selectedJob.id)}
                disabled={savingId === selectedJob.id}
                className={`h-9 px-3 border border-line rounded flex items-center justify-center text-[13px] font-medium transition-colors ${
                  savedJobIds.has(selectedJob.id)
                    ? 'bg-accent-soft text-accent border-accent/30'
                    : 'bg-surface hover:bg-canvas text-ink'
                }`}
                title={savedJobIds.has(selectedJob.id) ? 'Saved' : 'Save for later'}
              >
                {savedJobIds.has(selectedJob.id) ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
              </button>
            </div>
          </aside>
        )}
      </div>

      <p className="text-[11px] text-muted pt-2 pb-1 border-t border-line">
        Mock data — all listings and companies are fictional, generated for demonstration.
      </p>
    </div>
  )
}
