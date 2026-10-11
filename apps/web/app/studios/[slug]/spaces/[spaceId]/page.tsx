'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { api, getAvailability } from '@/lib/api'
import { DateNavigation } from '@/components/calendar/DateNavigation'
import { SlotCell } from '@/components/calendar/SlotCell'
import { ChevronLeft } from 'lucide-react'

interface Params {
  slug: string
  spaceId: string
}

interface RenterSlot {
  startTime: string
  endTime: string
  price: number
  isAvailable: boolean
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getEndTime(startTime: string): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const nextMinutes = minutes + 30
  if (nextMinutes >= 60) {
    const nextHours = (hours + 1) % 24
    return `${String(nextHours).padStart(2, '0')}:00`
  }
  return `${String(hours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`
}

function parseDateTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00Z`)
}

export default function RenterSpaceBookingPage({
  params: paramsPromise,
}: {
  params: Promise<Params>
}) {
  const router = useRouter()
  const [params, setParams] = useState<Params | null>(null)
  const [space, setSpace] = useState<any>(null)
  const [org, setOrg] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [slots, setSlots] = useState<RenterSlot[]>([])
  const [isLoadingSpace, setIsLoadingSpace] = useState(true)
  const [isLoadingSlots, setIsLoadingSlots] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Resolve params from promise
  useEffect(() => {
    paramsPromise.then(setParams)
  }, [paramsPromise])

  // Fetch space and org data
  useEffect(() => {
    if (!params) return

    const fetchData = async () => {
      try {
        setError(null)

        // Fetch org by slug to get spaces array
        const orgResponse = await api.public.getStudioBySlug(params.slug)
        const foundSpace = orgResponse.organization.spaces.find(
          (s: any) => s.id === params.spaceId
        )

        if (!foundSpace) {
          notFound()
        }

        setOrg(orgResponse.organization)
        setSpace(foundSpace)
      } catch (err) {
        console.error('Failed to fetch space:', err)
        setError(err instanceof Error ? err.message : 'Failed to load space')
        notFound()
      } finally {
        setIsLoadingSpace(false)
      }
    }

    fetchData()
  }, [params])

  // Fetch availability for selected date
  const fetchAvailability = useCallback(
    async (date: Date) => {
      if (!params?.spaceId) return

      try {
        setIsLoadingSlots(true)
        setError(null)

        const dateStr = formatDate(date)
        const response = await getAvailability(params.spaceId, dateStr)

        // Convert response slots to renter-view format
        const renterSlots: RenterSlot[] = response.slots.map((slot: any) => {
          // Parse ISO strings to extract time
          const startDate = new Date(slot.startTime)
          const startTimeStr = `${String(startDate.getUTCHours()).padStart(2, '0')}:${String(startDate.getUTCMinutes()).padStart(2, '0')}`

          return {
            startTime: startTimeStr,
            endTime: getEndTime(startTimeStr),
            price: space.hourlyRate,
            isAvailable: true,
          }
        })

        setSlots(renterSlots)
      } catch (err) {
        console.error('Failed to fetch availability:', err)
        setError(err instanceof Error ? err.message : 'Failed to load available slots')
        setSlots([])
      } finally {
        setIsLoadingSlots(false)
      }
    },
    [params?.spaceId, space?.hourlyRate]
  )

  // Fetch slots when date changes
  useEffect(() => {
    fetchAvailability(selectedDate)
  }, [selectedDate, fetchAvailability])

  // Date constraints
  const today = new Date()
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 30)

  const handleSlotClick = (slot: RenterSlot) => {
    if (!slot.isAvailable || !params) return

    // Navigate to checkout with slot info
    const dateStr = formatDate(selectedDate)
    const startTime = parseDateTime(dateStr, slot.startTime).toISOString()
    const endTime = parseDateTime(dateStr, slot.endTime).toISOString()

    const checkoutUrl = `/studios/${params.slug}/checkout?spaceId=${params.spaceId}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`
    router.push(checkoutUrl)
  }

  if (isLoadingSpace) {
    return (
      <div className="min-h-screen bg-paper p-6">
        <div className="max-w-4xl mx-auto">
          <div className="h-8 bg-surface-elevated rounded-sharp w-32 animate-pulse mb-8" />
          <div className="space-y-4">
            <div className="h-12 bg-surface-elevated rounded-sharp animate-pulse" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-24 bg-surface-elevated rounded-sharp animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!space || !org || !params) {
    return notFound()
  }

  const displayPrice = (space.hourlyRate / 100).toFixed(2)

  return (
    <div className="min-h-screen bg-paper">
      {/* Header with back button */}
      <div className="sticky top-0 z-10 bg-paper border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href={`/studios/${params.slug}`}
                className="inline-flex items-center gap-2 text-text-secondary hover:text-ink transition-colors"
              >
                <ChevronLeft size={20} />
                <span className="text-sm font-medium">{org.name}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Space info */}
        <div className="mb-8 pb-6 border-b border-border">
          <h1 className="text-2xl font-semibold text-ink mb-2">{space.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
            <div className="flex items-center gap-2">
              {space.type === 'podcast' && '🎙️'}
              {space.type === 'photography' && '📷'}
              {space.type === 'gaming' && '🎮'}
              <span className="capitalize">{space.type}</span>
            </div>
            <div>
              <span className="tabular font-medium text-ink">₹{displayPrice}</span>
              <span> / hour</span>
            </div>
            <div>
              <span className="text-text-muted">Capacity:</span>
              <span className="ml-1 font-medium text-ink">
                {space.capacity} person{space.capacity !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Date navigation */}
        <div className="mb-8">
          <DateNavigation
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            minDate={today}
            maxDate={maxDate}
            compact
          />
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 p-4 bg-error/10 border border-error rounded-sharp text-error text-sm">
            {error}
          </div>
        )}

        {/* Loading state */}
        {isLoadingSlots ? (
          <div className="space-y-4">
            <div className="h-8 bg-surface-elevated rounded-sharp w-32 animate-pulse" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-24 bg-surface-elevated rounded-sharp animate-pulse" />
              ))}
            </div>
          </div>
        ) : slots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-surface border border-border rounded-sharp">
            <h2 className="text-lg font-semibold text-ink mb-2">No available slots</h2>
            <p className="text-text-muted text-sm">
              Please try another date
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {slots.map((slot) => (
              <button
                key={slot.startTime}
                onClick={() => handleSlotClick(slot)}
                className="text-left p-4 bg-surface border border-border rounded-object transition-all hover:border-ink hover:border-2"
              >
                <div className="text-sm font-semibold text-ink mb-1">
                  {slot.startTime}
                </div>
                <div className="text-xs text-text-muted mb-2">
                  {slot.startTime} - {slot.endTime}
                </div>
                <div className="text-sm font-medium text-ink tabular">
                  ₹{displayPrice}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Footer info */}
        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-text-muted">
          <p>Click a slot to proceed to checkout</p>
        </div>
      </div>
    </div>
  )
}
