'use client'

import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  isDangerous?: boolean
  isLoading?: boolean
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  isDangerous = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onCancel])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(e.target as Node)
      ) {
        onCancel()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onCancel])

  if (!isOpen) {
    return null
  }

  const handleConfirm = async () => {
    await onConfirm()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div
        ref={dialogRef}
        className="bg-surface border border-border rounded-sharp p-6 shadow-float max-w-sm w-full mx-4"
      >
        <h2 className="text-lg font-medium text-ink mb-2">{title}</h2>
        <p className="text-sm text-text-muted mb-6">{message}</p>

        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-sharp border border-ink bg-transparent px-4 py-2.5 text-sm font-medium leading-none text-ink transition-colors hover:bg-paper disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`inline-flex items-center justify-center rounded-sharp px-4 py-2.5 text-sm font-medium leading-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isDangerous
                ? 'bg-error border border-error text-white hover:bg-[#7a261e] active:bg-[#6a211a]'
                : 'bg-ink border border-ink text-paper hover:bg-[#2e2d2a] active:bg-[#3d3c39]'
            }`}
          >
            {isLoading ? 'Loading...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
