'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { X } from 'phosphor-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  timeoutId?: NodeJS.Timeout
}

interface ToastContextValue {
  toasts: Toast[]
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const TOAST_DURATION = 4000 // 4 seconds

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substr(2, 9)

    const timeoutId = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, TOAST_DURATION)

    setToasts((prev) => [...prev, { id, type, message, timeoutId }])

    return id
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => {
      const toast = prev.find((t) => t.id === id)
      if (toast?.timeoutId) {
        clearTimeout(toast.timeoutId)
      }
      return prev.filter((t) => t.id !== id)
    })
  }, [])

  const success = useCallback(
    (message: string) => addToast('success', message),
    [addToast]
  )

  const error = useCallback(
    (message: string) => addToast('error', message),
    [addToast]
  )

  const info = useCallback(
    (message: string) => addToast('info', message),
    [addToast]
  )

  return (
    <ToastContext.Provider value={{ toasts, success, error, info, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast(): Omit<ToastContextValue, 'toasts' | 'dismiss'> {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used inside ToastProvider')
  }
  return {
    success: context.success,
    error: context.error,
    info: context.info,
  }
}

interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  const getToastStyles = (type: ToastType): string => {
    switch (type) {
      case 'success':
        return 'bg-success/10 border border-success text-success'
      case 'error':
        return 'bg-error/10 border border-error text-error'
      case 'info':
        return 'bg-info/10 border border-info text-info'
      default:
        return 'bg-surface border border-border text-ink'
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-sharp text-sm font-medium pointer-events-auto shadow-float animate-in fade-in slide-in-from-bottom-4 duration-200 ${getToastStyles(
            toast.type
          )}`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            className="flex items-center justify-center w-5 h-5 hover:opacity-70 transition-opacity"
            aria-label="Dismiss toast"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
      ))}
    </div>
  )
}
