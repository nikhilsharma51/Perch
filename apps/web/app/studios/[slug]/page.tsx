import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { api } from '@/lib/api'
import type { Space } from '@/lib/api'

interface StudioPageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({
  params,
}: StudioPageProps): Promise<Metadata> {
  const { slug } = await params

  try {
    const response = await api.public.getStudioBySlug(slug)
    const org = response.organization

    return {
      title: `${org.name} | Perch`,
      description: `Book ${org.name}'s studio space on Perch. Professional booking platform for creators.`,
    }
  } catch {
    return {
      title: 'Studio | Perch',
    }
  }
}

export default async function StudioPage({ params }: StudioPageProps) {
  const { slug } = await params

  let organization: {
    id: string
    name: string
    slug: string
    createdAt: string
    spaces: Space[]
  }

  try {
    const response = await api.public.getStudioBySlug(slug)
    organization = response.organization
  } catch {
    notFound()
  }

  const activeSpaces = organization.spaces || []

  return (
    <div className="w-full bg-paper">
      {/* Full-bleed header */}
      <div className="relative w-full h-80 bg-gradient-to-br from-ink to-[#2e2d2a] flex items-end justify-start overflow-hidden">
        <div className="relative z-10 px-8 md:px-12 pb-12 max-w-4xl">
          <h1 className="font-display text-5xl md:text-6xl leading-tight text-paper mb-4">
            {organization.name}
          </h1>
          <p className="text-lg text-text-muted max-w-2xl">
            Professional studio space for creators, available for hourly booking
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="px-8 md:px-12 py-12 max-w-6xl mx-auto">
        {activeSpaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <h2 className="text-lg font-semibold text-ink mb-2">
              No spaces available right now
            </h2>
            <p className="text-text-muted">
              Check back soon for availability
            </p>
          </div>
        ) : (
          <div>
            <h2 className="font-display text-3xl text-ink mb-8">
              Available Spaces
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {activeSpaces.map((space) => (
                <SpaceCard key={space.id} space={space} slug={slug} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface SpaceCardProps {
  space: Space
  slug: string
}

function SpaceCard({ space, slug }: SpaceCardProps) {
  const hourlyRate = space.hourlyRate
  const depositAmount = space.depositRate

  const typeColors: Record<string, { bg: string; text: string }> = {
    podcast: { bg: 'bg-info/10', text: 'text-info' },
    photography: { bg: 'bg-signal/10', text: 'text-signal' },
    gaming: { bg: 'bg-success/10', text: 'text-success' },
  }

  const typeColor = typeColors[space.type] || typeColors.podcast

  return (
    <div className="group border border-border rounded-sharp overflow-hidden hover:border-ink transition-colors bg-surface shadow-float hover:shadow-float">
      {/* Image */}
      {space.imageUrl && (
        <div className="relative aspect-video bg-surface-elevated overflow-hidden">
          <img
            src={space.imageUrl}
            alt={space.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-semibold text-ink mb-1">
              {space.name}
            </h3>
            <div
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-object text-xs font-medium ${typeColor.bg} ${typeColor.text}`}
            >
              <div className={`size-1.5 rounded-full ${typeColor.text}`} />
              {space.type.charAt(0).toUpperCase() + space.type.slice(1)}
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-6 text-sm">
          <div className="flex justify-between text-text-secondary">
            <span>Hourly rate:</span>
            <span className="tabular font-medium text-ink">
              ₹{hourlyRate.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Security deposit:</span>
            <span className="tabular font-medium text-ink">
              ₹{depositAmount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Capacity:</span>
            <span className="font-medium text-ink">{space.capacity} person{space.capacity !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <a
          href={`/studios/${slug}/spaces/${space.id}`}
          className="block w-full text-center px-4 py-2.5 bg-ink text-paper rounded-sharp text-sm font-medium hover:bg-[#2e2d2a] active:bg-[#3d3c39] transition-colors"
        >
          Book Now
        </a>
      </div>
    </div>
  )
}
