import React from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

async function getStudios() {
  try {
    // Fetch all orgs - since there's no public list-all endpoint, 
    // we'll need to create one or use a workaround
    // For now, return empty and we'll add the endpoint
    return []
  } catch (error) {
    console.error('Failed to fetch studios:', error)
    return []
  }
}

export const metadata = {
  title: 'Book Your Slot | Perch',
  description: 'Browse and book available studio spaces from top creators and studios.',
}

export default async function StudiosPage() {
  const studios = await getStudios()

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <Link href="/" className="text-ink font-display text-2xl mb-8 inline-block hover:opacity-80">
            Perch
          </Link>
          <h1 className="font-display text-4xl md:text-5xl text-ink mb-4">
            Book your slot
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl">
            Browse available studios and spaces. Find the perfect spot for your next project.
          </p>
        </div>
      </div>

      {/* Studios Grid */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {studios.length === 0 ? (
          <div className="text-center py-16">
            <h2 className="text-xl font-semibold text-ink mb-2">No studios available yet</h2>
            <p className="text-text-secondary mb-6">Studios will appear here as owners create them.</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-paper rounded-sharp font-medium hover:bg-[#2e2d2a]"
            >
              Back to Home
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {studios.map((studio: any) => (
              <Link
                key={studio.id}
                href={`/studios/${studio.slug}`}
                className="group border border-border rounded-sharp overflow-hidden hover:border-ink transition-colors bg-surface"
              >
                {studio.photo && (
                  <div className="relative aspect-video bg-surface-elevated overflow-hidden">
                    <img
                      src={studio.photo}
                      alt={studio.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-ink mb-1">{studio.name}</h3>
                  <p className="text-sm text-text-secondary mb-4">
                    {studio.spaceCount} space{studio.spaceCount !== 1 ? 's' : ''}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-ink">
                    Browse spaces
                    <span>→</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
