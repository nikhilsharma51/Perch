'use client'

import { cn } from '@/lib/utils'
import Link, { type LinkProps } from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useState, createContext, useContext } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import {
  House,
  Door,
  Calendar,
  Users,
  Gear,
} from 'phosphor-react'

export interface Links {
  label: string
  href: string
  icon: React.JSX.Element | React.ReactNode
  exactMatch?: boolean
}

export type NavItem = Links

export const NAV_ITEMS: Links[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <House size={20} weight="regular" className="flex-shrink-0" />,
    exactMatch: true,
  },
  {
    label: 'Spaces',
    href: '/dashboard/spaces',
    icon: <Door size={20} weight="regular" className="flex-shrink-0" />,
  },
  {
    label: 'Bookings',
    href: '/dashboard/bookings',
    icon: <Calendar size={20} weight="regular" className="flex-shrink-0" />,
  },
  {
    label: 'Staff',
    href: '/dashboard/staff',
    icon: <Users size={20} weight="regular" className="flex-shrink-0" />,
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: <Gear size={20} weight="regular" className="flex-shrink-0" />,
  },
]

interface SidebarContextProps {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  animate: boolean
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
)

export const useSidebar = () => {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode
  open?: boolean
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>
  animate?: boolean
}) => {
  const [openState, setOpenState] = useState(false)

  const open = openProp !== undefined ? openProp : openState
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children?: React.ReactNode
  open?: boolean
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>
  animate?: boolean
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children ?? <DefaultDashboardSidebar />}
    </SidebarProvider>
  )
}

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<'div'>)} />
    </>
  )
}

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar()
  return (
    <motion.div
      className={cn(
        'h-full min-h-[calc(100vh-64px)] px-3 py-4 hidden md:flex md:flex-col bg-paper border-r border-border w-[300px] flex-shrink-0',
        className
      )}
      animate={{
        width: animate ? (open ? '300px' : '60px') : '300px',
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) => {
  const { open, setOpen } = useSidebar()
  return (
    <>
      <div
        className={cn(
          'h-12 px-4 flex flex-row md:hidden items-center justify-between bg-paper border-b border-border w-full',
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-sharp bg-ink text-paper flex items-center justify-center font-bold text-xs flex-shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-signal" />
          </div>
          <span className="font-display font-semibold text-base text-ink tracking-tight">
            Perch
          </span>
        </div>
        <div className="flex justify-end z-20">
          <Menu
            className="text-ink hover:text-text-secondary cursor-pointer transition-colors"
            size={22}
            onClick={() => setOpen(!open)}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: 'easeInOut',
              }}
              className={cn(
                'fixed h-full w-full inset-0 bg-surface p-8 z-[100] flex flex-col justify-between border-r border-border',
                className
              )}
            >
              <div
                className="absolute right-6 top-6 z-50 text-ink hover:text-text-secondary cursor-pointer transition-colors"
                onClick={() => setOpen(!open)}
              >
                <X size={22} />
              </div>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links
  className?: string
  props?: LinkProps
} & Omit<React.ComponentProps<typeof Link>, 'href'>) => {
  const { open, setOpen, animate } = useSidebar()
  const pathname = usePathname()

  const isActive = link.exactMatch
    ? pathname === link.href
    : pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href))

  return (
    <Link
      href={link.href}
      onClick={() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          setOpen(false)
        }
      }}
      className={cn(
        'flex items-center justify-start gap-3 group/sidebar px-2.5 py-2.5 rounded-sharp transition-colors duration-150',
        isActive
          ? 'bg-surface text-ink font-medium border border-border'
          : 'text-text-secondary hover:text-ink hover:bg-surface border border-transparent',
        className
      )}
      {...props}
    >
      <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 text-current">
        {link.icon}
      </div>
      <motion.span
        animate={{
          display: animate ? (open ? 'inline-block' : 'none') : 'inline-block',
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className={cn(
          'text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0',
          isActive ? 'text-ink font-medium' : 'text-text-secondary group-hover/sidebar:text-ink'
        )}
      >
        {link.label}
      </motion.span>
    </Link>
  )
}

const SidebarBrand = () => {
  const { open, animate } = useSidebar()
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2.5 px-2 py-2 group/brand"
    >
      <div className="h-6 w-6 rounded-sharp bg-ink text-paper flex items-center justify-center font-bold text-xs flex-shrink-0">
        <span className="h-1.5 w-1.5 rounded-full bg-signal" />
      </div>
      <motion.span
        animate={{
          display: animate ? (open ? 'inline-block' : 'none') : 'inline-block',
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="font-display font-semibold text-lg text-ink tracking-tight whitespace-pre inline-block !p-0 !m-0"
      >
        Perch
      </motion.span>
    </Link>
  )
}

const DefaultDashboardSidebar = () => {
  return (
    <SidebarBody className="justify-between gap-6">
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <SidebarBrand />
        <nav className="mt-4 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.href} link={item} />
          ))}
        </nav>
      </div>
    </SidebarBody>
  )
}

export default Sidebar
