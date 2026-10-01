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
      {/* 
        Layout approach: CSS Grid with named template areas
        
        Why Grid over Flexbox:
        - Grid excels at 2D layouts with fixed dimensions (sidebar 240px, header 64px)
        - Fixed sizes are fragile in flexbox (gap calculations, shrinking behavior)
        - Grid's template areas make the layout structure visually clear
        - The three regions (header, sidebar, main) are independent; grid manages them cleanly
        
        Structure:
        - Header spans full width at top (64px tall)
        - Sidebar fixed left below header (240px wide, dynamic height)
        - Main content fills remaining space with 32px padding
        - On mobile (<640px): sidebar hidden via `hidden md:block`
      */}
      <div
        className="grid h-screen"
        style={{
          gridTemplateColumns: '1fr',
          gridTemplateRows: '64px 1fr',
          gridTemplateAreas: `
            'header'
            'main'
          `,
        }}
      >
        {/* Header */}
        <div style={{ gridArea: 'header' }}>
          <Header />
        </div>

        {/* Main content area with sidebar overlay container */}
        <div
          className="grid"
          style={{
            gridArea: 'main',
            gridTemplateColumns: 'auto 1fr',
            gridTemplateAreas: `
              'sidebar main'
            `,
          }}
        >
          {/* Sidebar */}
          <div style={{ gridArea: 'sidebar' }}>
            <Sidebar />
          </div>

          {/* Main content */}
          <main
            className="bg-paper overflow-auto"
            style={{
              gridArea: 'main',
              paddingLeft: '32px',
              paddingRight: '32px',
              paddingTop: '32px',
              paddingBottom: '32px',
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
