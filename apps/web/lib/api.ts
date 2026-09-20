
const API_BASE_URL = 'http://localhost:4000/api'; // Direct to API (Turbopack workaround)


function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}


export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

 
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }

  
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json();
  }

  return {} as T;
}

export async function getAvailability(
  spaceId: string,
  date: string
): Promise<{ spaceId: string; date: string; slots: Array<{ startTime: string; endTime: string }>; count: number }> {
  return apiCall(`/spaces/${spaceId}/availability?date=${date}`);
}


export async function createBooking(data: {
  spaceId: string;
  startTime: string;
  endTime: string;
  renterEmail: string;
}): Promise<{ booking: { id: string; status: string; startTime: string; endTime: string } }> {
  return apiCall('/bookings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}


export async function transitionBooking(
  bookingId: string,
  toStatus: string
): Promise<{ booking: { id: string; status: string } }> {
  return apiCall(`/bookings/${bookingId}/transition`, {
    method: 'POST',
    body: JSON.stringify({ toStatus }),
  });
}
