'use client'

import React, { useState, useCallback, FormEvent } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'

interface StepOrgFormProps {
  onContinue: () => void
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function StepOrgForm({ onContinue }: StepOrgFormProps) {
  const { setOrgId } = useAuth()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setName(newName)

    if (!slugTouched) {
      setSlug(slugify(newName))
    }
  }

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value)
    setSlugTouched(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')


    if (!name.trim()) {
      setError('Organization name is required')
      return
    }

    if (!slug.trim()) {
      setError('Organization slug is required')
      return
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setError('Slug must contain only lowercase letters, numbers, and hyphens')
      return
    }

    setIsLoading(true)
    try {
      const response = await api.organizations.create({
        name: name.trim(),
        slug: slug.trim(),
      })

      setOrgId(response.organization.id)

      onContinue()
    }
    catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create organization'

      if (errorMessage.includes('slug') || errorMessage.includes('SLUG_EXISTS')) {
        setError('This slug is already taken. Please choose another.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm font-medium text-ink">
          Organization name
        </label>
        <input
          id="name"
          type="text"
          placeholder="Priya's Podcast Studio"
          value={name}
          onChange={handleNameChange}
          className="rounded-sharp border border-border bg-surface px-4 py-3 text-base text-ink placeholder-text-muted focus:border-ink focus:outline-none focus:ring-2 focus:ring-signal focus:ring-opacity-20"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="slug" className="text-sm font-medium text-ink">
          Organization slug
        </label>
        <input
          id="slug"
          type="text"
          placeholder="priyas-podcast-studio"
          value={slug}
          onChange={handleSlugChange}
          className="rounded-sharp border border-border bg-surface px-4 py-3 text-base text-ink placeholder-text-muted focus:border-ink focus:outline-none focus:ring-2 focus:ring-signal focus:ring-opacity-20"
        />
        <p className="text-xs text-text-muted">
          This will be part of your studio's public URL
        </p>
      </div>

      {error && (
        <div className="rounded-sharp border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="mt-4 flex items-center justify-center gap-2 rounded-sharp border border-ink bg-ink px-5 py-3 text-sm font-medium leading-none text-paper transition-colors hover:bg-[#2e2d2a] active:bg-[#3d3c39] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Creating organization...' : 'Continue'}
      </button>
    </form>
  )
}
