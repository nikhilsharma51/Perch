'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function CheckoutForm({
  spaceId,
  spaceName,
  startTime,
  endTime,
  amount,
  depositAmount,
  onSuccess,
}: {
  spaceId: string
  spaceName: string
  startTime: string
  endTime: string
  amount: number
  depositAmount: number
  onSuccess: (bookingId: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const { success, error: showError } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [renterEmail, setRenterEmail] = useState('')
  const [renterName, setRenterName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!stripe || !elements || !renterEmail || !renterName) {
      setError('Please fill in all fields')
      return
    }

    setIsProcessing(true)

    try {
      // For now, we'll create the booking without Stripe integration
      // TODO: Integrate with Stripe for actual payment processing
      
      const bookingResponse = await api.bookings.create({
        spaceId,
        renterEmail,
        startTime,
        endTime,
      })

      success('Booking created! Redirecting to confirmation...')
      onSuccess(bookingResponse.booking.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Booking creation failed'
      setError(message)
      showError(message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
            Name
          </label>
          <input
            type="text"
            value={renterName}
            onChange={(e) => setRenterName(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-sharp bg-paper text-ink placeholder-text-muted focus:outline-none focus:border-ink"
            placeholder="Your name"
            disabled={isProcessing}
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
            Email
          </label>
          <input
            type="email"
            value={renterEmail}
            onChange={(e) => setRenterEmail(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-sharp bg-paper text-ink placeholder-text-muted focus:outline-none focus:border-ink"
            placeholder="your@email.com"
            disabled={isProcessing}
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
            Card Details
          </label>
          <div className="p-3 border border-border rounded-sharp bg-paper">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '14px',
                    color: '#1a1918',
                    '::placeholder': {
                      color: '#a6a4a0',
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border border-error rounded-sharp text-error text-sm">
          {error}
        </div>
      )}

      <div className="bg-surface-elevated border border-border/50 rounded-sharp p-4 text-sm">
        <p className="text-text-secondary mb-2">
          <span className="font-medium text-ink">Deposit due today:</span> ₹{(depositAmount / 100).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
        <p className="text-xs text-text-muted">
          Full amount due before your slot: ₹{(amount / 100).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>

      <button
        type="submit"
        disabled={isProcessing || !stripe}
        className="w-full py-3 px-4 bg-ink text-paper rounded-sharp font-medium hover:bg-[#2e2d2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? 'Processing...' : `Confirm and Pay ₹${(depositAmount / 100).toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`}
      </button>
    </form>
  )
}

function CheckoutContent({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [space, setSpace] = useState<any>(null)
  const [org, setOrg] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const spaceId = searchParams?.get('spaceId')
  const startTime = searchParams?.get('startTime')
  const endTime = searchParams?.get('endTime')

  useEffect(() => {
    if (!spaceId || !startTime || !endTime) {
      setError('Invalid checkout link')
      return
    }

    const fetchSpace = async () => {
      try {
        const orgResponse = await api.public.getStudioBySlug(params.slug)
        const foundSpace = orgResponse.organization.spaces.find((s: any) => s.id === spaceId)

        if (!foundSpace) {
          setError('Space not found')
          return
        }

        setOrg(orgResponse.organization)
        setSpace(foundSpace)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load space')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSpace()
  }, [spaceId, params.slug])

  const handlePaymentSuccess = (bookingId: string) => {
    router.push(`/studios/${params.slug}/confirmation?bookingId=${bookingId}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper p-6 flex items-center justify-center">
        <div className="max-w-560px w-full">
          <div className="h-8 bg-surface-elevated rounded-sharp w-32 animate-pulse mb-8" />
          <div className="space-y-4">
            <div className="h-40 bg-surface-elevated rounded-sharp animate-pulse" />
            <div className="h-12 bg-surface-elevated rounded-sharp animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !space || !org) {
    return (
      <div className="min-h-screen bg-paper p-6 flex items-center justify-center">
        <div className="max-w-560px w-full text-center">
          <h1 className="text-2xl font-semibold text-ink mb-4">Checkout error</h1>
          <p className="text-text-secondary mb-6">{error || 'Space not found'}</p>
          <Link
            href="/studios"
            className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-paper rounded-sharp font-medium hover:bg-[#2e2d2a]"
          >
            Back to studios
          </Link>
        </div>
      </div>
    )
  }

  if (!spaceId || !startTime || !endTime) {
    return (
      <div className="min-h-screen bg-paper p-6 flex items-center justify-center">
        <div className="max-w-560px w-full text-center">
          <h1 className="text-2xl font-semibold text-ink mb-4">Checkout error</h1>
          <p className="text-text-secondary mb-6">Invalid checkout link</p>
          <Link
            href="/studios"
            className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-paper rounded-sharp font-medium hover:bg-[#2e2d2a]"
          >
            Back to studios
          </Link>
        </div>
      </div>
    )
  }

  const depositAmount = space.depositRate
  const fullAmount = space.hourlyRate

  return (
    <div className="min-h-screen bg-paper p-6">
      <div className="max-w-560px mx-auto">
        {/* Back link */}
        <Link href={`/studios/${params.slug}/spaces/${spaceId}`} className="inline-flex items-center gap-2 text-text-secondary hover:text-ink transition-colors mb-8">
          <ChevronLeft size={20} />
          <span className="text-sm font-medium">Back</span>
        </Link>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-ink mb-1">Complete your booking</h1>
        <p className="text-text-secondary mb-8">{org.name}</p>

        {/* Booking summary */}
        <div className="bg-surface border border-border rounded-sharp p-6 mb-6 space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-1">Space</p>
            <p className="text-base font-medium text-ink">{space.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-1">Date</p>
              <p className="text-base font-medium text-ink">{formatDate(startTime)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-1">Time</p>
              <p className="text-base font-medium text-ink">{formatTime(startTime)} – {formatTime(endTime)}</p>
            </div>
          </div>
        </div>

        {/* Payment form */}
        <Elements stripe={stripePromise}>
          <CheckoutForm
            spaceId={spaceId}
            spaceName={space.name}
            startTime={startTime}
            endTime={endTime}
            amount={fullAmount}
            depositAmount={depositAmount}
            onSuccess={handlePaymentSuccess}
          />
        </Elements>

        {/* Footer info */}
        <div className="mt-12 pt-8 border-t border-border text-center text-xs text-text-muted">
          <p>Your payment is secure and processed by Stripe</p>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const [params, setParams] = React.useState<{ slug: string } | null>(null)

  React.useEffect(() => {
    paramsPromise.then(setParams)
  }, [paramsPromise])

  if (!params) return null

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-paper p-6 flex items-center justify-center">
          <div className="max-w-560px w-full">
            <div className="h-8 bg-surface-elevated rounded-sharp w-32 animate-pulse mb-8" />
            <div className="space-y-4">
              <div className="h-40 bg-surface-elevated rounded-sharp animate-pulse" />
              <div className="h-12 bg-surface-elevated rounded-sharp animate-pulse" />
            </div>
          </div>
        </div>
      }
    >
      <CheckoutContent params={params} />
    </Suspense>
  )
}
