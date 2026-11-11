import React from 'react'

export const PreparePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between border-b border-line pb-4">
        <div>
          <h1 className="font-serif text-[28px] font-normal text-ink tracking-tight">Prepare application</h1>
          <p className="text-[13px] text-muted mt-1">
            Agent-tailored resume and cover note for your selected role
          </p>
        </div>
      </div>
      <div className="bg-surface border border-line rounded-lg p-8 text-center text-muted text-[14px]">
        Select a job to start application preparation.
      </div>
    </div>
  )
}
