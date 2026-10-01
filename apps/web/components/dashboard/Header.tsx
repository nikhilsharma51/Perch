'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { SignOut } from 'phosphor-react'

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
    <header className="fixed top-0 right-0 h-16 bg-surface border-b border-border flex items-center justify-between px-8 md:left-60">
      {/* Left: Organization name */}
      <div className="text-sm font-medium text-ink">
        {orgLoading ? (
          <div className="h-5 w-32 bg-border rounded-sharp animate-pulse" />
        ) : org ? (
          org.name
        ) : null}
      </div>

      {/* Right: User dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="text-sm font-medium text-ink hover:text-secondary transition-colors px-3 py-2 rounded-sharp hover:bg-paper"
        >
          {userDisplayName}
        </button>

        {/* Dropdown menu */}
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-sharp shadow-float z-50">
            <button
              onClick={() => {
                setDropdownOpen(false)
                logout()
              }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-ink hover:bg-paper transition-colors text-left rounded-sharp"
            >
              <SignOut size={16} weight="regular" />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
