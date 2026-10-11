'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useSlotStream } from '@/hooks/useSlotStream'
import { SlotCell } from '@/components/calendar/SlotCell'
import { BookingDrawer } from '@/components/dashboard/BookingDrawer'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Layers3,
  Plus,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'

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

interface AvailabilitySlot {
  startTime: string
  endTime: string
  renterName?: string
  renterEmail?: string
  bookingId?: string
  status?:
    | 'pending'
    | 'confirmed'
    | 'checked_in'
    | 'completed'
    | 'cancelled'
    | 'no_show'
  isAvailable?: boolean
}

interface SlotLookup {
  [key: string]: AvailabilitySlot & { price: number }
}

const SLOT_DURATION_MINUTES = 30
const DEFAULT_OPEN_HOUR = 9
const DEFAULT_CLOSE_HOUR = 21

function generateTimeSlots(
  openHour = DEFAULT_OPEN_HOUR,
  closeHour = DEFAULT_CLOSE_HOUR,
): string[] {
  const slots: string[] = []

  for (let hour = openHour; hour < closeHour; hour++) {
    for (let minute = 0; minute < 60; minute += SLOT_DURATION_MINUTES) {
      slots.push(
        `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      )
    }
  }

  return slots
}

// Use local calendar dates rather than UTC to avoid off-by-one dates.
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year:
      date.getFullYear() !== new Date().getFullYear()
        ? 'numeric'
        : undefined,
  })
}

function getEndTime(startTime: string): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const nextMinutes = minutes + SLOT_DURATION_MINUTES

  if (nextMinutes >= 60) {
    const nextHours = (hours + 1) % 24
    return `${String(nextHours).padStart(2, '0')}:00`
  }

  return `${String(hours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12

  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
}

function getSpaceTypeLabel(type: Space['type']): string {
  switch (type) {
    case 'podcast':
      return 'Podcast studio'
    case 'photography':
      return 'Photography studio'
    case 'gaming':
      return 'Gaming space'
  }
}

function getSpaceTypeCode(type: Space['type']): string {
  switch (type) {
    case 'podcast':
      return 'PD'
    case 'photography':
      return 'PH'
    case 'gaming':
      return 'GM'
  }
}

export default function BookingsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [spaces, setSpaces] = useState<Space[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [slotLookups, setSlotLookups] = useState<
    Record<string, SlotLookup>
  >({})
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(true)
  const [isLoadingSlots, setIsLoadingSlots] = useState(true)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)

  const timeSlots = useMemo(() => generateTimeSlots(), [])

  const isToday = formatDate(selectedDate) === formatDate(new Date())

  // Redirect users who have not completed onboarding.
  useEffect(() => {
    if (authLoading) return

    if (!user?.orgId) {
      router.push('/onboarding')
    }
  }, [user, authLoading, router])

  // Fetch the organization's spaces.
  useEffect(() => {
    if (authLoading || !user?.orgId) return

    let cancelled = false

    const fetchSpaces = async () => {
      setIsLoadingSpaces(true)
      setError(null)

      try {
        const response = await api.spaces.list(user.orgId as string)

        if (!cancelled) {
          setSpaces(response.spaces)
        }
      } catch (err) {
        console.error('Failed to fetch spaces:', err)

        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load spaces',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSpaces(false)
        }
      }
    }

    fetchSpaces()

    return () => {
      cancelled = true
    }
  }, [user?.orgId, authLoading])

  // Fetch availability for a single space and date.
  const fetchSpaceAvailabilityForDate = useCallback(
    async (spaceId: string, date: Date) => {
      if (!user?.orgId) return

      try {
        const dateStr = formatDate(date)
        const response = await api.spaces.get(user.orgId, spaceId)
        const space = response.space

        let bookedSlots: {
          startTime: string
          endTime: string
          renterName: string
          renterEmail: string
          status: string
          bookingId: string
        }[] = []

        try {
          const bookingsResponse = await api.apiFetch<{
            bookings?: Array<{
              id: string
              startTime: string
              endTime: string
              renterName: string
              renterEmail: string
              status: string
            }>
          }>(
            `/api/organizations/${user.orgId}/bookings?date=${dateStr}&spaceId=${spaceId}`,
          )

          if (bookingsResponse?.bookings) {
            bookedSlots = bookingsResponse.bookings.map((booking) => ({
              startTime: booking.startTime,
              endTime: booking.endTime,
              renterName: booking.renterName,
              renterEmail: booking.renterEmail,
              status: booking.status,
              bookingId: booking.id,
            }))
          }
        } catch (err) {
          // Preserve the existing behavior if the bookings endpoint fails.
          console.debug('Could not fetch bookings:', err)
        }

        const lookup: SlotLookup = {}

        generateTimeSlots().forEach((startTime) => {
          const endTime = getEndTime(startTime)
          const key = `${spaceId}|${startTime}`

          const slotStart = new Date(`2000-01-01T${startTime}`)
          const booking = bookedSlots.find((item) => {
            const bookingStart = new Date(`2000-01-01T${item.startTime}`)
            const bookingEnd = new Date(`2000-01-01T${item.endTime}`)

            return (
              item.startTime === startTime ||
              (bookingStart <= slotStart && bookingEnd > slotStart)
            )
          })

          lookup[key] = {
            startTime,
            endTime,
            price: space.hourlyRate,
            ...(booking
              ? {
                  renterName: booking.renterName,
                  renterEmail: booking.renterEmail,
                  bookingId: booking.bookingId,
                  status: booking.status as AvailabilitySlot['status'],
                }
              : {
                  isAvailable: true,
                }),
          }
        })

        setSlotLookups((previous) => ({
          ...previous,
          [spaceId]: lookup,
        }))
      } catch (err) {
        console.error(
          `Failed to fetch availability for space ${spaceId}:`,
          err,
        )

        setError(
          `Failed to load calendar: ${
            err instanceof Error ? err.message : 'Unknown error'
          }`,
        )
      }
    },
    [user?.orgId],
  )

  // Initial availability load and refresh whenever the selected date changes.
  useEffect(() => {
    if (isLoadingSpaces || !user?.orgId) return

    let cancelled = false

    const fetchAll = async () => {
      setIsLoadingSlots(true)
      setError(null)

      await Promise.all(
        spaces.map((space) =>
          fetchSpaceAvailabilityForDate(space.id, selectedDate),
        ),
      )

      if (!cancelled) {
        setIsLoadingSlots(false)
      }
    }

    fetchAll()

    return () => {
      cancelled = true
    }
  }, [
    spaces,
    user?.orgId,
    isLoadingSpaces,
    selectedDate,
    fetchSpaceAvailabilityForDate,
  ])

  // Re-fetch the relevant space when its availability stream updates.
  const createStreamCallback = useCallback(
    (spaceId: string) => () =>
      fetchSpaceAvailabilityForDate(spaceId, selectedDate),
    [fetchSpaceAvailabilityForDate, selectedDate],
  )

  // Keep the existing fixed hook calls to satisfy React's hook rules.
  useSlotStream(spaces[0]?.id || '', createStreamCallback(spaces[0]?.id || ''))
  useSlotStream(spaces[1]?.id || '', createStreamCallback(spaces[1]?.id || ''))
  useSlotStream(spaces[2]?.id || '', createStreamCallback(spaces[2]?.id || ''))
  useSlotStream(spaces[3]?.id || '', createStreamCallback(spaces[3]?.id || ''))
  useSlotStream(spaces[4]?.id || '', createStreamCallback(spaces[4]?.id || ''))
  useSlotStream(spaces[5]?.id || '', createStreamCallback(spaces[5]?.id || ''))
  useSlotStream(spaces[6]?.id || '', createStreamCallback(spaces[6]?.id || ''))
  useSlotStream(spaces[7]?.id || '', createStreamCallback(spaces[7]?.id || ''))
  useSlotStream(spaces[8]?.id || '', createStreamCallback(spaces[8]?.id || ''))
  useSlotStream(spaces[9]?.id || '', createStreamCallback(spaces[9]?.id || ''))

  const handlePrevDay = () => {
    setSelectedDate((previous) => {
      const next = new Date(previous)
      next.setDate(next.getDate() - 1)
      return next
    })
  }

  const handleNextDay = () => {
    setSelectedDate((previous) => {
      const next = new Date(previous)
      next.setDate(next.getDate() + 1)
      return next
    })
  }

  const handleToday = () => {
    setSelectedDate(new Date())
  }

  const handleSlotClick = (spaceId: string, slot: AvailabilitySlot) => {
    if (slot.bookingId) {
      setSelectedBookingId(slot.bookingId)
      return
    }

    // Slot creation is not implemented here; preserve the existing behavior.
    console.log('Available slot clicked:', {
      spaceId,
      startTime: slot.startTime,
      endTime: slot.endTime,
    })
  }

  const handleDrawerClose = () => {
    setSelectedBookingId(null)
  }

  const handleStatusChange = async () => {
    const bookingSpaceId = Object.entries(slotLookups).find(([, lookup]) =>
      Object.values(lookup).some(
        (slot) => slot.bookingId === selectedBookingId,
      ),
    )?.[0]

    if (bookingSpaceId) {
      await fetchSpaceAvailabilityForDate(bookingSpaceId, selectedDate)
    }
  }

  const slotStats = useMemo(() => {
    const slots = Object.values(slotLookups).flatMap((lookup) =>
      Object.values(lookup),
    )

    return {
      available: slots.filter((slot) => !slot.bookingId).length,
      booked: slots.filter((slot) => Boolean(slot.bookingId)).length,
    }
  }, [slotLookups])

  // Loading state.
  if (authLoading || isLoadingSpaces) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-20 rounded-sharp bg-surface-elevated" />
          <div className="h-9 w-64 max-w-full rounded-sharp bg-surface-elevated" />
          <div className="h-4 w-80 max-w-full rounded-sharp bg-surface-elevated" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-sharp border border-border bg-surface"
            />
          ))}
        </div>

        <div className="overflow-hidden rounded-sharp border border-border bg-surface p-4">
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, rowIndex) => (
              <div
                key={rowIndex}
                className="grid grid-cols-3 gap-2"
              >
                {Array.from({ length: 3 }).map((_, columnIndex) => (
                  <div
                    key={columnIndex}
                    className="h-14 animate-pulse rounded-object bg-surface-elevated"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Empty state.
  if (spaces.length === 0) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center border border-border bg-surface px-6 py-16 text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center border border-border bg-paper text-text-secondary">
          <CalendarDays size={23} strokeWidth={1.5} />
        </div>

        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
          Your workspace
        </p>

        <h1 className="font-display text-3xl text-ink">
          No spaces yet
        </h1>

        <p className="mt-3 max-w-sm text-sm leading-6 text-text-secondary">
          Create your first space to manage availability, review reservations,
          and keep your booking schedule organized.
        </p>

        <Link
          href="/dashboard/spaces/new"
          className="mt-7 inline-flex items-center gap-2 bg-ink px-4 py-3 text-sm font-medium text-paper transition-colors hover:bg-signal"
        >
          <Plus size={16} />
          Add your first space
          <ArrowRight size={15} />
        </Link>
      </div>
    )
  }

  return (
    <div
      className={`min-w-0 transition-[margin] duration-300 ${
        selectedBookingId ? 'lg:mr-[420px]' : ''
      }`}
    >
      {/* Page heading */}
      <section className="border-b border-border pb-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
              <span className="h-px w-5 bg-signal" />
              Workspace / Bookings
            </div>

            <h1 className="font-display text-3xl leading-tight tracking-tight text-ink sm:text-4xl">
              Availability
              <span className="text-text-muted"> calendar.</span>
            </h1>

            <p className="mt-2 max-w-md text-sm leading-6 text-text-secondary">
              Monitor your spaces, review reservations, and manage the day
              ahead.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleToday}
              disabled={isToday}
              className="h-10 border border-border px-3 text-xs font-semibold text-text-secondary transition-colors hover:border-ink hover:text-ink disabled:cursor-default disabled:bg-surface-elevated disabled:text-text-muted"
            >
              Today
            </button>

            <div className="flex h-10 items-center border border-border bg-surface">
              <button
                type="button"
                onClick={handlePrevDay}
                aria-label="Previous day"
                className="flex h-full w-10 items-center justify-center border-r border-border text-text-secondary transition-colors hover:bg-paper hover:text-ink"
              >
                <ChevronLeft size={17} />
              </button>

              <button
                type="button"
                onClick={handleToday}
                className="flex min-w-[135px] items-center justify-center gap-2 px-3 text-xs font-semibold tabular-nums text-ink"
                aria-label="Return to today"
              >
                <CalendarDays size={15} className="text-signal" />
                {formatDisplayDate(selectedDate)}
              </button>

              <button
                type="button"
                onClick={handleNextDay}
                aria-label="Next day"
                className="flex h-full w-10 items-center justify-center border-l border-border text-text-secondary transition-colors hover:bg-paper hover:text-ink"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Summary */}
      <section className="grid grid-cols-1 gap-3 py-5 sm:grid-cols-3">
        <div className="relative overflow-hidden border border-border bg-surface p-4 sm:p-5">
          <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-ink" />

          <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              Total spaces
            </p>
            <Layers3 size={17} className="text-text-muted" strokeWidth={1.6} />
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-display text-4xl leading-none text-ink">
              {spaces.length.toString().padStart(2, '0')}
            </span>
            <span className="text-xs text-text-muted">
              {spaces.length === 1 ? 'space' : 'spaces'}
            </span>
          </div>

          <p className="mt-3 text-xs text-text-secondary">
            Available for scheduling
          </p>
        </div>

        <div className="relative overflow-hidden border border-border bg-surface p-4 sm:p-5">
          <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-success" />

          <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              Open slots
            </p>
            <span className="mt-1 h-2 w-2 rounded-full bg-success" />
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-display text-4xl leading-none text-ink">
              {slotStats.available.toString().padStart(2, '0')}
            </span>
            <span className="text-xs text-text-muted">half-hour slots</span>
          </div>

          <p className="mt-3 text-xs text-text-secondary">
            Across loaded spaces
          </p>
        </div>

        <div className="relative overflow-hidden border border-border bg-surface p-4 sm:p-5">
          <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-signal" />

          <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              Booked slots
            </p>
            <span className="mt-1 h-2 w-2 rounded-full bg-signal" />
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-display text-4xl leading-none text-ink">
              {slotStats.booked.toString().padStart(2, '0')}
            </span>
            <span className="text-xs text-text-muted">half-hour slots</span>
          </div>

          <p className="mt-3 text-xs text-text-secondary">
            Includes occupied time intervals
          </p>
        </div>
      </section>

      {/* Calendar section heading and legend */}
      <section className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-sm font-semibold text-ink">
            Daily schedule
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            {formatDate(selectedDate)} <span className="mx-1.5">/</span>{' '}
            {formatTime('09:00')} – {formatTime('21:00')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2 text-[11px] text-text-secondary">
            <span className="h-2.5 w-2.5 border border-success bg-success/15" />
            Available
          </div>

          <div className="flex items-center gap-2 text-[11px] text-text-secondary">
            <span className="h-2.5 w-2.5 border border-signal bg-signal/15" />
            Booked
          </div>

          <div className="flex items-center gap-2 text-[11px] text-text-secondary">
            <span className="h-2.5 w-2.5 border border-border bg-surface-elevated" />
            Other
          </div>
        </div>
      </section>

      {/* Errors */}
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start justify-between gap-3 border border-error/30 bg-error/5 px-4 py-3 text-sm text-error"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            className="shrink-0 text-xs font-semibold underline underline-offset-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Calendar */}
      <section className="overflow-hidden border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <Clock3 size={15} className="text-text-muted" />
            <span className="text-xs font-semibold text-ink">
              {timeSlots.length} time intervals
            </span>
            <span className="text-xs text-text-muted">
              · 30-minute increments
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-text-muted">
            {isLoadingSlots ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                Updating schedule
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Schedule loaded
              </>
            )}
          </div>
        </div>

        {isLoadingSlots ? (
          <div className="space-y-2 p-3 sm:p-4">
            <div className="flex gap-2">
              <div className="h-14 w-16 shrink-0 animate-pulse bg-surface-elevated" />
              {spaces.map((space) => (
                <div
                  key={space.id}
                  className="h-14 min-w-[190px] flex-1 animate-pulse bg-surface-elevated"
                />
              ))}
            </div>

            {Array.from({ length: 8 }).map((_, rowIndex) => (
              <div key={rowIndex} className="flex gap-2">
                <div className="h-16 w-16 shrink-0 animate-pulse bg-surface-elevated" />
                {spaces.map((space) => (
                  <div
                    key={space.id}
                    className="h-16 min-w-[190px] flex-1 animate-pulse bg-surface-elevated"
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div
              className="min-w-full"
              style={{
                minWidth: `${80 + spaces.length * 210}px`,
              }}
            >
              {/* Space headers */}
              <div
                className="sticky top-0 z-20 grid border-b border-border bg-surface"
                style={{
                  gridTemplateColumns: `80px repeat(${spaces.length}, minmax(210px, 1fr))`,
                }}
              >
                <div className="sticky left-0 z-30 flex items-center border-r border-border bg-paper px-3 py-4">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                    Time
                  </span>
                </div>

                {spaces.map((space, index) => (
                  <div
                    key={space.id}
                    className={`min-w-0 px-3 py-3.5 sm:px-4 ${
                      index > 0 ? 'border-l border-border' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-paper font-display text-sm text-text-secondary">
                        {getSpaceTypeCode(space.type)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3
                          className="truncate text-[13px] font-semibold text-ink"
                          title={space.name}
                        >
                          {space.name}
                        </h3>

                        <p className="mt-1 truncate text-[11px] text-text-muted">
                          {getSpaceTypeLabel(space.type)}
                        </p>

                        <p className="mt-2 text-xs font-medium tabular-nums text-text-secondary">
                          ₹{(space.hourlyRate).toLocaleString('en-IN')}
                          <span className="ml-1 font-normal text-text-muted">
                            / hour
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Time slots */}
              <div className="grid">
                {timeSlots.map((startTime, index) => {
                  const hourLabel =
                    startTime.endsWith(':00')
                      ? formatTime(startTime)
                      : null

                  return (
                    <div
                      key={startTime}
                      className="grid"
                      style={{
                        gridTemplateColumns: `80px repeat(${spaces.length}, minmax(210px, 1fr))`,
                      }}
                    >
                      <div
                        className={`sticky left-0 z-10 flex min-h-[76px] flex-col justify-start border-b border-r border-border px-2.5 py-3 ${
                          index % 2 === 0 ? 'bg-paper' : 'bg-surface'
                        }`}
                      >
                        <span className="text-[11px] font-semibold tabular-nums text-ink">
                          {hourLabel ?? startTime}
                        </span>

                        {hourLabel && (
                          <span className="mt-1 text-[9px] uppercase tracking-wide text-text-muted">
                            {startTime.slice(0, 2) < '12' ? 'Morning' : startTime.slice(0, 2) < '17' ? 'Afternoon' : 'Evening'}
                          </span>
                        )}
                      </div>

                      {spaces.map((space) => {
                        const key = `${space.id}|${startTime}`
                        const slot = slotLookups[space.id]?.[key]

                        return (
                          <div
                            key={key}
                            className={`min-w-0 border-b border-l border-border p-1.5 sm:p-2 ${
                              index % 2 === 0 ? 'bg-surface' : 'bg-paper/40'
                            }`}
                          >
                            {slot ? (
                              <SlotCell
                                startTime={startTime}
                                endTime={slot.endTime}
                                price={slot.price}
                                state={slot.bookingId ? 'booked' : 'available'}
                                booking={
                                  slot.bookingId
                                    ? {
                                        renterName:
                                          slot.renterName || 'Unknown',
                                        status:
                                          slot.status || 'pending',
                                      }
                                    : undefined
                                }
                                onClick={() =>
                                  handleSlotClick(space.id, slot)
                                }
                              />
                            ) : (
                              <div className="flex min-h-[60px] items-center justify-center border border-dashed border-border/70 text-[10px] text-text-muted">
                                <span className="hidden sm:inline">
                                  No slot data
                                </span>
                                <span className="sm:hidden">—</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Calendar footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-paper/70 px-4 py-3 sm:px-5">
          <p className="text-[11px] leading-5 text-text-muted">
            Select a booked slot to view its reservation details.
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevDay}
              className="flex h-8 items-center gap-1 border border-border bg-surface px-2.5 text-[11px] font-medium text-text-secondary transition-colors hover:border-ink hover:text-ink"
            >
              <ArrowLeft size={13} />
              Previous
            </button>

            <button
              type="button"
              onClick={handleNextDay}
              className="flex h-8 items-center gap-1 border border-border bg-surface px-2.5 text-[11px] font-medium text-text-secondary transition-colors hover:border-ink hover:text-ink"
            >
              Next
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </section>

      {/* Booking detail drawer */}
      <BookingDrawer
        bookingId={selectedBookingId}
        onClose={handleDrawerClose}
        onStatusChange={handleStatusChange}
      />
    </div>
  )
}