import { useEffect } from "react";

/**
 * Custom hook to stream real-time availability updates for a space.
 *
 * Opens an EventSource connection to /api/spaces/{spaceId}/availability/stream.
 * Calls onUpdate() when any message arrives.
 *
 * Note: onUpdate should be wrapped in useCallback by the caller to avoid
 * unnecessary EventSource reconnections. If an inline function is passed,
 * the effect will reconnect on every render.
 *
 * @param spaceId - The space ID to stream updates for
 * @param onUpdate - Callback invoked when any stream message arrives
 */
export function useSlotStream(spaceId: string, onUpdate: () => void): void {
  useEffect(() => {
    const source = new EventSource(`/api/spaces/${spaceId}/availability/stream`);

    source.addEventListener("message", () => {
      onUpdate();
    });

    source.addEventListener("error", () => {
      // EventSource auto-reconnects on error by default.
      // Do not manually close the connection here.
    });

    return () => {
      source.close();
    };
  }, [spaceId]);
}
