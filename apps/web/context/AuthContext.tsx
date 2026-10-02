'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'
import { api } from '@/lib/api'
import type { SignupInput, LoginInput } from '@perch/shared'

export interface AuthUser {
  userId: string
  email: string
  orgId?: string
}

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  setOrgId: (orgId: string) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface DecodedToken {
  userId: string
  email: string
  exp?: number
  iat?: number
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const decodeToken = () => {
      try {
        const token = localStorage.getItem('perch_token')
        const orgId = localStorage.getItem('perch_org_id')
        if (!token) {
          setUser(null)
          setIsLoading(false)
          return
        }

        const decoded = jwtDecode<DecodedToken>(token)

        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('perch_token')
          setUser(null)
          setIsLoading(false)
          return
        }

        setUser({
          userId: decoded.userId,
          email: decoded.email,
          orgId: orgId || undefined,
        })
      } catch (error) {
        console.error('Failed to decode token:', error)
        localStorage.removeItem('perch_token')
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    decodeToken()

    window.addEventListener('storage', decodeToken)
    return () => window.removeEventListener('storage', decodeToken)
  }, [])

  const login = async (email: string, password: string): Promise<void> => {
    const response = await api.auth.login({ email, password })

    localStorage.setItem('perch_token', response.token)

    const decoded = jwtDecode<DecodedToken>(response.token)
    const orgId = localStorage.getItem('perch_org_id')
    setUser({
      userId: decoded.userId,
      email: decoded.email,
      orgId:orgId || undefined
    })
  }

  const signup = async (
    name: string,
    email: string,
    password: string
  ): Promise<void> => {
    const response = await api.auth.signup({ name, email, password })

    localStorage.setItem('perch_token', response.token)

    const decoded = jwtDecode<DecodedToken>(response.token)
    const orgId = localStorage.getItem("perch_org_id")
    setUser({
      userId: decoded.userId,
      email: decoded.email,
      orgId : orgId || undefined
    })
  }

  const logout = (): void => {
    localStorage.removeItem('perch_token')
    localStorage.removeItem('perch_org_id')
    setUser(null)
    router.replace('/login')
  }

  const setOrgId = (orgId: string): void => {
    localStorage.setItem('perch_org_id', orgId)
    setUser((prev) => prev ? { ...prev, orgId } : null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, setOrgId }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
