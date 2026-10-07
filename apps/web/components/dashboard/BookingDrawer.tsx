"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface BookingDetail {
  id: string;
  renterName: string;
  renterEmail: string;
  spaceName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "pending" | "confirmed" | "checked_in" | "completed" | "cancelled" | "no_show";
  amount: number;
  depositPaid: number;
  statusHistory: Array<{
    fromStatus: string;
    toStatus: string;
    changedBy: string;
    changedAt: string;
  }>;
}

interface BookingDrawerProps {
  bookingId: string | null;
  onClose: () => void;
  onStatusChange: () => void;
}

const statusColorMap: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: "bg-text-muted/10", text: "text-text-muted", dot: "bg-text-muted" },
  confirmed: { bg: "bg-signal/10", text: "text-signal", dot: "bg-signal" },
  checked_in: { bg: "bg-info/10", text: "text-info", dot: "bg-info" },
  completed: { bg: "bg-success/10", text: "text-success", dot: "bg-success" },
  cancelled: { bg: "bg-text-muted/10", text: "text-text-muted line-through", dot: "bg-text-muted" },
  no_show: { bg: "bg-error/10", text: "text-error", dot: "bg-error" },
};

export function BookingDrawer({ bookingId, onClose, onStatusChange }: BookingDrawerProps) {
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && bookingId) {
        onClose();
      }
    };

    if (bookingId) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [bookingId, onClose]);

  useEffect(() => {
    if (!bookingId) {
      setBooking(null);
      setError(null);
      return;
    }

    const fetchBooking = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.apiFetch<BookingDetail>(`/api/bookings/${bookingId}`);
        setBooking(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load booking");
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  const handleTransition = async (toStatus: string) => {
    if (!booking) return;

    setTransitioning(true);
    setError(null);

    try {
      await api.apiFetch(`/api/bookings/${booking.id}/transition`, {
        method: "POST",
        body: JSON.stringify({ toStatus }),
      });

      onStatusChange();
      // Refresh the booking detail
      const updated = await api.apiFetch<BookingDetail>(`/api/bookings/${booking.id}`);
      setBooking(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update booking";
      if (message.includes("409") || message.includes("illegal")) {
        setError("Cannot perform this action at this time");
      } else {
        setError(message);
      }
    } finally {
      setTransitioning(false);
    }
  };

  const handleCancel = async () => {
    if (!booking) return;

    setTransitioning(true);
    setError(null);

    try {
      await api.apiFetch(`/api/bookings/${booking.id}/cancel`, {
        method: "POST",
      });

      onStatusChange();
      const updated = await api.apiFetch<BookingDetail>(`/api/bookings/${booking.id}`);
      setBooking(updated);
      setConfirmCancel(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel booking");
    } finally {
      setTransitioning(false);
    }
  };

  const displayAmount = booking ? (booking.amount / 100).toFixed(2) : "0.00";
  const displayDeposit = booking ? (booking.depositPaid / 100).toFixed(2) : "0.00";

  return (
    <>
      {/* Drawer overlay - only shows when drawer is open */}
      {bookingId && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer itself */}
      <div
        ref={drawerRef}
        className={cn(
          "fixed right-0 top-0 bottom-0 z-50 w-full lg:w-[420px] bg-surface border-l border-border shadow-float transition-transform duration-300 overflow-y-auto",
          bookingId ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-ink">Booking Details</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-paper rounded-sharp transition-colors"
            aria-label="Close drawer"
          >
            <X size={20} className="text-ink" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-6 text-center text-text-muted">Loading...</div>
        ) : booking ? (
          <div className="p-6 space-y-6">
            {/* Error message */}
            {error && (
              <div className="p-3 bg-error/10 border border-error rounded-sharp text-error text-sm">
                {error}
              </div>
            )}

            {/* Renter info */}
            <div>
              <h3 className="text-xs font-medium text-text-muted uppercase mb-2">Renter</h3>
              <p className="text-base font-medium text-ink">{booking.renterName}</p>
              <p className="text-sm text-text-muted">{booking.renterEmail}</p>
            </div>

            {/* Space & Time */}
            <div>
              <h3 className="text-xs font-medium text-text-muted uppercase mb-2">Space</h3>
              <p className="text-base font-medium text-ink mb-3">{booking.spaceName}</p>
              <div className="space-y-2">
                <p className="text-sm text-text-secondary">
                  <span className="text-text-muted">Date: </span>
                  {new Date(booking.date).toLocaleDateString()}
                </p>
                <p className="text-sm font-medium tabular text-text-secondary">
                  <span className="text-text-muted">Time: </span>
                  {booking.startTime} – {booking.endTime}
                </p>
              </div>
            </div>

            {/* Status */}
            <div>
              <h3 className="text-xs font-medium text-text-muted uppercase mb-2">Status</h3>
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-object text-xs w-fit",
                  statusColorMap[booking.status].bg,
                )}
              >
                <div className={cn("size-1.5 rounded-full", statusColorMap[booking.status].dot)} />
                <span className={statusColorMap[booking.status].text}>
                  {booking.status === "cancelled"
                    ? "Cancelled"
                    : booking.status.charAt(0).toUpperCase() +
                      booking.status.slice(1).replace(/_/g, " ")}
                </span>
              </div>
            </div>

            {/* Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs font-medium text-text-muted uppercase mb-2">Amount</h3>
                <p className="text-base font-medium tabular text-ink">₹{displayAmount}</p>
              </div>
              <div>
                <h3 className="text-xs font-medium text-text-muted uppercase mb-2">Deposit Paid</h3>
                <p className="text-base font-medium tabular text-ink">₹{displayDeposit}</p>
              </div>
            </div>

            {/* Status History */}
            {booking.statusHistory.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-text-muted uppercase mb-3">History</h3>
                <div className="space-y-2">
                  {booking.statusHistory.map((entry, idx) => (
                    <p key={idx} className="text-xs text-text-muted">
                      {entry.fromStatus} → {entry.toStatus} · {entry.changedAt} · by {entry.changedBy}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-4 border-t border-border space-y-3">
              {booking.status === "confirmed" && (
                <>
                  <button
                    onClick={() => handleTransition("checked_in")}
                    disabled={transitioning}
                    className="w-full inline-flex items-center justify-center rounded-sharp bg-ink border border-ink px-4 py-2.5 text-sm font-medium leading-none text-paper transition-colors hover:bg-[#2e2d2a] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {transitioning ? "Loading..." : "Check In"}
                  </button>
                  <button
                    onClick={() => setConfirmCancel(true)}
                    className="w-full inline-flex items-center justify-center rounded-sharp bg-transparent border border-error px-4 py-2.5 text-sm font-medium leading-none text-error transition-colors hover:bg-error/5"
                  >
                    Cancel Booking
                  </button>
                </>
              )}
              {booking.status === "checked_in" && (
                <button
                  onClick={() => handleTransition("completed")}
                  disabled={transitioning}
                  className="w-full inline-flex items-center justify-center rounded-sharp bg-ink border border-ink px-4 py-2.5 text-sm font-medium leading-none text-paper transition-colors hover:bg-[#2e2d2a] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {transitioning ? "Loading..." : "Mark Complete"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-text-muted">No booking found</div>
        )}
      </div>

      {/* Cancel confirmation */}
      {confirmCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-surface border border-border rounded-sharp p-6 shadow-float max-w-sm w-full mx-4">
            <h3 className="text-base font-medium text-ink mb-2">Cancel this booking?</h3>
            <p className="text-sm text-text-muted mb-6">This action cannot be undone.</p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setConfirmCancel(false)}
                disabled={transitioning}
                className="inline-flex items-center justify-center rounded-sharp border border-ink bg-transparent px-4 py-2.5 text-sm font-medium leading-none text-ink transition-colors hover:bg-paper disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <button
                onClick={handleCancel}
                disabled={transitioning}
                className="inline-flex items-center justify-center rounded-sharp px-4 py-2.5 text-sm font-medium leading-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-error border border-error text-white hover:bg-[#7a261e] active:bg-[#6a211a]"
              >
                {transitioning ? "Loading..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
