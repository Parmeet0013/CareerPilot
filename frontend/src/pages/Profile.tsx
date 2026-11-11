import React from 'react'

export const ProfilePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between border-b border-line pb-4">
        <div>
          <h1 className="font-serif text-[28px] font-normal text-ink tracking-tight">Student Profile</h1>
          <p className="text-[13px] text-muted mt-1">
            Structured candidate information parsed from your uploaded resume
          </p>
        </div>
      </div>
      <div className="bg-surface border border-line rounded-lg p-8 text-center text-muted text-[14px]">
        Profile details loading...
      </div>
    </div>
  )
}
