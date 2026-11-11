import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { DbStatusBanner } from './components/DbStatusBanner'
import { TodayPage } from './pages/Today'
import { JobsPage } from './pages/Jobs'
import { PreparePage } from './pages/Prepare'
import { ApplicationsPage } from './pages/Applications'
import { PracticePage } from './pages/Practice'
import { ProfilePage } from './pages/Profile'

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-canvas text-ink flex">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="ml-52 flex-1 min-h-screen flex flex-col">
          <div className="max-w-[1120px] w-full mx-auto p-8">
            <DbStatusBanner />
            <Routes>
              <Route path="/" element={<TodayPage />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/prepare" element={<PreparePage />} />
              <Route path="/prepare/:jobId" element={<PreparePage />} />
              <Route path="/applications" element={<ApplicationsPage />} />
              <Route path="/practice" element={<PracticePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
