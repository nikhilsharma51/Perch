import type {
  SignupInput,
  LoginInput,
  CreateSpaceInput,
  CreateOrgInput,
  UpdateSpaceInput,
} from "@perch/shared";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("perch_token")
      : null;
      
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("perch_token");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ error: "Request failed" }));

    throw new Error(error.error || "Request failed");
  }

  return res.json();
}

interface Organization {
  id: string
  name: string
  slug: string
  createdAt: string
  role: 'owner' | 'staff'
  membershipId: string
}

interface OrganizationCreateResponse {
  message: string
  organization: {
    id: string
    name: string
    slug: string
    createdAt: string
    role: 'owner' | 'staff'
  }
}

interface OrganizationsResponse {
  organizations: Organization[]
  count: number
}

interface Space {
  id: string
  orgId: string
  name: string
  type: 'podcast' | 'photography' | 'gaming'
  hourlyRate: number
  depositRate: number
  capacity: number
  imageUrl?: string
  createdAt: string
}

interface SpaceCreateResponse {
  message: string
  space: Space
}

interface SpaceUpdateResponse {
  message: string
  space: Space
}

interface AvailabilitySlot {
  startTime: string
  endTime: string
}

interface AvailabilityResponse {
  slots: AvailabilitySlot[]
}

interface BookingResponse {
  id: string
  spaceId: string
  spaceName: string
  renterEmail: string
  renterName: string
  startTime: string
  endTime: string
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show'
  amount: number
  depositPaid: number
  createdAt: string
  updatedAt: string
}

interface BookingsListResponse {
  bookings: BookingResponse[]
  count: number
}

export async function getAvailability(
  spaceId: string,
  date: string
): Promise<AvailabilityResponse> {
  return apiFetch<AvailabilityResponse>(
    `/api/spaces/${spaceId}/availability?date=${date}`
  )
}

export const api = {
  apiFetch,
  
  auth: {
    signup: (body: SignupInput) =>
      apiFetch<{ token: string }>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    login: (body: LoginInput) =>
      apiFetch<{ token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },

  organizations: {
    list: () =>
      apiFetch<OrganizationsResponse>("/api/organizations"),

    get: (orgId: string) =>
      apiFetch<Organization>(`/api/organizations/${orgId}`),

    create: (body: CreateOrgInput) =>
      apiFetch<OrganizationCreateResponse>("/api/organizations", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },

  spaces: {
    list: (orgId: string) =>
      apiFetch<{ spaces: Space[]; count: number }>(`/api/organizations/${orgId}/spaces`),

    get: (orgId: string, spaceId: string) =>
      apiFetch<{ space: Space }>(`/api/organizations/${orgId}/spaces/${spaceId}`),

    create: (orgId: string, body: CreateSpaceInput) =>
      apiFetch<SpaceCreateResponse>(`/api/organizations/${orgId}/spaces`, {
        method: "POST",
        body: JSON.stringify(body),
      }),

    update: (orgId: string, spaceId: string, body: UpdateSpaceInput) =>
      apiFetch<SpaceUpdateResponse>(`/api/organizations/${orgId}/spaces/${spaceId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
  },

  bookings: {
    listByOrg: (orgId: string, date?: string) => {
      console.log('[API] listByOrg called with orgId:', orgId, 'type:', typeof orgId)
      const params = new URLSearchParams()
      if (date) {
        params.append('date', date)
      }
      const query = params.toString()
      const url = `/api/organizations/${orgId}/bookings${query ? `?${query}` : ''}`
      console.log('[API] Fetching URL:', url)
      return apiFetch<BookingsListResponse>(url)
    },

    get: (bookingId: string) =>
      apiFetch(`/api/bookings/${bookingId}`),

    transition: (bookingId: string, toStatus: string) =>
      apiFetch(`/api/bookings/${bookingId}/transition`, {
        method: "POST",
        body: JSON.stringify({ toStatus }),
      }),

    cancel: (bookingId: string) =>
      apiFetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
      }),
  },
};