import React, { useState, useEffect, useRef } from 'react'
import {
  Upload,
  Download,
  RotateCw,
  Edit2,
  CheckCircle,
  FileText,
  AlertCircle,
  Plus,
  Trash2,
  X,
  Check
} from 'lucide-react'

interface ProjectItem {
  title: string
  description?: string
  technologies: string[]
  link?: string
}

interface ExperienceItem {
  company: string
  role: string
  duration?: string
  description?: string
}

interface ProfileData {
  id: number
  name: string | null
  email: string | null
  education: string | null
  skills: string[]
  projects: ProjectItem[]
  experience: ExperienceItem[]
  target_roles: string[]
  preferences: {
    preferred_locations?: string[]
    job_types?: string[]
    [key: string]: any
  }
  resume_filename: string | null
  parsed_at: string | null
}

export const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [parsing, setParsing] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [editSection, setEditSection] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<ProfileData>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/profile')
      if (res.status === 404) {
        setProfile(null)
      } else if (res.ok) {
        const data = await res.json()
        setProfile(data)
        setFormData(data)
      } else {
        throw new Error('Failed to load profile')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error loading profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a PDF resume file.')
      return
    }

    try {
      setParsing(true)
      setErrorMessage(null)
      const data = new FormData()
      data.append('file', file)

      const res = await fetch('/api/profile/upload', {
        method: 'POST',
        body: data,
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Resume parsing failed')
      }

      const updated = await res.json()
      setProfile(updated)
      setFormData(updated)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload and parse resume')
    } finally {
      setParsing(false)
    }
  }

  const handleSaveSection = async () => {
    try {
      setErrorMessage(null)
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        throw new Error('Failed to update profile')
      }

      const updated = await res.json()
      setProfile(updated)
      setEditSection(null)
    } catch (err: any) {
      setErrorMessage(err.message || 'Save failed')
    }
  }

  const formatParsedDate = (isoStr: string | null) => {
    if (!isoStr) return 'Never'
    const date = new Date(isoStr)
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <p className="text-[14px] text-muted">Loading profile ledger...</p>
      </div>
    )
  }

  // 1. Onboarding view if no profile exists
  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-serif text-[28px] font-normal text-ink tracking-tight">
            Upload Your Resume
          </h1>
          <p className="text-[14px] text-muted">
            CareerPilot parses your resume into a structured profile, matches you with 40+ curated fresher jobs, and writes tailored applications.
          </p>
        </div>

        {parsing && (
          <div className="bg-surface border border-line rounded-lg p-4 text-center space-y-2">
            <div className="h-1 bg-accent/20 rounded overflow-hidden">
              <div className="h-full bg-accent animate-pulse w-3/4"></div>
            </div>
            <p className="text-[13px] text-accent font-medium">
              Reading your resume and extracting verified skills via PyMuPDF...
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-soft border border-red/30 rounded text-[13px] text-red flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            if (e.dataTransfer.files?.[0]) {
              handleFileUpload(e.dataTransfer.files[0])
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-line hover:border-accent/60 bg-surface rounded-lg p-10 text-center cursor-pointer transition-colors space-y-3"
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFileUpload(e.target.files[0])
              }
            }}
          />
          <div className="w-12 h-12 rounded-full bg-accent-soft mx-auto flex items-center justify-center text-accent">
            <Upload size={22} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-ink">
              Drop your resume PDF here or click to browse
            </p>
            <p className="text-[12px] text-muted mt-1">
              Supports single or multi-page PDF resumes up to 10MB
            </p>
          </div>
          <button
            type="button"
            className="h-9 px-4 rounded bg-accent text-white text-[13px] font-medium hover:opacity-90 inline-flex items-center gap-2"
          >
            Select PDF File
          </button>
        </div>

        <div className="bg-surface border border-line rounded-lg p-4 flex items-center justify-between text-[13px]">
          <div>
            <p className="font-medium text-ink">Want to test with sample data?</p>
            <p className="text-muted text-[12px]">
              Use our pre-generated sample resume for Ananya Sharma (B.Tech CSE).
            </p>
          </div>
          <button
            onClick={async () => {
              try {
                setParsing(true)
                const res = await fetch('/api/files/sample_resume.pdf')
                const blob = await res.blob()
                const file = new File([blob], 'sample_resume.pdf', { type: 'application/pdf' })
                await handleFileUpload(file)
              } catch (e) {
                alert('Could not load sample resume.')
                setParsing(false)
              }
            }}
            className="h-8 px-3 rounded border border-line bg-surface hover:bg-canvas text-ink text-[12px] font-medium"
          >
            Load Sample Resume
          </button>
        </div>
      </div>
    )
  }

  // 2. Parsed Profile View (Matching Sneha's UI layout)
  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2 text-muted text-[12px] mb-1">
            <span>CareerPilot Ledger</span>
            <span>›</span>
            <span>Candidate Profile</span>
            <span>›</span>
            <span className="text-ink font-medium">{profile.name || 'Candidate'}</span>
          </div>
          <h1 className="font-serif text-[28px] font-normal text-ink tracking-tight">
            Profile & Master Resume
          </h1>
          <p className="text-[13px] text-muted mt-1">
            Verifiable source of truth for all campus applications and automated tailoring.
          </p>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFileUpload(e.target.files[0])
              }
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={parsing}
            className="h-9 px-3.5 flex items-center gap-2 rounded bg-accent text-white text-[13px] font-medium hover:opacity-90 disabled:opacity-50"
          >
            <Upload size={15} strokeWidth={1.5} />
            <span>Upload New Resume (.pdf)</span>
          </button>
        </div>
      </div>

      {/* Parsing progress banner */}
      {parsing && (
        <div className="bg-surface border border-accent/30 rounded-lg p-3 space-y-2">
          <div className="h-1 bg-accent/20 rounded overflow-hidden">
            <div className="h-full bg-accent animate-pulse w-3/4"></div>
          </div>
          <p className="text-[13px] text-accent font-medium">
            Reading your resume and updating candidate ledger via PyMuPDF...
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-soft border border-red/30 rounded text-[13px] text-red flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Parsed timestamp banner */}
      <div className="flex items-center justify-between text-[12px] text-muted bg-surface border border-line rounded px-3 py-2">
        <div className="flex items-center gap-2">
          <FileText size={15} className="text-muted" />
          <span>
            Last parsed from{' '}
            <code className="bg-canvas px-1.5 py-0.5 rounded text-ink border border-line font-mono text-[11px]">
              {profile.resume_filename || 'resume.pdf'}
            </code>{' '}
            · {formatParsedDate(profile.parsed_at)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {profile.resume_filename && (
            <a
              href={`/api/files/${profile.resume_filename}`}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline inline-flex items-center gap-1"
            >
              <Download size={13} />
              <span>Download original PDF</span>
            </a>
          )}
          <span>·</span>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-muted hover:text-ink inline-flex items-center gap-1"
          >
            <RotateCw size={13} />
            <span>Re-parse</span>
          </button>
        </div>
      </div>

      {/* Main 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Personal, Education, Skills, Experience, Projects */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Personal & Contact Details */}
          <section className="bg-surface border border-line rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-3 bg-accent rounded-xs"></span>
                <h2 className="text-[15px] font-semibold text-ink">Personal & Academic Details</h2>
              </div>
              <button
                onClick={() => setEditSection(editSection === 'personal' ? null : 'personal')}
                className="text-[12px] text-accent hover:underline flex items-center gap-1 font-medium"
              >
                <Edit2 size={13} />
                <span>{editSection === 'personal' ? 'Cancel' : 'Edit'}</span>
              </button>
            </div>

            {editSection === 'personal' ? (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-muted block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full h-9 px-3 rounded border border-line bg-surface text-ink text-[13px] focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted block mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full h-9 px-3 rounded border border-line bg-surface text-ink text-[13px] focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={handleSaveSection}
                    className="h-8 px-3 rounded bg-accent text-white text-[12px] font-medium hover:opacity-90 flex items-center gap-1"
                  >
                    <Check size={14} />
                    <span>Save</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-[13px]">
                <div>
                  <span className="text-[11px] text-muted block uppercase tracking-wider">Full Name</span>
                  <p className="mt-1 font-semibold text-ink">{profile.name || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-[11px] text-muted block uppercase tracking-wider">Email Address</span>
                  <p className="mt-1 text-ink">{profile.email || 'Not provided'}</p>
                </div>
                <div className="md:col-span-2">
                  <span className="text-[11px] text-muted block uppercase tracking-wider">Status</span>
                  <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-accent-soft text-accent text-[12px] font-medium">
                    <CheckCircle size={14} />
                    <span>Verified candidate profile</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 2. Education */}
          <section className="bg-surface border border-line rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-3 bg-accent rounded-xs"></span>
                <h2 className="text-[15px] font-semibold text-ink">Education</h2>
              </div>
              <button
                onClick={() => setEditSection(editSection === 'education' ? null : 'education')}
                className="text-[12px] text-accent hover:underline flex items-center gap-1 font-medium"
              >
                <Edit2 size={13} />
                <span>{editSection === 'education' ? 'Cancel' : 'Edit'}</span>
              </button>
            </div>

            {editSection === 'education' ? (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-[11px] text-muted block mb-1">Education Summary</label>
                  <textarea
                    rows={3}
                    value={formData.education || ''}
                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                    className="w-full p-2.5 rounded border border-line bg-surface text-ink text-[13px] focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={handleSaveSection}
                    className="h-8 px-3 rounded bg-accent text-white text-[12px] font-medium hover:opacity-90 flex items-center gap-1"
                  >
                    <Check size={14} />
                    <span>Save</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-[13px]">
                <p className="font-medium text-ink leading-relaxed">
                  {profile.education || 'No education recorded.'}
                </p>
              </div>
            )}
          </section>

          {/* 3. Skills */}
          <section className="bg-surface border border-line rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-accent rounded-xs"></span>
                  <h2 className="text-[15px] font-semibold text-ink">Technical Skills</h2>
                </div>
                <p className="text-[12px] text-muted mt-0.5">
                  Verified competencies parsed from projects and coursework
                </p>
              </div>
              <button
                onClick={() => setEditSection(editSection === 'skills' ? null : 'skills')}
                className="text-[12px] text-accent hover:underline flex items-center gap-1 font-medium"
              >
                <Edit2 size={13} />
                <span>{editSection === 'skills' ? 'Cancel' : 'Edit'}</span>
              </button>
            </div>

            {editSection === 'skills' ? (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-[11px] text-muted block mb-1">Comma-separated skills</label>
                  <input
                    type="text"
                    value={(formData.skills || []).join(', ')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        skills: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    className="w-full h-9 px-3 rounded border border-line bg-surface text-ink text-[13px] focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={handleSaveSection}
                    className="h-8 px-3 rounded bg-accent text-white text-[12px] font-medium hover:opacity-90 flex items-center gap-1"
                  >
                    <Check size={14} />
                    <span>Save</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {profile.skills.length > 0 ? (
                  profile.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-canvas border border-line rounded text-ink text-[12px] font-medium"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-muted text-[13px]">No skills extracted.</span>
                )}
              </div>
            )}
          </section>

          {/* 4. Experience */}
          <section className="bg-surface border border-line rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-3 bg-accent rounded-xs"></span>
                <h2 className="text-[15px] font-semibold text-ink">Experience & Internships</h2>
              </div>
              <button
                onClick={() => setEditSection(editSection === 'experience' ? null : 'experience')}
                className="text-[12px] text-accent hover:underline flex items-center gap-1 font-medium"
              >
                <Edit2 size={13} />
                <span>{editSection === 'experience' ? 'Cancel' : 'Edit'}</span>
              </button>
            </div>

            {profile.experience.length > 0 ? (
              <div className="mt-4 divide-y divide-line">
                {profile.experience.map((exp, idx) => (
                  <div key={idx} className={idx > 0 ? 'pt-4 mt-4' : ''}>
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-[14px] font-semibold text-ink">{exp.company}</h3>
                      <span className="text-[12px] text-muted tabular-nums">{exp.duration}</span>
                    </div>
                    <p className="text-[13px] text-accent font-medium mt-0.5">{exp.role}</p>
                    {exp.description && (
                      <p className="text-[13px] text-ink mt-2 leading-relaxed">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-[13px] text-muted">No prior internships listed.</p>
            )}
          </section>

          {/* 5. Projects */}
          <section className="bg-surface border border-line rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-3 bg-accent rounded-xs"></span>
                <h2 className="text-[15px] font-semibold text-ink">Projects</h2>
              </div>
              <button
                onClick={() => setEditSection(editSection === 'projects' ? null : 'projects')}
                className="text-[12px] text-accent hover:underline flex items-center gap-1 font-medium"
              >
                <Edit2 size={13} />
                <span>{editSection === 'projects' ? 'Cancel' : 'Edit'}</span>
              </button>
            </div>

            {profile.projects.length > 0 ? (
              <div className="mt-4 divide-y divide-line">
                {profile.projects.map((proj, idx) => (
                  <div key={idx} className={idx > 0 ? 'pt-4 mt-4' : ''}>
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-[14px] font-semibold text-ink">{proj.title}</h3>
                      {proj.link && (
                        <a
                          href={proj.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[12px] text-accent hover:underline"
                        >
                          View repo
                        </a>
                      )}
                    </div>
                    {proj.technologies && proj.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {proj.technologies.map((t, tidx) => (
                          <span
                            key={tidx}
                            className="px-2 py-0.5 bg-canvas border border-line rounded text-[11px] text-muted font-mono"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    {proj.description && (
                      <p className="text-[13px] text-ink mt-2 leading-relaxed">
                        {proj.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-[13px] text-muted">No projects recorded.</p>
            )}
          </section>
        </div>

        {/* Right Rail (4 cols): Target Roles & Preferences */}
        <div className="lg:col-span-4 space-y-6">
          {/* Target Roles Card */}
          <div className="bg-surface border border-line rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <h2 className="text-[15px] font-semibold text-ink">Target Roles</h2>
              <span className="text-[11px] px-2 py-0.5 rounded bg-accent-soft text-accent font-medium">
                Active
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] text-muted uppercase tracking-wider block">
                Target Positions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {profile.target_roles.map((role, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded bg-canvas border border-line text-ink text-[12px] font-medium"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-line space-y-2">
              <span className="text-[11px] text-muted uppercase tracking-wider block">
                Preferred Locations
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(profile.preferences?.preferred_locations || ['Bengaluru', 'Remote']).map(
                  (loc, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-surface border border-line text-muted text-[11px]"
                    >
                      {loc}
                    </span>
                  )
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-line space-y-2">
              <span className="text-[11px] text-muted uppercase tracking-wider block">
                Job Types
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(profile.preferences?.job_types || ['internship', 'full-time']).map(
                  (jt, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-surface border border-line text-muted text-[11px] capitalize"
                    >
                      {jt}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Master Resume Ledger Card */}
          <div className="bg-surface border border-line rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <h2 className="text-[15px] font-semibold text-ink">Resume Artifacts</h2>
              <span className="text-[11px] text-muted font-mono">1 master</span>
            </div>
            <div className="p-3 bg-canvas border border-line rounded flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={18} className="text-accent shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink truncate">
                    {profile.resume_filename || 'master_resume.pdf'}
                  </p>
                  <p className="text-[11px] text-muted">Original verified source</p>
                </div>
              </div>
              {profile.resume_filename && (
                <a
                  href={`/api/files/${profile.resume_filename}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-muted hover:text-ink"
                  title="Download file"
                >
                  <Download size={15} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
