'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import Link from 'next/link'
import { SpaceCard } from '@/components/dashboard/SpaceCard'
import { Plus } from 'phosphor-react'

interface Space {
  id: string
  orgId: string
  name: string
  type: 'podcast' | 'photography' | 'gaming'
  hourlyRate: number
  depositRate: number
  capacity: number
  imageUrl?: string
  createdAt: string
}

const SKELETON_ROWS = 3

export default function SpacesPage() {
  const { user } = useAuth()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.orgId) {
      setIsLoading(false)
      return
    }

    const fetchSpaces = async () => {
      try {
        setError(null)
        const response = await api.spaces.list(user.orgId!)
        setSpaces(response.spaces)
      } catch (err) {
        console.error('Failed to fetch spaces:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to load spaces'
        )
        setSpaces([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchSpaces()
  }, [user?.orgId])

  return (
    <div className="space-y-8">
      {/* Header with title and action button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ink">Spaces</h1>
          <p className="text-sm text-text-muted mt-2">
            Manage your bookable spaces
          </p>
        </div>
        {!isLoading && spaces.length > 0 && (
          <Link
            href="/dashboard/spaces/new"
            className="inline-flex items-center justify-center gap-2 rounded-sharp border border-ink bg-ink px-5 py-2.5 text-sm font-medium leading-none text-paper transition-colors hover:bg-[#2e2d2a] active:bg-[#3d3c39]"
          >
            <Plus size={18} weight="regular" />
            <span>Add space</span>
          </Link>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid gap-4 auto-rows-max">
          {Array.from({ length: SKELETON_ROWS }).map((_, idx) => (
            <div
              key={idx}
              className="h-32 bg-surface-elevated rounded-sharp animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="bg-error/10 border border-error rounded-sharp p-4 text-error text-sm">
          <p className="font-medium">Failed to load spaces</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && spaces.length === 0 && (
        <div className="bg-surface border border-border rounded-sharp p-12 text-center">
          <p className="text-text-muted mb-6">No spaces yet</p>
          <Link
            href="/dashboard/spaces/new"
            className="inline-flex items-center justify-center gap-2 rounded-sharp bg-signal px-5 py-2.5 text-sm font-medium leading-none text-white transition-colors hover:bg-[#8f2c23] active:bg-[#7a261e]"
          >
            <Plus size={18} weight="regular" />
            <span>Add your first space</span>
          </Link>
        </div>
      )}

      {/* Spaces list */}
      {!isLoading && !error && spaces.length > 0 && (
        <div className="grid gap-4 auto-rows-max">
          {spaces.map((space) => (
            <SpaceCard key={space.id} space={space} />
          ))}
        </div>
      )}
    </div>
  )
}
