'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import { SpaceForm } from '@/components/dashboard/SpaceForm'
import type { CreateSpaceInput } from '@perch/shared'
import Link from 'next/link'
import { ArrowLeft, Sparkle } from 'phosphor-react'
import { motion } from 'framer-motion'

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
    <div className="space-y-6 sm:space-y-8 max-w-4xl">
      {/* Breadcrumb / Back Link */}
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.15 }}
      >
        <Link
          href="/dashboard/spaces"
          className="inline-flex items-center gap-2 text-xs font-medium text-text-muted hover:text-ink transition-colors group"
        >
          <ArrowLeft
            size={14}
            weight="bold"
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          <span>Back to spaces</span>
        </Link>
      </motion.div>

      {/* Header section */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6"
      >
        <div>
          <div className="flex items-center gap-2 text-text-muted text-xs font-medium uppercase tracking-wider mb-1">
            <Sparkle size={14} weight="fill" className="text-signal" />
            <span>Workspace Setup</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
            Create a new space
          </h1>
          <p className="text-sm text-text-muted mt-1.5 max-w-xl">
            Configure space details, hourly rates, deposit terms, and open hours to start taking reservations.
          </p>
        </div>
      </motion.div>

      {/* Modular Space Form */}
      <SpaceForm
        submitLabel="Create space"
        onSubmit={handleSubmit}
      />
    </div>
  )
}
