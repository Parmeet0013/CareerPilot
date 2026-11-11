import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Download,
  CheckCircle,
  Clock,
  Lock,
  Send,
  Save,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileText,
  RotateCcw,
  Sparkles
} from 'lucide-react'

interface StepItem {
  step: number
  tool: string
  summary: string
  status: string
}

interface ApplicationDraft {
  application_id: number | null
  job_id: number
  status: string
  tailored_resume_path: string | null
  reminder_path: string | null
  cover_note: string
  resume_changes?: {
    summary?: string
    highlighted_skills?: string[]
    reordered_projects?: Array<{
      title: string
      description: string
      technologies: string[]
    }>
    reordered_experience?: Array<{
      company: string
      role: string
      duration: string
      description: string
    }>
  }
  steps_taken: StepItem[]
  job: {
    id: number
    role: string
    company: string
    location: string
    type: string
    closes_on: string
    required_skills: string[]
  }
  master_profile: {
    name: string
    email: string
    education: string
    skills: string[]
    projects: Array<{
      title: string
      description: string
      technologies: string[]
    }>
    experience: Array<{
      company: string
      role: string
      duration: string
      description: string
    }>
  }
}

export const PreparePage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()

  const [draft, setDraft] = useState<ApplicationDraft | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [agentRunning, setAgentRunning] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [coverNote, setCoverNote] = useState<string>('')
  const [stepsOpen, setStepsOpen] = useState<boolean>(true)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Target job ID from URL or default to 1 (Kavach Systems)
  const targetJobId = jobId ? parseInt(jobId, 10) : 1

  const loadOrRunAgent = async (forceRun: boolean = false) => {
    try {
      setLoading(true)
      setError(null)
      setActionSuccess(null)

      if (!forceRun) {
        // Check if an existing draft is available
        const checkRes = await fetch(`/api/applications/by-job/${targetJobId}`)
        if (checkRes.ok) {
          const existing = await checkRes.json()
          if (existing.application_id && existing.tailored_resume_path) {
            setDraft(existing)
            setCoverNote(existing.cover_note || '')
            setLoading(false)
            return
          }
        }
      }

      // Run agent
      setAgentRunning(true)
      const res = await fetch('/api/applications/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: targetJobId }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Agent preparation failed')
      }

      const data: ApplicationDraft = await res.json()
      setDraft(data)
      setCoverNote(data.cover_note || '')
    } catch (err: any) {
      setError(err.message || 'Error preparing application')
    } finally {
      setLoading(false)
      setAgentRunning(false)
    }
  }

  useEffect(() => {
    loadOrRunAgent(false)
  }, [targetJobId])

  // Approve and Send handler (The ONLY way to reach "applied")
  const handleApprove = async () => {
    if (!draft?.application_id) return
    try {
      setLoading(true)
      // Save any pending cover note edits first
      await fetch(`/api/applications/${draft.application_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cover_note: coverNote }),
      })

      const res = await fetch(`/api/applications/${draft.application_id}/approve`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Approval failed')

      setActionSuccess('Application approved and recorded as Applied!')
      setTimeout(() => {
        navigate('/applications')
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Approval failed')
      setLoading(false)
    }
  }

  // Save Draft handler
  const handleSaveDraft = async () => {
    if (!draft?.application_id) return
    try {
      const res = await fetch(`/api/applications/${draft.application_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cover_note: coverNote }),
      })
      if (!res.ok) throw new Error('Save failed')
      setActionSuccess('Draft and cover note saved.')
      setTimeout(() => setActionSuccess(null), 2500)
    } catch (err: any) {
      setError(err.message || 'Failed to save draft')
    }
  }

  // Discard handler
  const handleDiscard = async () => {
    if (!draft?.application_id) {
      navigate('/jobs')
      return
    }
    if (!confirm('Are you sure you want to discard this application draft?')) {
      return
    }
    try {
      const res = await fetch(`/api/applications/${draft.application_id}/discard`, {
        method: 'POST',
      })
      if (res.ok) {
        navigate('/jobs')
      }
    } catch (err: any) {
      setError('Discard failed')
    }
  }

  if (loading && !draft) {
    return (
      <div className="py-24 text-center space-y-4 max-w-md mx-auto">
        <div className="h-1 bg-accent/20 rounded overflow-hidden">
          <div className="h-full bg-accent animate-pulse w-3/4"></div>
        </div>
        <p className="font-serif text-[20px] text-ink">
          Preparing Tailored Application...
        </p>
        <p className="text-[13px] text-muted leading-relaxed">
          The LangGraph orchestrator is checking your verified skills, aligning project focus, and compiling your tailored single-column PDF.
        </p>
      </div>
    )
  }

  if (!draft) {
    return (
      <div className="p-8 text-center space-y-3 bg-surface border border-line rounded-lg">
        <p className="text-[14px] text-muted">No application found for this job.</p>
        <Link to="/jobs" className="text-accent underline text-[13px]">
          Return to Jobs Directory
        </Link>
      </div>
    )
  }

  const { job, master_profile, resume_changes, steps_taken = [] } = draft
  const tailoredSkills = resume_changes?.highlighted_skills || master_profile.skills
  const tailoredProjects = resume_changes?.reordered_projects || master_profile.projects
  const tailoredExp = resume_changes?.reordered_experience || master_profile.experience

  return (
    <div className="space-y-6 pb-28">
      {/* 1. Header & Context */}
      <div className="space-y-3 pb-4 border-b border-line bg-canvas">
        <div className="flex items-center gap-2 text-muted text-[12px]">
          <Link to="/jobs" className="hover:text-ink flex items-center gap-1 font-medium">
            <ArrowLeft size={13} />
            <span>Jobs</span>
          </Link>
          <span>/</span>
          <span className="text-ink font-semibold">{job.company}</span>
          <span>•</span>
          <span className="text-muted">{job.role}</span>
          <span>•</span>
          <span className="font-mono text-[11px]">Draft #{draft.application_id || 'new'}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-serif text-[28px] font-normal text-ink tracking-tight">
                Prepare Application — {job.company}
              </h1>
              <span className="inline-flex items-center gap-1 bg-amber-soft text-amber border border-amber/20 px-2 py-0.5 rounded text-[11px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber"></span>
                {draft.status === 'applied' ? 'Applied' : 'Awaiting Approval'}
              </span>
            </div>
            <p className="text-[13px] text-muted mt-1 flex items-center gap-2">
              <span>{job.role}</span>
              <span>•</span>
              <span>{job.location}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-ink font-medium">
                <Clock size={13} className="text-amber" />
                <span>Closes: {job.closes_on}</span>
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadOrRunAgent(true)}
              disabled={agentRunning}
              className="h-8 px-3 rounded border border-line bg-surface hover:bg-canvas text-ink text-[12px] font-medium flex items-center gap-1.5 disabled:opacity-50"
              title="Re-run LangGraph agent tailoring"
            >
              <RotateCcw size={13} className={agentRunning ? 'animate-spin' : ''} />
              <span>{agentRunning ? 'Tailoring...' : 'Re-run Agent'}</span>
            </button>
            {draft.tailored_resume_path && (
              <a
                href={`/api/files/${draft.tailored_resume_path}`}
                target="_blank"
                rel="noreferrer"
                className="h-8 px-3 rounded bg-accent text-white text-[12px] font-medium hover:opacity-90 flex items-center gap-1.5"
              >
                <Download size={13} />
                <span>Download Tailored PDF</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-accent-soft border border-accent/30 rounded text-[13px] text-accent flex items-center gap-2">
          <CheckCircle size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-soft border border-red/30 rounded text-[13px] text-red flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Collapsible: What the Agent Did (Trace log) */}
      <section className="bg-surface border border-line rounded-lg overflow-hidden">
        <button
          onClick={() => setStepsOpen(!stepsOpen)}
          className="w-full p-3.5 px-4 bg-surface hover:bg-canvas flex items-center justify-between text-left select-none border-b border-line"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent" />
            <span className="text-[13px] font-semibold text-ink">
              What the agent did ({steps_taken.length} automated steps)
            </span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-muted">
            <span>Audit details</span>
            {stepsOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </div>
        </button>

        {stepsOpen && (
          <div className="p-4 bg-canvas/40 divide-y divide-line text-[12px]">
            {steps_taken.length > 0 ? (
              steps_taken.map((s, idx) => (
                <div key={idx} className="py-2 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-muted text-[11px] w-5">#{s.step}</span>
                    <div>
                      <span className="font-mono font-medium text-ink bg-surface border border-line px-1.5 py-0.5 rounded mr-2">
                        {s.tool}
                      </span>
                      <span className="text-ink">{s.summary}</span>
                    </div>
                  </div>
                  <span className="text-accent font-medium text-[11px] uppercase">
                    {s.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted text-[12px]">Agent draft generated.</p>
            )}
          </div>
        )}
      </section>

      {/* 3. Two-Column Diff-Style View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Master Resume (Source of Truth) */}
        <article className="bg-surface border border-line rounded-lg overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 bg-canvas border-b border-line flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-muted" />
              <span className="text-[13px] font-semibold text-ink">
                Master Resume (Profile Source)
              </span>
            </div>
            <span className="text-[11px] text-muted uppercase tracking-wider">
              Truth Base
            </span>
          </div>

          <div className="p-5 space-y-5 text-[13px] divide-y divide-line">
            {/* Candidate Header */}
            <div>
              <h2 className="font-serif text-[18px] text-ink">{master_profile.name}</h2>
              <p className="text-muted text-[12px] mt-0.5">{master_profile.email}</p>
            </div>

            {/* Education */}
            <div className="pt-4 space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-muted font-semibold block">
                Education
              </span>
              <p className="text-ink">{master_profile.education}</p>
            </div>

            {/* Technical Skills */}
            <div className="pt-4 space-y-2">
              <span className="text-[11px] uppercase tracking-wider text-muted font-semibold block">
                Verified Technical Skills
              </span>
              <div className="flex flex-wrap gap-1">
                {master_profile.skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-canvas border border-line text-ink text-[11px]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Projects */}
            <div className="pt-4 space-y-3">
              <span className="text-[11px] uppercase tracking-wider text-muted font-semibold block">
                Master Projects
              </span>
              {master_profile.projects.map((proj, idx) => (
                <div key={idx} className="space-y-1">
                  <h3 className="font-semibold text-ink text-[13px]">{proj.title}</h3>
                  <p className="text-[12px] text-muted font-mono">
                    {proj.technologies?.join(', ')}
                  </p>
                  <p className="text-ink text-[12px] leading-relaxed">{proj.description}</p>
                </div>
              ))}
            </div>

            {/* Experience */}
            <div className="pt-4 space-y-3">
              <span className="text-[11px] uppercase tracking-wider text-muted font-semibold block">
                Work Experience
              </span>
              {master_profile.experience.map((exp, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-ink text-[13px]">{exp.company}</span>
                    <span className="text-[11px] text-muted">{exp.duration}</span>
                  </div>
                  <p className="text-[12px] text-accent font-medium">{exp.role}</p>
                  <p className="text-ink text-[12px] leading-relaxed">{exp.description}</p>
                </div>
              ))}
            </div>
          </div>
        </article>

        {/* Right Column: Tailored for this role */}
        <article className="bg-surface border border-accent/40 rounded-lg overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 bg-accent-soft/60 border-b border-accent/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={15} className="text-accent" />
              <span className="text-[13px] font-semibold text-accent">
                Tailored for {job.company} ({job.role})
              </span>
            </div>
            <span className="text-[11px] bg-surface text-accent font-medium px-2 py-0.5 rounded border border-accent/30">
              Agent Aligned
            </span>
          </div>

          <div className="p-5 space-y-5 text-[13px] divide-y divide-line">
            {/* Candidate Header */}
            <div>
              <h2 className="font-serif text-[18px] text-ink">{master_profile.name}</h2>
              <p className="text-muted text-[12px] mt-0.5">
                Targeting: {job.role} @ {job.company}
              </p>
            </div>

            {/* Education */}
            <div className="pt-4 space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-muted font-semibold block">
                Education
              </span>
              <p className="text-ink">{master_profile.education}</p>
            </div>

            {/* Prioritized Skills with Highlight */}
            <div className="pt-4 space-y-2">
              <span className="text-[11px] uppercase tracking-wider text-muted font-semibold block">
                Prioritized Skills (Aligned to Job Requirements)
              </span>
              <div className="flex flex-wrap gap-1">
                {tailoredSkills.map((s, idx) => {
                  const isMatching = job.required_skills?.some(
                    (req) => req.toLowerCase() === s.toLowerCase()
                  )
                  return (
                    <span
                      key={idx}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        isMatching
                          ? 'bg-accent-soft text-accent border border-accent/40 font-semibold'
                          : 'bg-canvas text-ink border border-line'
                      }`}
                    >
                      {s} {isMatching && '✓'}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Reordered Projects with Accent Border */}
            <div className="pt-4 space-y-3">
              <span className="text-[11px] uppercase tracking-wider text-muted font-semibold block">
                Reordered & Emphasized Projects
              </span>
              {tailoredProjects.map((proj, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded bg-accent-soft/30 border-l-2 border-l-accent space-y-1"
                >
                  <h3 className="font-semibold text-ink text-[13px]">{proj.title}</h3>
                  <p className="text-[11px] text-accent font-mono font-medium">
                    {proj.technologies?.join(' • ')}
                  </p>
                  <p className="text-ink text-[12px] leading-relaxed">{proj.description}</p>
                </div>
              ))}
            </div>

            {/* Reordered Experience */}
            <div className="pt-4 space-y-3">
              <span className="text-[11px] uppercase tracking-wider text-muted font-semibold block">
                Experience
              </span>
              {tailoredExp.map((exp, idx) => (
                <div key={idx} className="p-2.5 rounded bg-accent-soft/20 border-l-2 border-l-accent space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-ink text-[13px]">{exp.company}</span>
                    <span className="text-[11px] text-muted">{exp.duration}</span>
                  </div>
                  <p className="text-[12px] text-accent font-medium">{exp.role}</p>
                  <p className="text-ink text-[12px] leading-relaxed">{exp.description}</p>
                </div>
              ))}
            </div>
          </div>
        </article>
      </div>

      {/* 4. Recruiter Note / Cover Message Textarea */}
      <section className="bg-surface border border-line rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-line">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">
              Recruiter Note / Cover Message
            </h2>
            <p className="text-[12px] text-muted">
              Plaintext introductory note sent with your tailored application bundle
            </p>
          </div>
          <span className="text-[11px] text-muted font-mono">
            {coverNote.length} characters • under 250 words
          </span>
        </div>

        <textarea
          rows={6}
          value={coverNote}
          onChange={(e) => setCoverNote(e.target.value)}
          placeholder="Write a concise note to the hiring team..."
          className="w-full p-3 rounded border border-line bg-canvas text-ink text-[13px] leading-relaxed focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </section>

      {/* 5. Automated Truth Guard Box */}
      <section className="bg-surface border border-line rounded-lg p-4 text-[12px] text-muted flex items-start gap-3">
        <Lock size={16} className="text-accent mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <p className="font-medium text-ink">Automated Truth Guard Active</p>
          <p>
            Only facts from your verified profile are used. The LangGraph agent verified that every listed skill, project, and employer matches your profile record before generating this application draft.
          </p>
        </div>
      </section>

      {/* 6. STICKY BOTTOM ACTION BAR (Mandatory) */}
      <footer className="fixed bottom-0 left-52 right-0 z-30 bg-surface border-t border-line px-8 py-3">
        <div className="max-w-[1120px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left Guarantee & Disclaimer */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-canvas border border-line text-ink text-[12px] font-medium">
              <Lock size={13} className="text-accent" />
              <span>Nothing is sent until you approve.</span>
            </span>
            <span className="hidden md:inline text-[12px] text-muted">
              Only facts from your profile are used.
            </span>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleDiscard}
              className="h-9 px-3 rounded border border-line bg-surface hover:bg-canvas text-red text-[13px] font-medium transition-colors"
            >
              Discard
            </button>
            <button
              onClick={handleSaveDraft}
              className="h-9 px-3.5 border border-line rounded bg-surface hover:bg-canvas text-ink text-[13px] font-medium transition-colors"
            >
              Save draft
            </button>
            <button
              onClick={handleApprove}
              disabled={draft.status === 'applied'}
              className="h-9 px-4 rounded bg-accent hover:opacity-90 text-white text-[13px] font-medium flex items-center gap-1.5 transition-opacity disabled:opacity-50"
            >
              <Send size={14} />
              <span>{draft.status === 'applied' ? 'Approved & Sent' : 'Approve and send'}</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
