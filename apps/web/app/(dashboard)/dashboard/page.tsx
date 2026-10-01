'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'

interface BookingResponse {
  id: string
  spaceId: string
  spaceName: string
  renterEmail: string
  renterName: string
  startTime: string
  endTime: string
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show'
  amount: number
  depositPaid: number
  createdAt: string
  updatedAt: string
}

const SKELETON_ROWS = 3
const ROW_HEIGHT = 64 

export default function DashboardPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<BookingResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.orgId) {
      setIsLoading(false)
      return
    }

    const fetchBookings = async () => {
      try {
        setError(null)
        const today = new Date()
        const dateStr = today.toISOString().split('T')[0]

        const response = await api.bookings.listByOrg(user.orgId!, dateStr)
        setBookings(response.bookings)
      } catch (err) {
        console.error('Failed to fetch bookings:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to load bookings'
        )
        setBookings([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchBookings()
  }, [user?.orgId])

  const getStatusColor = (
    status: BookingResponse['status']
  ): string => {
    switch (status) {
      case 'pending':
        return 'bg-warning/10 text-warning'
      case 'confirmed':
        return 'bg-signal/10 text-signal'
      case 'checked_in':
        return 'bg-info/10 text-info'
      case 'completed':
        return 'bg-success/10 text-success'
      case 'cancelled':
        return 'text-text-muted'
      case 'no_show':
        return 'bg-error/10 text-error'
      default:
        return 'bg-paper text-text-muted'
    }
  }

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-ink">Today's Bookings</h1>
        <p className="text-sm text-text-muted mt-2">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: SKELETON_ROWS }).map((_, idx) => (
            <div
              key={idx}
              className="h-16 bg-surface-elevated rounded-sharp animate-pulse"
              style={{ height: `${ROW_HEIGHT}px` }}
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="bg-error/10 border border-error rounded-sharp p-4 text-error text-sm">
          <p className="font-medium">Failed to load bookings</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && bookings.length === 0 && (
        <div className="bg-surface border border-border rounded-sharp p-8 text-center">
          <p className="text-text-muted">No bookings today</p>
        </div>
      )}

      {/* Bookings list */}
      {!isLoading && !error && bookings.length > 0 && (
        <div className="space-y-2">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="flex items-center justify-between bg-surface border border-border rounded-sharp p-4 hover:bg-paper transition-colors"
              style={{ minHeight: `${ROW_HEIGHT}px` }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-4">
                  {/* Time */}
                  <div className="text-sm font-medium text-ink tabular-nums whitespace-nowrap">
                    {formatTime(booking.startTime)} –{' '}
                    {formatTime(booking.endTime)}
                  </div>

                  {/* Space and renter */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {booking.spaceName}
                    </p>
                    <p className="text-xs text-text-muted truncate">
                      {booking.renterName || booking.renterEmail}
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount and status */}
              <div className="flex items-center gap-4 ml-4">
                <div className="text-sm font-medium text-ink tabular-nums whitespace-nowrap">
                  ₹{(booking.amount / 100).toFixed(0)}
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-object whitespace-nowrap ${getStatusColor(
                    booking.status
                  )}`}
                >
                  {booking.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}