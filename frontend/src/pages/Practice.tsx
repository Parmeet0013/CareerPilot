import React, { useState, useEffect, useCallback } from 'react'
import { Mic, MicOff, Info, Send, Loader2, RotateCcw } from 'lucide-react'

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
  }

  const weakest = weakAreas.length > 0 ? weakAreas[0] : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-line pb-4">
        <div>
          <h1 className="font-serif text-[28px] font-normal text-ink tracking-tight">Practice</h1>
          <p className="text-[13px] text-muted mt-1">
            Mock interview questions that remember your weak areas across sessions
          </p>
        </div>
        {sessionId && (
          <button
            onClick={endSession}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-muted border border-line rounded hover:bg-canvas"
          >
            <RotateCcw size={13} />
            End session
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-soft border border-red/30 rounded text-[13px] text-red">
          {error}
        </div>
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
            <div className="bg-surface border border-line rounded-lg">
              <div className="flex items-center justify-between px-6 py-3 border-b border-line">
                <span className="text-[11px] font-medium uppercase tracking-wide text-accent">
                  {current?.skill_tag || 'Question'}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-muted" title={voiceOn ? 'Voice answers are coming soon' : 'Voice answers are coming soon'}>
                    {voiceOn ? 'Voice mode' : 'Text mode'}
                  </span>
                  <button
                    onClick={() => setVoiceOn(!voiceOn)}
                    disabled
                    title="Coming soon"
                    className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] border border-line rounded text-muted opacity-60 cursor-not-allowed"
                  >
                    {voiceOn ? <Mic size={13} /> : <MicOff size={13} />}
                    Voice
                  </button>
                </div>
              </div>
              <div className="p-6">
                {current ? (
                  <>
                    <p className="text-[15px] leading-relaxed text-ink">{current.question}</p>
                    <textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Type your answer..."
                      rows={7}
                      className="w-full mt-5 px-3 py-2.5 text-[13px] leading-relaxed border border-line rounded bg-surface text-ink placeholder:text-muted/60 focus:outline-none focus:border-accent resize-y"
                    />
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[11px] text-muted">
                        {answer.trim().length} characters
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
                  </>
                ) : (
                  <p className="text-[13px] text-muted">Loading question...</p>
                )}
              </div>
            </div>
          )}

          {/* This session's feedback history */}
          {sessionId && feedbackLog.length > 0 && (
            <div className="bg-surface border border-line rounded-lg">
              <div className="px-6 py-3 border-b border-line">
                <h3 className="text-[12px] font-medium uppercase tracking-wide text-muted">
                  Answers this session
                </h3>
              </div>
              <div className="divide-y divide-line">
                {feedbackLog.map((f, i) => (
                  <div key={i} className="px-6 py-3 flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[12px] font-medium text-ink">{f.skill_tag}</span>
                      <p className="text-[12px] text-muted mt-0.5">{f.feedback}</p>
                    </div>
                    <span className="text-[13px] tabular-nums text-ink shrink-0">
                      {f.score_1_to_5}<span className="text-muted">/5</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: feedback + memory */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-surface border border-line rounded-lg p-5">
            <h3 className="text-[12px] font-medium uppercase tracking-wide text-muted">Feedback</h3>
            {feedbackLog.length === 0 ? (
              <p className="text-[13px] text-muted mt-3">
                {sessionId
                  ? 'Submit an answer and the feedback will appear here.'
                  : 'Start a session to get scored feedback per skill.'}
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {feedbackLog.slice(0, 5).map((f, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-medium text-ink">{f.skill_tag}</span>
                      <span className="text-[12px] tabular-nums text-ink">
                        {f.score_1_to_5}<span className="text-muted">/5</span>
                      </span>
                    </div>
                    <p className="text-[12px] text-muted mt-0.5 leading-relaxed">{f.feedback}</p>
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
                <span className="text-muted"> — last scored {weakest.last_score}/5 across {weakest.times_seen} answer{weakest.times_seen === 1 ? '' : 's'}</span>
              </p>
            ) : (
              <p className="text-[13px] text-muted mt-2">No weak areas recorded yet.</p>
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
