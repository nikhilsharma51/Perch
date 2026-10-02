'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { SpaceForm } from '@/components/dashboard/SpaceForm'
import type { UpdateSpaceInput } from '@perch/shared'

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

export default function EditSpacePage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const { success, error: toastError } = useToast()

  const spaceId = params.spaceId as string

  const [space, setSpace] = useState<Space | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.orgId) {
      setIsLoading(false)
      return
    }

    const fetchSpace = async () => {
      try {
        const response = await api.spaces.get(user.orgId!, spaceId)
        setSpace(response.space)
      } catch (err) {
        console.error('Failed to fetch space:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to load space'
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchSpace()
  }, [user?.orgId, spaceId])

  const handleSubmit = async (data: Record<string, any>) => {
    if (!user?.orgId) {
      toastError('Organization ID not found')
      return
    }

    try {
      await api.spaces.update(user.orgId, spaceId, data as UpdateSpaceInput)
      success('Space updated successfully')
      router.push('/dashboard/spaces')
    } catch (err) {
      throw err
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-12 bg-surface-elevated rounded-sharp animate-pulse" />
        <div className="h-96 bg-surface-elevated rounded-sharp animate-pulse" />
      </div>
    )
  }

  if (error || !space) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-ink">Edit space</h1>
        <div className="bg-error/10 border border-error rounded-sharp p-4 text-error text-sm">
          <p className="font-medium">{error || 'Space not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-ink">Edit space</h1>
        <p className="text-sm text-text-muted mt-2">
          Update space details and availability
        </p>
      </div>

      <SpaceForm
        initialValues={space}
        submitLabel="Update space"
        onSubmit={handleSubmit}
      />
    </div>
  )
}
