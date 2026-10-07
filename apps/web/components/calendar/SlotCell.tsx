"use client";

import { Clock } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";

export type SlotState = "available" | "booked" | "locked" | "unavailable";

export type BookingStatus = "pending" | "confirmed" | "checked_in" | "completed" | "cancelled" | "no_show";

interface SlotCellProps {
  startTime: string;
  endTime: string;
  price: number;
  state: SlotState;
  booking?: {
    renterName: string;
    status: BookingStatus;
  };
  onClick?: () => void;
}

const statusColorMap: Record<BookingStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: "bg-text-muted/10", text: "text-text-muted", dot: "bg-text-muted" },
  confirmed: { bg: "bg-signal/10", text: "text-signal", dot: "bg-signal" },
  checked_in: { bg: "bg-info/10", text: "text-info", dot: "bg-info" },
  completed: { bg: "bg-success/10", text: "text-success", dot: "bg-success" },
  cancelled: { bg: "bg-text-muted/10", text: "text-text-muted line-through", dot: "bg-text-muted" },
  no_show: { bg: "bg-error/10", text: "text-error", dot: "bg-error" },
};

export function SlotCell({
  startTime,
  endTime,
  price,
  state,
  booking,
  onClick,
}: SlotCellProps) {
  const isInteractive = state === "available" || state === "booked";
  const displayPrice = (price / 100).toFixed(2);

  const baseClasses = cn(
    "relative flex items-center justify-between p-3 text-sm font-medium transition-all",
  );

  const stateClasses = {
    available: cn(
      "bg-surface border border-border rounded-object cursor-pointer",
      "hover:border-ink hover:border-[1.5px]",
    ),
    booked: cn(
      "bg-surface border border-border rounded-object cursor-pointer",
    ),
    locked: cn(
      "bg-surface border border-border rounded-object cursor-default slot-cell-locked-stripes",
      "text-text-muted opacity-75",
    ),
    unavailable: cn(
      "bg-paper rounded-object cursor-default",
      "text-text-muted",
    ),
  };

  if (state === "available") {
    return (
      <button
        onClick={onClick}
        className={cn(baseClasses, stateClasses.available)}
        type="button"
      >
        <div className="flex flex-col gap-1">
          <span className="tabular">{startTime}</span>
          <span className="text-xs text-text-muted">↓</span>
          <span className="tabular">{endTime}</span>
        </div>
        <span className="tabular">₹{displayPrice}</span>
      </button>
    );
  }

  if (state === "booked" && booking) {
    const colors = statusColorMap[booking.status];
    const showPulse = booking.status === "checked_in";

    return (
      <button
        onClick={onClick}
        className={cn(baseClasses, stateClasses.booked)}
        type="button"
      >
        <div className="flex flex-col gap-2">
          <p className="truncate text-xs font-medium">{booking.renterName}</p>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-object text-xs w-fit",
              colors.bg,
            )}
          >
            <div className={cn("size-1.5 rounded-full", colors.dot, showPulse && "badge-checked-in-dot")} />
            <span className={colors.text}>
              {booking.status === "cancelled" ? "Cancelled" : booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </button>
    );
  }

  if (state === "locked") {
    return (
      <div
        className={cn(baseClasses, stateClasses.locked)}
      >
        <div className="flex flex-col gap-1">
          <span className="tabular text-xs">{startTime}</span>
        </div>
        <Clock size={14} className="absolute top-1 right-1" />
      </div>
    );
  }

  return (
    <div
      className={cn(baseClasses, stateClasses.unavailable)}
    >
      <span className="tabular text-xs">{startTime}</span>
    </div>
  );
}
