'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { FullPageSkeleton } from '@/components/ui/FullPageSkeleton'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [user, isLoading, router])

  // Show skeleton while loading to prevent flash redirect
  if (isLoading) {
    return <FullPageSkeleton />
  }

  // If not loading and no user, return null (redirect happening via useEffect)
  if (!user) {
    return null
  }

  return <>{children}</>
}
