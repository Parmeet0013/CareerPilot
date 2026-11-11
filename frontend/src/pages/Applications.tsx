import React from 'react'

export const ApplicationsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between border-b border-line pb-4">
        <div>
          <h1 className="font-serif text-[28px] font-normal text-ink tracking-tight">Applications</h1>
          <p className="text-[13px] text-muted mt-1">
            Tracking lifecycle and submission status across your pipeline
          </p>
        </div>
        <button className="text-[12px] text-muted hover:text-ink underline">
          Activity log
        </button>
      </div>
      <div className="bg-surface border border-line rounded-lg p-8 text-center text-muted text-[14px]">
        Application pipeline board loading...
      </div>
    </div>
  )
}
