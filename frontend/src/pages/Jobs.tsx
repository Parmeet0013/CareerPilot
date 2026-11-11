import React from 'react'

export const JobsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between border-b border-line pb-4">
        <div>
          <h1 className="font-serif text-[28px] font-normal text-ink tracking-tight">Jobs</h1>
          <p className="text-[13px] text-muted mt-1">
            Curated fresher and internship roles matched against your profile
          </p>
        </div>
        <span className="text-[12px] text-muted">Mock data</span>
      </div>
      <div className="bg-surface border border-line rounded-lg p-8 text-center text-muted text-[14px]">
        Job listing interface loading...
      </div>
    </div>
  )
}
