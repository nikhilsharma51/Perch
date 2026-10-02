'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { SignOut, Buildings, CaretDown } from 'phosphor-react'

interface Organization {
  id: string
  name: string
  slug: string
  createdAt: string
  role: 'owner' | 'staff'
  membershipId: string
}

export function Header() {
  const { user, logout } = useAuth()
  const [org, setOrg] = useState<Organization | null>(null)
  const [orgLoading, setOrgLoading] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch organization on mount
  useEffect(() => {
    if (!user?.orgId) {
      setOrgLoading(false)
      return
    }

    const fetchOrg = async () => {
      try {
        const organization = await api.organizations.get(user.orgId!)
        setOrg(organization)
      } catch (error) {
        console.error('Failed to fetch organization:', error)
        setOrg(null)
      } finally {
        setOrgLoading(false)
      }
    }

    fetchOrg()
  }, [user?.orgId])

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dropdownOpen) {
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [dropdownOpen])

  const userDisplayName = user?.email || 'User'

  return (
    <header className="h-16 w-full bg-surface border-b border-border flex items-center justify-between px-6 md:px-8 shrink-0 z-30">
      {/* Left: Organization name / workspace info */}
      <div className="flex items-center gap-3">
        {orgLoading ? (
          <div className="h-6 w-36 bg-surface-elevated rounded-sharp animate-pulse" />
        ) : org ? (
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-sharp bg-paper border border-border flex items-center justify-center text-text-secondary flex-shrink-0">
              <Buildings size={16} weight="regular" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-ink leading-tight">
                {org.name}
              </span>
              {org.role && (
                <span className="text-[11px] font-normal text-text-muted capitalize leading-none mt-0.5">
                  {org.role} workspace
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Right: User profile menu */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2.5 py-1.5 px-2 rounded-sharp hover:bg-paper transition-colors text-left"
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
        >
          <div className="h-7 w-7 rounded-full bg-ink text-paper flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {userDisplayName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-ink hidden sm:inline max-w-[180px] truncate">
            {userDisplayName}
          </span>
          <CaretDown
            size={14}
            weight="bold"
            className={`text-text-muted transition-transform duration-150 ${
              dropdownOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown menu */}
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-sharp shadow-float z-50 overflow-hidden divide-y divide-border">
            <div className="px-4 py-3 bg-paper/40">
              <p className="text-[11px] text-text-muted uppercase tracking-wider font-medium">
                Signed in as
              </p>
              <p className="text-sm font-medium text-ink truncate mt-0.5">
                {userDisplayName}
              </p>
            </div>
            <div className="p-1">
              <button
                onClick={() => {
                  setDropdownOpen(false)
                  logout()
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-error hover:bg-error/10 transition-colors text-left rounded-sharp font-medium"
              >
                <SignOut size={16} weight="regular" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
