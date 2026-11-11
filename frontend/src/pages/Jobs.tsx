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
  Briefcase,
  AlertCircle
} from 'lucide-react'

interface JobItem {
  id: number
  role: string
  company: string
  location: string
  type: string // 'internship' | 'full-time'
  closes_on: string
  description: string
  required_skills: string[]
  fit: string // 'Strong' | 'Medium' | 'Weak'
  why_bullets?: string[]
  missing_skills?: string[]
}

export const JobsPage: React.FC = () => {
  const [jobs, setJobs] = useState<JobItem[]>([])
  const [total, setTotal] = useState<number>(0)
  const [pages, setPages] = useState<number>(1)
  const [drawerJob, setDrawerJob] = useState<JobItem | null>(null)
  const [drawerLoading, setDrawerLoading] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null)
  const [savedJobIds, setSavedJobIds] = useState<Set<number>>(new Set())
  const [savingId, setSavingId] = useState<number | null>(null)

  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // Filter params from URL
  const searchQuery = searchParams.get('q') || ''
  const selectedRole = searchParams.get('role') || 'all'
  const selectedLocation = searchParams.get('location') || 'all'
  const selectedType = searchParams.get('type') || 'all'
  const closingSoon = searchParams.get('closing_soon') === 'true'
  const savedOnly = searchParams.get('saved_only') === 'true'
  const sortBy = searchParams.get('sort') || 'deadline'
  const currentPage = parseInt(searchParams.get('page') || '1', 10)

  // Fetch jobs from backend (server-side filtering + pagination)
  const fetchJobs = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (searchQuery) params.append('q', searchQuery)
      if (selectedRole !== 'all') params.append('role', selectedRole)
      if (selectedLocation !== 'all') params.append('location', selectedLocation)
      if (selectedType !== 'all') params.append('type', selectedType)
      if (closingSoon) params.append('closing_soon', 'true')
      params.append('page', String(currentPage))

      const res = await fetch(`/api/jobs?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load job listings')
      const data = await res.json()
      setJobs(data.items || [])
      setTotal(data.total || 0)
      setPages(data.pages || 1)

      // Set initial selected job from URL if available
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

  // Fetch saved applications to highlight bookmarked jobs
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
  }, [searchQuery, selectedRole, selectedLocation, selectedType, closingSoon, currentPage])

  // Keybindings for closing drawer with Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedJobId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Update a single filter in URL params
  const updateFilter = (key: string, value: string | boolean) => {
    const next = new URLSearchParams(searchParams)
    if (value === 'all' || value === false || value === '') {
      next.delete(key)
    } else {
      next.set(key, String(value))
    }
    if (key !== 'page') {
      next.set('page', '1') // reset page on filter change
    }
    setSearchParams(next)
  }

  const resetFilters = () => {
    setSearchParams(new URLSearchParams())
  }

  // Handle Save job
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

  // Sorting & client-side filtering (saved-only) applied within the current page
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

  // Days left computation
  const getDaysLeft = (dateStr: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(dateStr)
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 3600 * 24))
    return diff
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-line bg-canvas">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-[28px] font-normal text-ink tracking-tight">
              Jobs Directory
            </h1>
            <span className="text-[11px] bg-accent-soft text-accent border border-accent/20 px-2 py-0.5 rounded font-medium">
              {total} listings
            </span>
          </div>
          <p className="text-[13px] text-muted mt-1">
            Curated fresher and internship roles with profile fit ranking • Mock data
          </p>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => updateFilter('q', e.target.value)}
              placeholder="Search role or company..."
              className="w-full h-8 pl-8 pr-3 bg-surface border border-line rounded text-[13px] text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="flex items-center bg-surface border border-line rounded px-2 h-8 text-[12px] text-muted">
            <span className="mr-1">Sort:</span>
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
            <span>Reset</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-soft border border-red/30 rounded text-[13px] text-red flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Split: Left Filter Rail + Center Ledger Table + Right Slide Drawer */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left Filter Rail (3 cols / ~220px) */}
        <aside className="col-span-12 md:col-span-3 bg-surface border border-line rounded-lg p-4 space-y-5 select-none text-[13px]">
          {/* Quick Saved Toggle */}
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <span className="font-medium text-ink">Saved roles only</span>
            <input
              type="checkbox"
              checked={savedOnly}
              onChange={(e) => updateFilter('saved_only', e.target.checked)}
              className="w-4 h-4 rounded text-accent focus:ring-0 border-line cursor-pointer"
            />
          </div>

          {/* Filter: Role Group */}
          <div>
            <h3 className="text-[11px] text-muted uppercase tracking-wider font-semibold mb-2">
              Role Group
            </h3>
            <div className="space-y-1.5">
              {[
                { label: 'All roles', value: 'all' },
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
                  <span>{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Filter: Location */}
          <div className="pt-3 border-t border-line">
            <h3 className="text-[11px] text-muted uppercase tracking-wider font-semibold mb-2">
              Location
            </h3>
            <div className="space-y-1.5">
              {[
                { label: 'All locations', value: 'all' },
                { label: 'Bengaluru', value: 'bengaluru' },
                { label: 'Hyderabad', value: 'hyderabad' },
                { label: 'Pune', value: 'pune' },
                { label: 'Remote', value: 'remote' },
                { label: 'Patna / Remote-friendly', value: 'patna' },
              ].map((loc) => (
                <label
                  key={loc.value}
                  className="flex items-center gap-2 text-ink hover:text-accent cursor-pointer text-[12px]"
                >
                  <input
                    type="radio"
                    name="location_filter"
                    checked={selectedLocation === loc.value}
                    onChange={() => updateFilter('location', loc.value)}
                    className="w-3.5 h-3.5 text-accent focus:ring-0 border-line"
                  />
                  <span>{loc.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Filter: Job Type */}
          <div className="pt-3 border-t border-line">
            <h3 className="text-[11px] text-muted uppercase tracking-wider font-semibold mb-2">
              Job Type
            </h3>
            <div className="space-y-1.5">
              {[
                { label: 'All types', value: 'all' },
                { label: 'Internship', value: 'internship' },
                { label: 'Full-time', value: 'full-time' },
              ].map((jt) => (
                <label
                  key={jt.value}
                  className="flex items-center gap-2 text-ink hover:text-accent cursor-pointer text-[12px]"
                >
                  <input
                    type="radio"
                    name="type_filter"
                    checked={selectedType === jt.value}
                    onChange={() => updateFilter('type', jt.value)}
                    className="w-3.5 h-3.5 text-accent focus:ring-0 border-line"
                  />
                  <span>{jt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Filter: Closing Soon */}
          <div className="pt-3 border-t border-line">
            <label className="flex items-center justify-between text-ink hover:text-accent cursor-pointer text-[12px]">
              <span className="flex items-center gap-2">
                <Clock size={14} className="text-amber" />
                <span>Closing within 3 days</span>
              </span>
              <input
                type="checkbox"
                checked={closingSoon}
                onChange={(e) => updateFilter('closing_soon', e.target.checked)}
                className="w-3.5 h-3.5 rounded text-accent focus:ring-0 border-line cursor-pointer"
              />
            </label>
          </div>
        </aside>

        {/* Center Ledger Table (Selected Job determines whether 9 or 5 cols) */}
        <section
          className={`${
            selectedJob ? 'col-span-12 md:col-span-5' : 'col-span-12 md:col-span-9'
          } bg-surface border border-line rounded-lg overflow-hidden flex flex-col`}
        >
          {loading ? (
            <div className="py-20 text-center text-muted text-[13px]">
              Loading matching opportunities...
            </div>
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
                    <th className="py-2 px-3 font-medium">Role & Company</th>
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
                          isSelected ? 'bg-accent-soft/50 border-l-2 border-l-accent' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <p className="font-medium text-ink leading-tight">{job.role}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted">
                            <span className="font-semibold text-ink">{job.company}</span>
                            <span>•</span>
                            <span className="capitalize">{job.type}</span>
                            {savedJobIds.has(job.id) && (
                              <span className="text-accent flex items-center gap-0.5">
                                • <BookmarkCheck size={11} /> Saved
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-muted text-[12px] whitespace-nowrap">
                          {job.location}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-[12px] tabular-nums">
                          {isClosingSoon ? (
                            <span className="inline-flex items-center gap-1 bg-amber-soft text-amber border border-amber/20 px-1.5 py-0.5 rounded text-[11px] font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber"></span>
                              {daysLeft === 0
                                ? 'Today'
                                : daysLeft === 1
                                ? 'Tomorrow'
                                : `${daysLeft}d left`}
                            </span>
                          ) : (
                            <span className="text-muted">{job.closes_on}</span>
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

          {/* Ledger Pagination Bar (server-side pagination) */}
          <div className="mt-auto border-t border-line p-3 px-4 bg-canvas flex items-center justify-between text-[12px] text-muted">
            <span>
              Showing{' '}
              <strong className="text-ink font-mono">
                {total === 0 ? 0 : (currentPage - 1) * 25 + 1}–
                {Math.min(currentPage * 25, total)}
              </strong>{' '}
              of <strong className="text-ink font-mono">{total}</strong> postings
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateFilter('page', String(currentPage - 1))}
                disabled={currentPage <= 1}
                className="h-7 px-2 border border-line rounded bg-surface text-ink hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed text-[11px]"
              >
                Previous
              </button>
              <span className="px-2 font-mono text-ink text-[11px]">
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

        {/* Right Detail Inspect Drawer (440px / 4 cols) */}
        {selectedJob && (
          <aside className="col-span-12 md:col-span-4 bg-surface border border-line rounded-lg flex flex-col overflow-hidden sticky top-4">
            <div className="p-5 flex flex-col gap-4">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <span className="text-[11px] uppercase tracking-wider text-muted font-medium">
                  Role Details
                </span>
                <button
                  onClick={() => setSelectedJobId(null)}
                  className="text-muted hover:text-ink w-6 h-6 flex items-center justify-center rounded hover:bg-canvas"
                  title="Close inspector (Esc)"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Role Title & Identity */}
              <div>
                <div className="flex items-center gap-2 mb-1 text-[12px] text-muted">
                  <span className="font-semibold text-ink">{selectedJob.company}</span>
                  <span>•</span>
                  <span>{selectedJob.location}</span>
                  <span>•</span>
                  <span className="capitalize">{selectedJob.type}</span>
                </div>
                <h2 className="font-serif text-[20px] font-normal text-ink leading-snug">
                  {selectedJob.role}
                </h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 bg-amber-soft text-amber border border-amber/20 px-2 py-0.5 rounded text-[11px] font-medium">
                    <Clock size={12} />
                    <span>Closes: {selectedJob.closes_on}</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      selectedJob.fit === 'Strong'
                        ? 'bg-accent-soft text-accent border border-accent/20'
                        : selectedJob.fit === 'Medium'
                        ? 'bg-canvas text-ink border border-line'
                        : 'text-muted border border-line'
                    }`}
                  >
                    {selectedJob.fit} Fit
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="pt-3 border-t border-line">
                <h3 className="text-[12px] font-semibold text-ink uppercase tracking-wider mb-1">
                  About the Opportunity
                </h3>
                <p className="text-[13px] text-ink leading-relaxed">
                  {selectedJob.description}
                </p>
              </div>

              {/* Required Skills */}
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

              {/* Section: Why it fits (3 Bullets) */}
              <div className="pt-3 border-t border-line">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[12px] font-semibold text-ink uppercase tracking-wider">
                    Why it fits
                  </h3>
                  <span className="text-[11px] text-accent font-medium">Profile Match</span>
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

              {/* Section: Skills missing */}
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

            {/* Pinned Bottom Actions */}
            <div className="p-4 border-t border-line bg-surface flex items-center gap-2 mt-auto">
              <button
                onClick={() => navigate(`/prepare/${selectedJob.id}`)}
                className="flex-1 h-9 bg-accent hover:opacity-90 text-white font-medium text-[13px] rounded flex items-center justify-center gap-1.5 transition-opacity"
              >
                <span>Prepare application</span>
                <ArrowRight size={15} />
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
                {savedJobIds.has(selectedJob.id) ? (
                  <BookmarkCheck size={16} />
                ) : (
                  <Bookmark size={16} />
                )}
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Footer note */}
      <p className="text-[11px] text-muted pt-2 pb-1 border-t border-line">
        Mock data — all listings and companies are fictional, generated for demonstration.
      </p>
    </div>
  )
}
