'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { Gear, ArrowRight } from 'phosphor-react'
import Link from 'next/link'

interface Organization {
  id: string
  name: string
  slug: string
  createdAt: string
}

export default function SettingsPage() {
  const { user } = useAuth()
  const { success: showSuccess, error: showError } = useToast()
  const [org, setOrg] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  })

  useEffect(() => {
    if (!user?.orgId) {
      setIsLoading(false)
      return
    }

    const fetchOrg = async () => {
      try {
        setError(null)
        const response = await api.organizations.get(user.orgId!)
        setOrg(response.organization)
        setFormData({
          name: response.organization.name,
          slug: response.organization.slug,
        })
      } catch (err) {
        console.error('Failed to fetch organization:', err)
        setError(err instanceof Error ? err.message : 'Failed to load settings')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrg()
  }, [user?.orgId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.orgId) {
      showError('Organization ID not found')
      return
    }

    setIsSaving(true)
    try {
      const response = await api.organizations.update(user.orgId, {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
      })
      setOrg(response.organization)
      showSuccess('Settings updated successfully')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings'
      showError(message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-2 mb-8">
          <Gear size={24} weight="regular" className="text-text-muted" />
          <h1 className="text-3xl font-bold text-ink">Settings</h1>
        </div>

        {/* Loading skeleton */}
        <div className="space-y-6">
          <div>
            <div className="h-4 w-32 bg-surface-elevated rounded-sharp animate-pulse mb-4" />
            <div className="h-10 w-full bg-surface-elevated rounded-sharp animate-pulse" />
          </div>
          <div>
            <div className="h-4 w-32 bg-surface-elevated rounded-sharp animate-pulse mb-4" />
            <div className="h-10 w-full bg-surface-elevated rounded-sharp animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-surface-elevated rounded-sharp animate-pulse" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-2 mb-8">
          <Gear size={24} weight="regular" className="text-text-muted" />
          <h1 className="text-3xl font-bold text-ink">Settings</h1>
        </div>

        <div className="bg-error/10 border border-error rounded-sharp p-6 text-error">
          <p className="font-medium mb-2">Failed to load settings</p>
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-error text-white rounded-sharp font-medium hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Gear size={24} weight="regular" className="text-text-muted" />
          <h1 className="text-3xl font-bold text-ink">Settings</h1>
        </div>
        <p className="text-text-muted">Manage your organization details and preferences</p>
      </div>

      {/* Organization Settings Card */}
      <div className="bg-surface border border-border rounded-sharp p-8 max-w-2xl">
        <h2 className="text-xl font-semibold text-ink mb-6">Organization Details</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Organization Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-ink mb-2">
              Organization Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              disabled={isSaving}
              className="w-full px-4 py-2.5 border border-border rounded-sharp bg-paper text-ink placeholder-text-muted focus:outline-none focus:border-ink disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Your organization name"
            />
            <p className="text-xs text-text-muted mt-1.5">The name of your studio or workspace</p>
          </div>

          {/* Organization Slug */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-ink mb-2">
              Organization Slug
            </label>
            <input
              id="slug"
              name="slug"
              type="text"
              value={formData.slug}
              onChange={handleInputChange}
              disabled={isSaving}
              className="w-full px-4 py-2.5 border border-border rounded-sharp bg-paper text-ink placeholder-text-muted focus:outline-none focus:border-ink disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="your-org-slug"
            />
            <p className="text-xs text-text-muted mt-1.5">
              Used in your public studio URL: <code className="bg-surface-elevated px-2 py-1 rounded font-mono text-xs">perch.com/studios/{formData.slug}</code>
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-ink text-paper rounded-sharp font-medium hover:bg-[#2e2d2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Additional Settings Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        {/* Members Card */}
        <Link href="/dashboard/staff" className="bg-surface border border-border rounded-sharp p-6 hover:border-ink transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-ink mb-1">Team Members</h3>
              <p className="text-sm text-text-muted">Manage staff and permissions</p>
            </div>
            <ArrowRight size={20} className="text-text-muted" />
          </div>
        </Link>

        {/* Spaces Card */}
        <Link href="/dashboard/spaces" className="bg-surface border border-border rounded-sharp p-6 hover:border-ink transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-ink mb-1">Spaces</h3>
              <p className="text-sm text-text-muted">Manage your bookable spaces</p>
            </div>
            <ArrowRight size={20} className="text-text-muted" />
          </div>
        </Link>
      </div>

      {/* Info Section */}
      <div className="bg-surface-elevated border border-border/50 rounded-sharp p-6 max-w-2xl">
        <h3 className="text-sm font-semibold text-ink mb-3">Organization Info</h3>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-text-muted font-medium">Organization ID</dt>
            <dd className="text-ink font-mono mt-1">{org?.id}</dd>
          </div>
          <div>
            <dt className="text-text-muted font-medium">Created</dt>
            <dd className="text-ink mt-1">
              {org?.createdAt ? new Date(org.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }) : '—'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
