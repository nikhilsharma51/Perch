'use client'

import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { X } from 'lucide-react'

interface InviteStaffModalProps {
  isOpen: boolean
  orgId: string
  onClose: () => void
  onSuccess: () => void
}

export function InviteStaffModal({
  isOpen,
  orgId,
  onClose,
  onSuccess,
}: InviteStaffModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const { success, error: showError } = useToast()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)


  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])


  useEffect(() => {
    if (isOpen) {
      setEmail('')
      setError(null)
    }
  }, [isOpen])

  const isValidEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }

  const canSubmit = email.trim().length > 0 && isValidEmail(email) && !isLoading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!canSubmit) return

    setIsLoading(true)
    setError(null)

    try {
      await api.staff.invite(orgId, email.trim(), 'staff')
      success(`${email} has been invited to your organization`)
      onSuccess()
      onClose()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to invite staff member'
      
    
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div
        ref={dialogRef}
        className="bg-surface border border-border rounded-sharp p-6 shadow-float max-w-sm w-full mx-4"
      >
   
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink">Invite Staff Member</h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex items-center justify-center w-6 h-6 text-text-muted hover:text-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

     
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-ink mb-1.5"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError(null) 
              }}
              disabled={isLoading}
              placeholder="user@example.com"
              className="w-full px-3 py-2.5 border border-border rounded-sharp bg-surface text-ink placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-ink/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            />
          </div>

 
          {error && (
            <div className="p-3 bg-error/10 border border-error rounded-sharp text-sm text-error">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-sharp border border-ink bg-transparent px-4 py-2.5 text-sm font-medium leading-none text-ink transition-colors hover:bg-paper disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center justify-center rounded-sharp border border-ink bg-ink px-4 py-2.5 text-sm font-medium leading-none text-paper transition-colors hover:bg-[#2e2d2a] active:bg-[#3d3c39] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Inviting...' : 'Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
