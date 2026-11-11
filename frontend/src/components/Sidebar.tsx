import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Calendar, Briefcase, FileCheck, PenTool, User, Plus } from 'lucide-react'

interface SidebarProps {
  studentName?: string
  studentCollege?: string
}

export const Sidebar: React.FC<SidebarProps> = ({
  studentName = "Ananya Sharma",
  studentCollege = "B.Tech CSE '25"
}) => {
  const navItems = [
    { name: 'Today', path: '/', icon: Calendar },
    { name: 'Jobs', path: '/jobs', icon: Briefcase },
    { name: 'Applications', path: '/applications', icon: FileCheck },
    { name: 'Practice', path: '/practice', icon: PenTool },
    { name: 'Profile', path: '/profile', icon: User },
  ]
  const navigate = useNavigate()

  return (
    <aside className="fixed top-0 left-0 h-screen w-52 z-30 bg-surface border-r border-line flex flex-col justify-between p-4 select-none">
      {/* Brand & Navigation */}
      <div className="flex flex-col gap-4">
        <div className="px-1 pt-1 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <path d="M7 15L26 6L17 25L15 17Z" fill="#FAF9F6" />
              </svg>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-sans font-semibold text-[15px] text-ink tracking-tight leading-none">
                CareerPilot
              </span>
              <p className="text-[10px] text-muted mt-1.5 leading-none truncate">
                Recruitment Ledger • {studentCollege}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/jobs')}
          className="mx-1 flex items-center justify-center gap-2 py-2 rounded bg-accent text-surface text-[13px] font-semibold hover:bg-accent/90 transition-colors"
        >
          <Plus size={15} strokeWidth={2} />
          Log Application
        </button>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded text-[13px] font-medium transition-colors duration-150 ${
                    isActive
                      ? 'bg-accent-soft text-accent border border-accent/20'
                      : 'text-muted hover:bg-canvas hover:text-ink'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} strokeWidth={1.5} className={isActive ? 'text-accent' : 'text-muted'} />
                    <span>{item.name}</span>
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent"></span>}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>
      </div>

      {/* User Profile Mini Footer */}
      <div className="pt-3 border-t border-line flex flex-col gap-1">
        <NavLink
          to="/profile"
          className="px-2 py-1.5 rounded flex items-center gap-2.5 hover:bg-canvas transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-accent-soft border border-line flex items-center justify-center text-accent text-[12px] font-semibold">
            {studentName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-medium text-ink truncate">{studentName}</span>
            <span className="text-[11px] text-muted truncate">{studentCollege}</span>
          </div>
        </NavLink>
      </div>
    </aside>
  )
}
