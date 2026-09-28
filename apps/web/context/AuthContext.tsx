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
    setUser({
      userId: decoded.userId,
      email: decoded.email,
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
    setUser({
      userId: decoded.userId,
      email: decoded.email,
    })
  }

  const logout = (): void => {
    localStorage.removeItem('perch_token')
    setUser(null)
    router.replace('/login')
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
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
