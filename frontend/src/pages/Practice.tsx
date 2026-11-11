import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Mic,
  MicOff,
  Info,
  Send,
  Loader2,
  RotateCcw,
  Timer,
  CircleStop,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Target,
} from 'lucide-react'
import { TopBar } from '../components/TopBar'

interface WeakArea {
  id: number
  skill: string
  last_score: number
  times_seen: number
}

interface Evaluation {
  score_1_to_5: number
  feedback: string
  skill_tag: string
}

interface CurrentQuestion {
  turn_id: number
  question: string
  skill_tag: string
}

const SUGGESTED_ROLES = [
  'Data Analyst',
  'Backend Engineer Intern',
  'Frontend Engineer',
  'ML Engineer',
  'Product Analyst',
]

const competencyLabel = (score: number) =>
  score >= 5 ? 'Strong' : score === 4 ? 'Solid' : score === 3 ? 'Adequate' : 'Needs work'

const competencyStyle = (score: number) =>
  score >= 4
    ? 'bg-accent-soft text-accent border-accent/20'
    : score === 3
    ? 'bg-canvas text-ink border-line'
    : 'bg-amber-soft text-amber border-amber/30'

export const PracticePage: React.FC = () => {
  const [role, setRole] = useState('')
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [current, setCurrent] = useState<CurrentQuestion | null>(null)
  const [answer, setAnswer] = useState('')
  const [feedbackLog, setFeedbackLog] = useState<Evaluation[]>([])
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([])
  const [voiceOn, setVoiceOn] = useState(false)
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const timerRef = useRef<number | null>(null)

  const fetchMemory = useCallback(async () => {
    try {
      const res = await fetch('/api/practice/memory')
      if (res.ok) setWeakAreas(await res.json())
    } catch {
      // memory panel is non-critical; ignore fetch errors here
    }
  }, [])

  useEffect(() => {
    fetchMemory()
  }, [fetchMemory])

  // Elapsed session timer
  useEffect(() => {
    if (sessionId != null) {
      timerRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000)
    } else if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [sessionId])

  const fmtElapsed = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')} elapsed`

  const startSession = async (roleName: string) => {
    if (!roleName.trim() || starting) return
    setError(null)
    setStarting(true)
    try {
      const res = await fetch('/api/practice/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: roleName.trim() }),
      })
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}))
        throw new Error(detail.detail || 'Could not start the session')
      }
      const session = await res.json()
      const turns = session.turns || []
      const last = turns[turns.length - 1]
      setSessionId(session.id)
      setCurrent(last ? { turn_id: last.id, question: last.question, skill_tag: last.skill_tag } : null)
      setFeedbackLog([])
      setAnswer('')
      setElapsed(0)
      setExpandedIdx(null)
    } catch (err: any) {
      setError(err.message || 'Error starting the session')
    } finally {
      setStarting(false)
    }
  }

  const submitAnswer = async () => {
    if (!sessionId || !answer.trim() || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/practice/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, answer: answer.trim() }),
      })
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}))
        throw new Error(detail.detail || 'Evaluation failed')
      }
      const data = await res.json()
      if (data.evaluation) {
        setFeedbackLog((log) => [data.evaluation, ...log])
      }
      setCurrent(data.next_question)
      setAnswer('')
      fetchMemory()
    } catch (err: any) {
      setError(err.message || 'Error submitting the answer')
    } finally {
      setSubmitting(false)
    }
  }

  const endSession = () => {
    setSessionId(null)
    setCurrent(null)
    setAnswer('')
    setFeedbackLog([])
    setElapsed(0)
  }

  const weakest = weakAreas.length > 0 ? weakAreas[0] : null
  const practiceIndex =
    weakAreas.length > 0
      ? Math.round((weakAreas.reduce((sum, w) => sum + w.last_score, 0) / weakAreas.length / 5) * 100)
      : null
  const questionNo = feedbackLog.length + 1
  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0

  return (
    <div className="space-y-6">
      <TopBar />

      {/* Live session bar */}
      {sessionId != null && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-surface border border-line rounded-lg">
          <div className="flex items-center gap-3 text-[12px]">
            <span className="flex items-center gap-1.5 font-medium text-ink">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
              Live Session #{sessionId} • {role || 'Mock interview'} prep
            </span>
            <span className="text-muted tabular-nums flex items-center gap-1">
              <Timer size={12} />
              {fmtElapsed(elapsed)}
            </span>
          </div>
          <button
            onClick={endSession}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-red border border-red/30 rounded hover:bg-red-soft transition-colors"
          >
            <CircleStop size={13} />
            End Session
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-[28px] font-normal text-ink tracking-tight">
              Practice: Mock Interview
            </h1>
            {sessionId != null && (
              <span className="text-[11px] bg-accent-soft text-accent border border-accent/20 px-2 py-0.5 rounded font-medium">
                {questionNo === 1 ? 'Module 1' : `${feedbackLog.length} answered`}
              </span>
            )}
          </div>
          <p className="text-[13px] text-muted mt-1">
            Mock interview questions that remember your weak areas across sessions
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-soft border border-red/30 rounded text-[13px] text-red">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: interview loop */}
        <div className="lg:col-span-8 space-y-4">
          {!sessionId ? (
            <div className="bg-surface border border-line rounded-lg p-6">
              <h2 className="text-[14px] font-medium text-ink">Pick a role to practice</h2>
              <p className="text-[12px] text-muted mt-1">
                Questions target the role and the skills you scored lowest on.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {SUGGESTED_ROLES.map((r) => (
                  <button
                    key={r}
                    onClick={() => startSession(r)}
                    disabled={starting}
                    className="px-3 py-1.5 text-[13px] border border-line rounded text-ink hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && startSession(role)}
                  placeholder="Or type any role, e.g. Android Developer"
                  className="flex-1 px-3 py-2 text-[13px] border border-line rounded bg-surface text-ink placeholder:text-muted/60 focus:outline-none focus:border-accent"
                />
                <button
                  onClick={() => startSession(role)}
                  disabled={starting || !role.trim()}
                  className="px-4 py-2 text-[13px] font-medium bg-accent text-white rounded hover:opacity-90 disabled:opacity-40"
                >
                  {starting ? 'Starting...' : 'Start session'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Completed question history (accordions) */}
              {feedbackLog.length > 0 && (
                <div className="bg-surface border border-line rounded-lg divide-y divide-line">
                  {[...feedbackLog].reverse().map((f, i) => {
                    const isOpen = expandedIdx === i
                    return (
                      <div key={i}>
                        <button
                          onClick={() => setExpandedIdx(isOpen ? null : i)}
                          className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-canvas transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <CheckCircle size={15} className="text-accent shrink-0" />
                            <span className="text-[12px] font-medium text-ink">
                              Q{i + 1} • {f.skill_tag}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${competencyStyle(
                                f.score_1_to_5
                              )}`}
                            >
                              {competencyLabel(f.score_1_to_5)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-muted">
                            <span className="text-[12px] tabular-nums">{f.score_1_to_5}/5</span>
                            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </div>
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-4 pl-11">
                            <p className="text-[12.5px] text-muted leading-relaxed">{f.feedback}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Current question */}
              <div className="bg-surface border border-line rounded-lg">
                <div className="px-6 py-3 border-b border-line flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                    Question {questionNo} • {current?.skill_tag || 'Interview'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-canvas border border-line text-[10px] font-mono text-ink">
                    {current?.skill_tag || 'General'}
                  </span>
                </div>

                <div className="p-6 space-y-5">
                  {current ? (
                    <>
                      {/* Interviewer prompt card */}
                      <div className="border border-line rounded-lg overflow-hidden">
                        <div className="px-4 py-2 bg-canvas border-b border-line flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                          <span className="text-[11px] font-medium text-muted">
                            Interviewer Prompt — Simulated Engineering Lead
                          </span>
                        </div>
                        <div className="px-4 py-4">
                          <p className="font-serif italic text-[16px] leading-relaxed text-ink">
                            {current.question}
                          </p>
                        </div>
                      </div>

                      {/* Answer input */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1 text-[11px]">
                            <button
                              className="px-2 py-1 rounded border border-accent/30 bg-accent-soft text-accent font-medium"
                            >
                              Text &amp; Code
                            </button>
                            <button
                              onClick={() => setVoiceOn(!voiceOn)}
                              disabled
                              title="Coming soon"
                              className="px-2 py-1 rounded border border-line text-muted opacity-60 cursor-not-allowed inline-flex items-center gap-1"
                            >
                              {voiceOn ? <Mic size={11} /> : <MicOff size={11} />}
                              Voice Mode
                            </button>
                          </div>
                          <span className="text-[10px] text-muted">
                            Voice input off • text answers only
                          </span>
                        </div>
                        <textarea
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          placeholder="Structure your answer, then add code or examples..."
                          rows={7}
                          className="w-full px-3 py-2.5 text-[13px] leading-relaxed border border-line rounded bg-surface text-ink placeholder:text-muted/60 focus:outline-none focus:border-accent resize-y font-mono"
                        />
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[11px] text-muted tabular-nums">
                            {wordCount} words • {answer.length} characters
                          </span>
                          <button
                            onClick={submitAnswer}
                            disabled={submitting || !answer.trim()}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium bg-accent text-white rounded hover:opacity-90 disabled:opacity-40"
                          >
                            {submitting ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Evaluating...
                              </>
                            ) : (
                              <>
                                <Send size={14} />
                                Submit answer
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-[13px] text-muted">Loading question...</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right column: session diagnosis + memory */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-surface border border-line rounded-lg p-5">
            <div className="pb-2 border-b border-line">
              <h3 className="text-[13px] font-semibold text-ink">Session Feedback &amp; Diagnosis</h3>
              <p className="text-[11px] text-muted mt-0.5">
                Evaluated against fresher engineering benchmarks
              </p>
            </div>

            {feedbackLog.length === 0 ? (
              <p className="text-[13px] text-muted mt-3">
                {sessionId
                  ? 'Submit an answer and assessed competencies will appear here.'
                  : 'Start a session to get scored feedback per skill.'}
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {feedbackLog.slice(0, 4).map((f, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-medium text-ink">{f.skill_tag}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${competencyStyle(
                          f.score_1_to_5
                        )}`}
                      >
                        {competencyLabel(f.score_1_to_5)}
                      </span>
                    </div>
                    <p className="text-[12px] text-muted leading-relaxed">{f.feedback}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-surface border border-line rounded-lg p-5">
            <h3 className="text-[12px] font-medium uppercase tracking-wide text-muted">
              Next session will focus on
            </h3>
            {weakest ? (
              <p className="text-[13px] text-ink mt-2">
                <span className="text-accent font-medium">{weakest.skill}</span>
                <span className="text-muted">
                  {' '}
                  — last scored {weakest.last_score}/5 across {weakest.times_seen} answer
                  {weakest.times_seen === 1 ? '' : 's'}
                </span>
              </p>
            ) : (
              <p className="text-[13px] text-muted mt-2">No weak areas recorded yet.</p>
            )}
          </div>

          {/* Drive targeting ledger */}
          <div className="bg-surface border border-line rounded-lg p-5">
            <div className="flex items-center gap-1.5 pb-2 border-b border-line">
              <Target size={13} className="text-accent" />
              <h3 className="text-[12px] font-medium uppercase tracking-wide text-muted">
                Practice Index
              </h3>
            </div>
            {practiceIndex != null ? (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted">Current index</span>
                  <span className="font-semibold text-ink tabular-nums">{practiceIndex}/100</span>
                </div>
                <div className="h-1.5 bg-canvas border border-line rounded-full overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${practiceIndex}%` }}></div>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  Based on {weakAreas.length} tracked weak spot{weakAreas.length === 1 ? '' : 's'} across your
                  past mocks.
                </p>
              </div>
            ) : (
              <p className="text-[12px] text-muted mt-3">
                Complete a mock to build your practice index.
              </p>
            )}
          </div>

          <div className="bg-surface border border-line rounded-lg p-5">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[12px] font-medium uppercase tracking-wide text-muted">
                Weak area memory
              </h3>
              <Info size={12} className="text-muted" />
            </div>
            {weakAreas.length === 0 ? (
              <p className="text-[13px] text-muted mt-3">
                Skills you score lowest on will be tracked here and revisited in later sessions.
              </p>
            ) : (
              <div className="mt-3 space-y-2.5">
                {weakAreas.map((w) => (
                  <div key={w.id} className="flex items-center justify-between">
                    <span className="text-[13px] text-ink">{w.skill}</span>
                    <span className="text-[12px] tabular-nums text-muted">
                      {w.last_score}/5 · seen {w.times_seen}×
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
