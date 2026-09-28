'use client'

import React, { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function SignupPage() {
  const router = useRouter()
  const { signup } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError('Please fill in all fields.')
      return
    }

    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address.')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsLoading(true)
    try {
     
      await signup(formData.name, formData.email, formData.password)

      router.replace('/onboarding')
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Signup failed. Please try again.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      {/* Wordmark */}
      <div className="mb-8 flex justify-center">
        <h1 className="font-display text-[28px] leading-[36px] text-ink">
          Perch
        </h1>
      </div>

      {/* Signup form card */}
      <div className="rounded-sharp border border-border bg-surface p-8">
        <h2 className="mb-2 font-ui text-lg font-medium text-ink">
          Create your studio account
        </h2>
        <p className="mb-6 text-sm text-text-secondary">
          Start booking with certainty. 14-day free trial, no card required.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-sm font-medium text-ink">
              Studio name
            </label>
            <input
              id="name"
              type="text"
              name="name"
              placeholder="Priya's Podcast Studio"
              value={formData.name}
              onChange={handleChange}
              className="rounded-sharp border border-border bg-surface px-4 py-3 text-base text-ink placeholder-text-muted focus:border-ink focus:outline-none focus:ring-2 focus:ring-signal focus:ring-opacity-20"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium text-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="you@studio.com"
              value={formData.email}
              onChange={handleChange}
              className="rounded-sharp border border-border bg-surface px-4 py-3 text-base text-ink placeholder-text-muted focus:border-ink focus:outline-none focus:ring-2 focus:ring-signal focus:ring-opacity-20"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-ink"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              className="rounded-sharp border border-border bg-surface px-4 py-3 text-base text-ink placeholder-text-muted focus:border-ink focus:outline-none focus:ring-2 focus:ring-signal focus:ring-opacity-20"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-ink"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="rounded-sharp border border-border bg-surface px-4 py-3 text-base text-ink placeholder-text-muted focus:border-ink focus:outline-none focus:ring-2 focus:ring-signal focus:ring-opacity-20"
            />
          </div>

          {error && (
            <div className="rounded-sharp border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          <div className="rounded-sharp bg-surface-elevated px-4 py-3">
            <p className="mb-2 text-xs font-medium text-text-secondary">
              Password requirements:
            </p>
            <ul className="space-y-1 text-xs text-text-muted">
              <li>✓ At least 6 characters</li>
              <li>✓ Mix of uppercase and lowercase</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 flex items-center justify-center gap-2 rounded-sharp border border-ink bg-ink px-5 py-3 text-sm font-medium leading-none text-paper transition-colors hover:bg-[#2e2d2a] active:bg-[#3d3c39] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="my-6 border-t border-border" />

        <p className="mb-6 text-xs text-text-muted">
          By creating an account, you agree to our{' '}
          <Link href="/legal/terms" className="text-ink hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/legal/privacy" className="text-ink hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        <div className="border-t border-border pt-6 text-center">
          <p className="text-sm text-text-secondary">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="font-medium text-ink hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-text-muted">
        No credit card required. Start your 14-day free trial today.
      </p>
    </div>
  )
}
