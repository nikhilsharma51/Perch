import { BookingCalendar } from '@/components/BookingCalendar';

export default function CalendarTestPage() {
  
  const spaceId = '17e192e2-c923-4a43-a4d9-625a1d36901b';
  const curlCommand = `curl -X POST http://localhost:4000/api/bookings -H "Content-Type: application/json" -d '{"spaceId":"${spaceId}","startTime":"2026-09-21T09:00:00.000Z","endTime":"2026-09-21T09:30:00.000Z","renterEmail":"test@example.com"}'`;

  return (
    <main className="min-h-screen bg-paper p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Booking Calendar Test</h1>
        <p className="text-gray-600 mb-8">
          This page demonstrates the real-time SSE integration. Open it in two tabs and create/transition bookings via curl to see the calendar update in real-time.
        </p>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Available Slots</h2>
          <BookingCalendar spaceId={spaceId} />
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-bold text-blue-900 mb-2">Test Instructions:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>Open this page in two browser tabs</li>
            <li>Select a date in both tabs</li>
            <li>In a terminal, run: <code className="bg-white px-2 py-1 rounded font-mono">
              {curlCommand}
            </code></li>
            <li>Within ~1 second, the second tab&apos;s calendar should update without manual refresh</li>
            <li>Close one tab and verify the SSE subscription cleans up (check server logs)</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
