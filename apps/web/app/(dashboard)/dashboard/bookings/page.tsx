'use client'

import React , { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useSlotStream } from '@/hooks/useSlotStream'
import { SlotCell } from '@/components/calendar/SlotCell'
import { BookingDrawer } from '@/components/dashboard/BookingDrawer'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
  status?: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show'
  isAvailable?: boolean
}

interface SlotLookup {
  [key: string]: AvailabilitySlot & { price: number }
}

const SLOT_DURATION_MINUTES = 30
const DEFAULT_OPEN_HOUR = 9
const DEFAULT_CLOSE_HOUR = 21

function generateTimeSlots(openHour: number = DEFAULT_OPEN_HOUR, closeHour: number = DEFAULT_CLOSE_HOUR): string[] {
  const slots: string[] = []
  for (let h = openHour; h < closeHour; h++) {
    for (let m = 0; m < 60; m += SLOT_DURATION_MINUTES) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return slots
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  })
}

// Generate end time from start time (30 minutes later)
function getEndTime(startTime: string): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const nextMinutes = minutes + 30
  if (nextMinutes >= 60) {
    const nextHours = (hours + 1) % 24
    return `${String(nextHours).padStart(2, '0')}:00`
  }
  return `${String(hours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`
}

export default function BookingsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [slotLookups, setSlotLookups] = useState<Record<string, SlotLookup>>({})
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(true)
  const [isLoadingSlots, setIsLoadingSlots] = useState(true)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('')

  // Guard against missing orgId
  useEffect(() => {
    if (authLoading) return
    if (!user?.orgId) {
      router.push('/onboarding')
      return
    }
  }, [user, authLoading, router])

  // Fetch spaces
  useEffect(() => {
    if (authLoading || !user?.orgId) return

    const fetchSpaces = async () => {
      try {
        setError(null)
        const response = await api.spaces.list(user.orgId as string)
        setSpaces(response.spaces)
        setDebugInfo(`Loaded ${response.spaces.length} spaces`)
      } catch (err) {
        console.error('Failed to fetch spaces:', err)
        setError(err instanceof Error ? err.message : 'Failed to load spaces')
      } finally {
        setIsLoadingSpaces(false)
      }
    }

    fetchSpaces()
  }, [user?.orgId, authLoading])

  // Fetch availability for a single space (for date changes)
  const fetchSpaceAvailabilityForDate = useCallback(
    async (spaceId: string, date: Date) => {
      if (!user?.orgId) return

      try {
        const dateStr = formatDate(date)
        const response = await api.spaces.get(user.orgId, spaceId)
        const space = response.space

        // Try to fetch bookings for this space on the selected date
        let bookedSlots: { startTime: string; endTime: string; renterName: string; renterEmail: string; status: string; bookingId: string }[] = []
        
        try {
          const bookingsResponse = await api.apiFetch<any>(
            `/api/organizations/${user.orgId}/bookings?date=${dateStr}&spaceId=${spaceId}`
          )
          
          if (bookingsResponse?.bookings) {
            bookedSlots = bookingsResponse.bookings.map((booking: any) => ({
              startTime: booking.startTime,
              endTime: booking.endTime,
              renterName: booking.renterName,
              renterEmail: booking.renterEmail,
              status: booking.status,
              bookingId: booking.id,
            }))
          }
        } catch (err) {
          // Bookings endpoint may not exist or fail, continue with empty bookings
          console.debug('Could not fetch bookings:', err)
        }

        // Generate all possible slots for the day
        const timeSlots = generateTimeSlots()
        const lookup: SlotLookup = {}

        timeSlots.forEach((startTime) => {
          const endTime = getEndTime(startTime)
          const key = `${spaceId}|${startTime}`

          // Check if this time slot is booked
          const booking = bookedSlots.find(
            (b) => b.startTime === startTime || 
                   (new Date(`2000-01-01T${b.startTime}`) <= new Date(`2000-01-01T${startTime}`) && 
                    new Date(`2000-01-01T${b.endTime}`) > new Date(`2000-01-01T${startTime}`))
          )

          lookup[key] = {
            startTime,
            endTime,
            price: space.hourlyRate,
            ...(booking ? {
              renterName: booking.renterName,
              renterEmail: booking.renterEmail,
              bookingId: booking.bookingId,
              status: booking.status as any,
            } : {
              isAvailable: true,
            }),
          }
        })

        setSlotLookups((prev) => ({
          ...prev,
          [spaceId]: lookup,
        }))

        setDebugInfo(`Loaded slots for space ${space.name}: ${timeSlots.length} total, ${bookedSlots.length} booked`)
      } catch (err) {
        console.error(`Failed to fetch availability for space ${spaceId}:`, err)
        setError(`Failed to load calendar: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    },
    [user?.orgId]
  )

  // Wrapper that uses current selectedDate (for stream callbacks)
  const fetchSpaceAvailability = useCallback(
    (spaceId: string) => fetchSpaceAvailabilityForDate(spaceId, selectedDate),
    [selectedDate, fetchSpaceAvailabilityForDate]
  )

  // Initial fetch of all spaces' availability
  useEffect(() => {
    if (isLoadingSpaces || !user?.orgId) return

    setIsLoadingSlots(true)
    const fetchAll = async () => {
      await Promise.all(spaces.map((space) => fetchSpaceAvailabilityForDate(space.id, selectedDate)))
      setIsLoadingSlots(false)
    }

    fetchAll()
  }, [spaces, user?.orgId, isLoadingSpaces, selectedDate, fetchSpaceAvailabilityForDate])

  // Set up real-time stream for each space (up to 10)
  const createStreamCallback = useCallback(
    (spaceId: string) => () => fetchSpaceAvailabilityForDate(spaceId, selectedDate),
    [fetchSpaceAvailabilityForDate, selectedDate]
  )

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
    setSelectedDate((prev) => {
      const newDate = new Date(prev)
      newDate.setDate(newDate.getDate() - 1)
      return newDate
    })
  }

  const handleNextDay = () => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev)
      newDate.setDate(newDate.getDate() + 1)
      return newDate
    })
  }

  const handleToday = () => {
    setSelectedDate(new Date())
  }

  const handleSlotClick = (spaceId: string, slot: AvailabilitySlot) => {
    if (slot.bookingId) {
      setSelectedBookingId(slot.bookingId)
    } else {
      console.log('Available slot clicked:', { spaceId, startTime: slot.startTime, endTime: slot.endTime })
    }
  }

  const handleDrawerClose = () => {
    setSelectedBookingId(null)
  }

  const handleStatusChange = async () => {
    const bookingSpaceId = Object.entries(slotLookups).find(
      ([, lookup]) => Object.values(lookup).some((slot) => slot.bookingId === selectedBookingId)
    )?.[0]

    if (bookingSpaceId) {
      await fetchSpaceAvailabilityForDate(bookingSpaceId, selectedDate)
    }
  }

  const timeSlots = generateTimeSlots()
  const isToday = formatDate(selectedDate) === formatDate(new Date())

  // Loading state
  if (authLoading || isLoadingSpaces) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-surface-elevated rounded-sharp w-32 animate-pulse" />
        <div className="grid gap-px" style={{ gridTemplateColumns: `minmax(80px, 1fr) repeat(3, 1fr)` }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-surface-elevated rounded-sharp animate-pulse" />
          ))}
          {Array.from({ length: 4 * 12 }).map((_, i) => (
            <div key={i} className="h-12 bg-surface-elevated rounded-sharp animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Empty state
  if (spaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-surface border border-border rounded-sharp">
        <h2 className="text-lg font-semibold text-ink mb-2">No spaces yet</h2>
        <p className="text-text-muted text-sm mb-6">Add one to start taking bookings</p>
        <Link
          href="/dashboard/spaces/new"
          className="px-4 py-2 bg-ink text-paper rounded-sharp text-sm font-medium hover:bg-[#2e2d2a] transition-colors"
        >
          Add your first space
        </Link>
      </div>
    )
  }

  return (
    <div className={`transition-all duration-300 ${selectedBookingId ? 'mr-0 lg:mr-[420px]' : ''}`}>
      {/* Page Header */}
      <div className="mb-6 border-b border-border pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">Bookings</p>
            <h1 className="font-display text-2xl leading-tight text-ink">Availability Calendar</h1>
          </div>
          
          {/* Compact Date Picker */}
          <div className="flex items-center gap-2 rounded-sharp border border-border bg-surface px-3 py-2 shadow-sm">
            <button
              onClick={handlePrevDay}
              className="rounded-sharp p-1 transition-colors hover:bg-paper"
              aria-label="Previous day"
            >
              <ChevronLeft size={16} className="text-text-muted" />
            </button>

            <button
              onClick={handleToday}
              className={`px-3 py-1 text-xs font-medium rounded-sharp transition-colors ${
                isToday 
                  ? 'bg-signal text-surface' 
                  : 'text-text-secondary hover:bg-paper'
              }`}
            >
              {isToday ? 'Today' : formatDisplayDate(selectedDate)}
            </button>

            <button
              onClick={handleNextDay}
              className="rounded-sharp p-1 transition-colors hover:bg-paper"
              aria-label="Next day"
            >
              <ChevronRight size={16} className="text-text-muted" />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        {!isLoadingSlots && spaces.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success/20 border border-success" />
              <span className="text-text-muted">
                {Object.values(slotLookups).reduce((acc, lookup) => 
                  acc + Object.values(lookup).filter(s => !s.bookingId).length, 0
                )} Available
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-signal/20 border border-signal" />
              <span className="text-text-muted">
                {Object.values(slotLookups).reduce((acc, lookup) => 
                  acc + Object.values(lookup).filter(s => s.bookingId).length, 0
                )} Booked
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Debug Info */}
      {debugInfo && (
        <div className="mb-4 p-3 bg-info/10 border border-info rounded-sharp text-info text-xs">
          {debugInfo}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-sharp text-error text-sm">
          {error}
        </div>
      )}

      {/* Calendar Grid */}
      {isLoadingSlots ? (
        <div className="overflow-hidden rounded-sharp border border-border bg-surface p-4 shadow-float">
          <div className="space-y-2">
            {/* Header skeleton */}
            <div className="grid gap-2" style={{ gridTemplateColumns: `80px repeat(${spaces.length}, 1fr)` }}>
              {Array.from({ length: spaces.length + 1 }).map((_, i) => (
                <div key={`header-${i}`} className="h-10 animate-pulse rounded-sharp bg-surface-elevated" />
              ))}
            </div>
            {/* Rows skeleton */}
            {Array.from({ length: 6 }).map((_, rowIdx) => (
              <div key={`row-${rowIdx}`} className="grid gap-2" style={{ gridTemplateColumns: `80px repeat(${spaces.length}, 1fr)` }}>
                {Array.from({ length: spaces.length + 1 }).map((_, i) => (
                  <div key={`cell-${i}`} className="h-16 animate-pulse rounded-object bg-surface-elevated" />
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-sharp border border-border bg-surface shadow-float">
          {/* Sticky header */}
          <div className="sticky top-0 z-10 border-b border-border bg-surface">
            <div
              className="grid gap-px"
              style={{ gridTemplateColumns: `80px repeat(${spaces.length}, minmax(200px, 1fr))` }}
            >
              {/* Time column header */}
              <div className="bg-surface px-3.5 py-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                Time
              </div>
              
              {/* Space column headers */}
              {spaces.map((space) => (
                <div
                  key={`header-${space.id}`}
                  className="border-l border-border/50 bg-surface px-4 py-3.5"
                >
                  <div className="truncate text-[13px] font-semibold text-ink" title={space.name}>
                    {space.name}
                  </div>
                  <div className="mt-1 text-[11px] text-text-muted">
                    {space.type === 'podcast' && '🎙️ Podcast'}
                    {space.type === 'photography' && '📷 Photography'}
                    {space.type === 'gaming' && '🎮 Gaming'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Calendar body */}
          <div className="overflow-x-auto">
            <div
              className="grid"
              style={{ gridTemplateColumns: `80px repeat(${spaces.length}, minmax(200px, 1fr))` }}
            >
              {/* Rows: Time slots */}
              {timeSlots.map((startTime, idx) => (
                <React.Fragment key={`row-${startTime}`}>
                  {/* Time label */}
                  <div className={`sticky left-0 z-10 border-t border-border/30 p-3 text-xs font-medium text-text-muted ${
                    idx % 2 === 0 ? 'bg-paper/70' : 'bg-paper/50'
                  }`}>
                    <div className="tabular-nums font-semibold">{startTime}</div>
                  </div>

                  {/* Cells for each space */}
                  {spaces.map((space) => {
                    const key = `${space.id}|${startTime}`
                    const slot = slotLookups[space.id]?.[key]

                    return (
                      <div
                        key={key}
                        className={`border-t border-l border-border/30 p-1.5 transition-colors ${
                          idx % 2 === 0 ? 'bg-surface' : 'bg-surface/70'
                        }`}
                      >
                        {!slot ? (
                          <div className="h-16 flex items-center justify-center text-xs text-text-muted rounded-object border border-dashed border-border/50">
                            Loading...
                          </div>
                        ) : (
                          <SlotCell
                            startTime={startTime}
                            endTime={slot.endTime}
                            price={slot.price}
                            state={slot.bookingId ? 'booked' : 'available'}
                            booking={
                              slot.bookingId
                                ? {
                                    renterName: slot.renterName || 'Unknown',
                                    status: slot.status as 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show',
                                  }
                                : undefined
                            }
                            onClick={() => handleSlotClick(space.id, slot)}
                          />
                        )}
                      </div>
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Booking Drawer */}
      <BookingDrawer
        bookingId={selectedBookingId}
        onClose={handleDrawerClose}
        onStatusChange={handleStatusChange}
      />
    </div>
  )
}
