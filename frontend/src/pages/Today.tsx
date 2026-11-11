import React from 'react'

export const TodayPage: React.FC = () => {
  const todayFormatted = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date())

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-baseline justify-between border-b border-line pb-4">
        <div>
          <h1 className="font-serif text-[28px] font-normal text-ink tracking-tight">
            {todayFormatted}
          </h1>
          <p className="text-[13px] text-muted mt-1">
            Overview of application deadlines and pending recruitment actions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Needs your attention */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-ink">Needs your attention</h2>
            <span className="text-[12px] text-muted">Active items</span>
          </div>

          <div className="bg-surface border border-line rounded-lg divide-y divide-line">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[14px] font-medium text-ink">Review tailored application</p>
                <p className="text-[12px] text-muted">Backend Intern @ Razorpay • Closes in 2 days</p>
              </div>
              <button className="h-8 px-3 rounded bg-accent text-white text-[12px] font-medium hover:opacity-90">
                Review draft
              </button>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[14px] font-medium text-ink">Practice interview weak spot</p>
                <p className="text-[12px] text-muted">Last scored 2/5 on System Design: Indexing & Sharding</p>
              </div>
              <button className="h-8 px-3 rounded border border-line bg-surface text-ink text-[12px] font-medium hover:bg-canvas">
                Start session
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: This week stats */}
        <div className="space-y-4">
          <h2 className="text-[15px] font-semibold text-ink">This week</h2>
          <div className="bg-surface border border-line rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-canvas rounded">
                <span className="block text-[20px] font-semibold text-ink tabular-nums">4</span>
                <span className="text-[11px] text-muted">Applied</span>
              </div>
              <div className="p-2 bg-canvas rounded">
                <span className="block text-[20px] font-semibold text-ink tabular-nums">1</span>
                <span className="text-[11px] text-muted">Interviews</span>
              </div>
              <div className="p-2 bg-canvas rounded">
                <span className="block text-[20px] font-semibold text-ink tabular-nums">7</span>
                <span className="text-[11px] text-muted">Saved</span>
              </div>
            </div>

            <div className="pt-2 border-t border-line">
              <span className="text-[12px] font-medium text-muted block mb-2">Upcoming deadlines</span>
              <div className="flex justify-between items-center text-[12px] tabular-nums">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <span className="text-muted">{d}</span>
                    <span className={`w-2 h-2 rounded-full ${i === 2 || i === 4 ? 'bg-amber' : 'bg-line'}`}></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
