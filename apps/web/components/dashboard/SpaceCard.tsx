'use client'

import Link from 'next/link'
import { formatCurrency } from '@/lib/currency'

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

interface SpaceCardProps {
  space: Space
}

const TYPE_LABELS: Record<Space['type'], string> = {
  podcast: 'Podcast',
  photography: 'Photography',
  gaming: 'Gaming',
}

const TYPE_COLORS: Record<Space['type'], string> = {
  podcast: 'bg-info/10 text-info',
  photography: 'bg-warning/10 text-warning',
  gaming: 'bg-success/10 text-success',
}

export function SpaceCard({ space }: SpaceCardProps) {
  return (
    <div className="bg-surface border border-border rounded-sharp p-6 hover:border-ink transition-colors">
      {/* Header with name and type badge */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-medium text-ink truncate">{space.name}</h3>
        </div>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-object whitespace-nowrap ${TYPE_COLORS[
            space.type
          ]}`}
        >
          {TYPE_LABELS[space.type]}
        </span>
      </div>

      {/* Rates and capacity in a grid */}
      <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
        <div>
          <p className="text-text-muted text-xs mb-1">Hourly Rate</p>
          <p className="font-medium text-ink tabular-nums">
            {formatCurrency(space.hourlyRate)}
          </p>
        </div>
        <div>
          <p className="text-text-muted text-xs mb-1">Deposit</p>
          <p className="font-medium text-ink tabular-nums">
            {formatCurrency(space.depositRate)}
          </p>
        </div>
        <div>
          <p className="text-text-muted text-xs mb-1">Capacity</p>
          <p className="font-medium text-ink tabular-nums">{space.capacity}</p>
        </div>
      </div>

      {/* Edit link */}
      <Link
        href={`/dashboard/spaces/${space.id}/edit`}
        className="inline-flex items-center justify-center rounded-sharp border border-ink bg-ink px-4 py-2.5 text-sm font-medium leading-none text-paper transition-colors hover:bg-[#2e2d2a] active:bg-[#3d3c39]"
      >
        Edit
      </Link>
    </div>
  )
}
