'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { SpaceForm } from '@/components/dashboard/SpaceForm'
import type { CreateSpaceInput } from '@perch/shared'

export default function NewSpacePage() {
  const router = useRouter()
  const { user } = useAuth()
  const { success, error: toastError } = useToast()

  const handleSubmit = async (data: Record<string, any>) => {
    if (!user?.orgId) {
      toastError('Organization ID not found')
      return
    }

    try {
      await api.spaces.create(user.orgId, data as CreateSpaceInput)
      success('Space created successfully')
      router.push('/dashboard/spaces')
    } catch (err) {
      throw err
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-ink">Create a new space</h1>
        <p className="text-sm text-text-muted mt-2">
          Add a new bookable space to your organization
        </p>
      </div>

      <SpaceForm
        submitLabel="Create space"
        onSubmit={handleSubmit}
      />
    </div>
  )
}
