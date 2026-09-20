'use client';

import { useEffect, useState, useCallback } from 'react';
import { getAvailability } from '@/lib/api';

interface Slot {
  startTime: string;
  endTime: string;
}

interface AvailabilityState {
  slots: Slot[];
  loading: boolean;
  error: string | null;
}

export function BookingCalendar({ spaceId }: { spaceId: string }) {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [availability, setAvailability] = useState<AvailabilityState>({
    slots: [],
    loading: true,
    error: null,
  });

  
  const refetchAvailability = useCallback(
    async (dateStr: string = date) => {
      try {
        setAvailability((prev) => ({ ...prev, loading: true, error: null }));
        const result = await getAvailability(spaceId, dateStr);
        setAvailability({
          slots: result.slots,
          loading: false,
          error: null,
        });
      } catch (err) {
        setAvailability({
          slots: [],
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to fetch availability',
        });
      }
    },
    [spaceId, date]
  );

  
  useEffect(() => {
    refetchAvailability();
  }, [date, refetchAvailability]);

  useEffect(() => {
    if (!spaceId) {
      console.warn('[SSE] spaceId not provided, skipping EventSource connection');
      return;
    }

    // Direct connection to API (workaround for Next.js Turbopack rewrite issues)
    const sseUrl = `http://localhost:4000/api/spaces/${spaceId}/availability/stream`;
    console.log(`[SSE] Attempting to connect to: ${sseUrl}`);
    
    const eventSource = new EventSource(sseUrl);

    const handleOpen = () => {
      console.log('[SSE] Connection opened successfully');
    };

    const handleMessage = (event: MessageEvent) => {
      try {
        console.log('[SSE] Received message:', event.data);
        const data = JSON.parse(event.data);

        // Only re-fetch if the change affected the current date
        if (data.date === new Date(date).toDateString()) {
          console.log(`[SSE] Availability changed for ${data.date}, re-fetching...`);
          refetchAvailability(date);
        }
      } catch (err) {
        console.error('[SSE] Failed to parse message:', err);
      }
    };

    const handleError = (event: Event) => {
      // Check the readyState: 0=connecting, 1=open, 2=closed
      const readyState = (event.target as EventSource).readyState;
      if (readyState === EventSource.CLOSED) {
        console.error('[SSE] Connection closed by server');
      } else if (readyState === EventSource.CONNECTING) {
        console.error('[SSE] Connection lost, attempting to reconnect...');
      } else {
        console.error('[SSE] Connection error, readyState:', readyState);
      }
      eventSource.close();
    };

    eventSource.addEventListener('open', handleOpen);
    eventSource.addEventListener('message', handleMessage);
    eventSource.addEventListener('error', handleError);

    
    return () => {
      console.log('[SSE] Closing connection');
      eventSource.removeEventListener('open', handleOpen);
      eventSource.removeEventListener('message', handleMessage);
      eventSource.removeEventListener('error', handleError);
      eventSource.close();
    };
  }, [spaceId, date, refetchAvailability]);

  return (
    <div className="booking-calendar">
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 border rounded"
        />
      </div>

      {availability.loading && <p className="text-gray-600">Loading slots...</p>}

      {availability.error && (
        <p className="text-red-600">Error: {availability.error}</p>
      )}

      {!availability.loading && availability.slots.length === 0 && (
        <p className="text-gray-600">No available slots for this date.</p>
      )}

      {availability.slots.length > 0 && (
        <div className="grid gap-2">
          <p className="text-sm text-gray-600 mb-2">
            {availability.slots.length} slots available
          </p>
          {availability.slots.map((slot, idx) => (
            <div
              key={idx}
              className="p-3 border rounded bg-white hover:bg-gray-50 cursor-pointer transition"
            >
              <div className="font-medium">
                {new Date(slot.startTime).toLocaleTimeString()} -{' '}
                {new Date(slot.endTime).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
