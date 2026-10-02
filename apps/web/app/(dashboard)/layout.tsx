'use client'

import React from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Header } from '@/components/dashboard/Header'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ProtectedRoute>
      <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-paper">
        {/* Sidebar (collapsible on hover, responsive on mobile) */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 lg:px-10">
            <div className="max-w-6xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
