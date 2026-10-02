'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'default'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'destructive'
    | 'signal'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  isLoading?: boolean
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      isLoading = false,
      disabled,
      children,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/20 focus-visible:border-ink disabled:pointer-events-none disabled:opacity-50 select-none rounded-sharp relative overflow-hidden group cursor-pointer'

    const variantStyles = {
      default:
        'bg-ink text-paper border border-ink hover:bg-[#2e2d2a] active:bg-[#3d3c39] shadow-xs',
      outline:
        'border border-border bg-transparent text-ink hover:bg-paper hover:border-ink active:bg-surface-elevated',
      secondary:
        'bg-surface-elevated border border-border text-ink hover:bg-paper active:bg-border/60',
      ghost:
        'bg-transparent text-ink hover:bg-paper hover:text-ink active:bg-surface-elevated border border-transparent',
      destructive:
        'bg-error border border-error text-white hover:bg-[#7a261e] active:bg-[#68201a]',
      signal:
        'bg-signal border border-signal text-white hover:bg-[#8f2c23] active:bg-[#7a261e]',
    }

    const sizeStyles = {
      default: 'h-10 px-5 py-2 text-sm',
      sm: 'h-8 px-3.5 text-xs',
      lg: 'h-12 px-7 text-base',
      icon: 'h-10 w-10 p-0',
    }

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        className: cn(baseStyles, variantStyles[variant], sizeStyles[size], className),
        ...props,
      })
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          isLoading && 'cursor-wait',
          className
        )}
        {...props}
      >
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-current shrink-0" />
        )}
        <span className={cn('inline-flex items-center gap-2', isLoading && 'opacity-90')}>
          {children}
        </span>
      </button>
    )
  }
)

Button.displayName = 'Button'
