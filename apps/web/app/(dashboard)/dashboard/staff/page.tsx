'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { UserPlus, AlertCircle } from 'lucide-react'
import { InviteStaffModal } from '@/components/dashboard/InviteStaffModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { StaffMember } from '@/lib/api'

interface Organization {
  id: string
  name: string
  slug: string
  createdAt: string
  role: 'owner' | 'staff'
  membershipId: string
}

export default function StaffPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [org, setOrg] = useState<Organization | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    memberName: string
    userId: string
  }>({
    isOpen: false,
    memberName: '',
    userId: '',
  })
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user?.orgId) {
      router.push('/onboarding')
      return
    }
  }, [user, authLoading, router])

 
  const fetchStaff = async () => {
    if (authLoading || !user?.orgId) return

    try {
      setError(null)
      const [response, organization] = await Promise.all([
        api.staff.list(user.orgId as string),
        api.organizations.get(user.orgId as string),
      ])
      setStaff(response.staff)
      setOrg(organization)
    } catch (err) {
      console.error('Failed to fetch staff or organization:', err)
      setError(err instanceof Error ? err.message : 'Failed to load staff members')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStaff()
  }, [user?.orgId, authLoading])

  const getRoleBadgeStyle = (role: 'owner' | 'staff') => {
    if (role === 'owner') {
      return {
        bg: 'bg-signal/10',
        text: 'text-signal',
        dot: 'bg-signal',
      }
    }
    return {
      bg: 'bg-info/10',
      text: 'text-info',
      dot: 'bg-info',
    }
  }

  const handleRemoveClick = (member: StaffMember) => {
    setConfirmDialog({
      isOpen: true,
      memberName: member.name,
      userId: member.userId,
    })
  }

  const handleConfirmRemove = async () => {
    if (!user?.orgId) return

    setIsRemoving(true)
    try {
      await api.staff.remove(user.orgId, confirmDialog.userId)
    
      setStaff((prev) =>
        prev.filter((member) => member.userId !== confirmDialog.userId)
      )
      setConfirmDialog({ isOpen: false, memberName: '', userId: '' })
    } catch (err) {
      console.error('Failed to remove staff:', err)
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to remove staff member'
      
    } finally {
      setIsRemoving(false)
    }
  }

  const handleCancelRemove = () => {
    setConfirmDialog({ isOpen: false, memberName: '', userId: '' })
  }

  if (authLoading || isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-ink">Staff & Permissions</h1>
        </div>

        {/* Skeleton rows */}
        <div className="bg-surface border border-border rounded-sharp overflow-hidden">
          <div className="divide-y divide-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <div className="h-4 w-32 bg-surface-elevated rounded-sharp animate-pulse" />
                <div className="h-4 w-48 bg-surface-elevated rounded-sharp animate-pulse" />
                <div className="h-6 w-16 bg-surface-elevated rounded-object animate-pulse" />
                <div className="h-8 w-20 bg-surface-elevated rounded-sharp animate-pulse ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Staff & Permissions</h1>
          <p className="text-sm text-text-muted mt-1">Manage team members and their access</p>
        </div>

        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-ink text-paper rounded-sharp text-sm font-medium hover:bg-[#2e2d2a] transition-colors"
        >
          <UserPlus size={16} />
          Invite Staff
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-error/10 border border-error rounded-sharp text-error text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Empty state */}
      {staff.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-surface border border-border rounded-sharp">
          <div className="w-12 h-12 bg-paper rounded-sharp flex items-center justify-center mb-4">
            <UserPlus size={24} className="text-text-muted" />
          </div>
          <h3 className="text-base font-semibold text-ink mb-1">No staff yet</h3>
          <p className="text-sm text-text-muted mb-6 max-w-sm text-center">
            Invite team members to help manage your spaces and bookings
          </p>
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="px-4 py-2 bg-ink text-paper rounded-sharp text-sm font-medium hover:bg-[#2e2d2a] transition-colors"
          >
            Invite your first team member
          </button>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-sharp overflow-hidden shadow-float">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 p-4 bg-surface-elevated border-b border-border/50">
            <div className="col-span-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Name</p>
            </div>
            <div className="col-span-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Email</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Role</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Actions</p>
            </div>
          </div>

          {/* Table body */}
          <div className="divide-y divide-border">
            {staff.map((member, idx) => {
              const isCurrentUser = member.userId === user?.userId
              const colors = getRoleBadgeStyle(member.role)
              const isOwner = member.role === 'owner'

              return (
                <div key={member.membershipId} className={`grid grid-cols-12 gap-4 p-4 transition-colors ${
                  idx % 2 === 0 ? 'bg-surface' : 'bg-surface/50'
                }`}>
                  {/* Name */}
                  <div className="col-span-4">
                    <p className="text-sm font-medium text-ink">
                      {member.name}
                      {isCurrentUser && <span className="ml-2 text-xs text-text-muted">(you)</span>}
                    </p>
                  </div>

                  {/* Email */}
                  <div className="col-span-4">
                    <p className="text-sm text-text-secondary">{member.email}</p>
                  </div>

                  {/* Role badge */}
                  <div className="col-span-2">
                    <div
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-object text-xs w-fit ${colors.bg}`}
                    >
                      <div className={`size-1.5 rounded-full ${colors.dot}`} />
                      <span className={colors.text}>
                        {member.role === 'owner' ? 'Owner' : 'Staff'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end">
                    {!isCurrentUser && !isOwner ? (
                      <button
                        onClick={() => handleRemoveClick(member)}
                        disabled={isRemoving}
                        className="px-3 py-1.5 text-xs font-medium text-error border border-error rounded-sharp hover:bg-error/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Info footer */}
      {staff.length > 0 && (
        <div className="p-4 bg-info/10 border border-info/20 rounded-sharp">
          <p className="text-xs text-info">
            <span className="font-semibold">Note:</span> Only organization owners can invite and remove staff members.
          </p>
        </div>
      )}

      {/* Invite modal */}
      <InviteStaffModal
        isOpen={isInviteModalOpen}
        orgId={user?.orgId || ''}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={fetchStaff}
      />

      {/* Confirm remove dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Remove Staff Member?"
        message={`Remove ${confirmDialog.memberName} from ${org?.name || 'organization'}?`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        isDangerous={true}
        isLoading={isRemoving}
        onConfirm={handleConfirmRemove}
        onCancel={handleCancelRemove}
      />
    </div>
  )
}
