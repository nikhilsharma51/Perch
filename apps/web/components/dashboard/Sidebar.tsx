'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import type { IconWeight } from 'phosphor-react'
import {
  House,
  Door,
  Calendar,
  Users,
  Gear,
} from 'phosphor-react'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ size: number; weight?: IconWeight; className?: string }>
  exactMatch?: boolean
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: House,
    exactMatch: true,
  },
  {
    label: 'Spaces',
    href: '/dashboard/spaces',
    icon: Door,
  },
  {
    label: 'Bookings',
    href: '/dashboard/bookings',
    icon: Calendar,
  },
  {
    label: 'Staff',
    href: '/dashboard/staff',
    icon: Users,
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Gear,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string, exactMatch?: boolean): boolean => {
    if (exactMatch) {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <aside className="hidden md:flex flex-col w-60 bg-paper border-r border-border h-screen fixed left-0 top-0 pt-20">
      <nav className="flex flex-col gap-1 px-4 py-6">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, item.exactMatch)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-sharp text-sm font-medium transition-colors ${
                active
                  ? 'bg-surface text-ink'
                  : 'text-secondary hover:text-ink hover:bg-surface'
              }`}
            >
              <Icon size={20} weight="regular" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
