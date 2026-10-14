import type {
  SignupInput,
  LoginInput,
  CreateSpaceInput,
  CreateOrgInput,
  UpdateSpaceInput,
} from "@perch/shared";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * ApiError class represents all API-related errors.
 * Used by error handling middleware to classify and display errors appropriately.
 */
export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string[]>;
  isNetworkError: boolean;

  constructor(
    message: string,
    status: number,
    fieldErrors?: Record<string, string[]>,
    isNetworkError: boolean = false
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.isNetworkError = isNetworkError;
  }
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("perch_token")
      : null;
  
  console.log('[apiFetch] Request details:', {
    path,
    method: options.method || 'GET',
    hasToken: !!token,
    baseUrl: BASE_URL,
    fullUrl: `${BASE_URL}${path}`
  });

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (err) {
    // Network error (fetch threw)
    const networkError = new ApiError(
      "Network error",
      0,
      undefined,
      true
    );
    throw networkError;
  }

  console.log('[apiFetch] Response:', {
    path,
    status: res.status,
    statusText: res.statusText,
    ok: res.ok
  });

  if (res.status === 401) {
    console.log('[apiFetch] 401 Unauthorized - clearing token and redirecting');
    if (typeof window !== "undefined") {
      localStorage.removeItem("perch_token");
      window.location.href = "/auth/login";
    }
    throw new ApiError("Unauthorized", 401);
  }

  if (!res.ok) {
    let errorData: any;
    try {
      errorData = await res.json();
      console.log('[apiFetch] Error response body:', errorData);
    } catch (parseError) {
      console.log('[apiFetch] Could not parse error response as JSON');
      errorData = { error: "Request failed" };
    }

    // Extract field errors from 400 responses (Zod flatten() format)
    const fieldErrors = res.status === 400 && errorData.details?.fieldErrors
      ? errorData.details.fieldErrors
      : undefined;

    throw new ApiError(
      errorData.error || "Request failed",
      res.status,
      fieldErrors
    );
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

interface StaffMember {
  membershipId: string
  userId: string
  email: string
  name: string
  role: 'owner' | 'staff'
  joinedAt: string
}

interface StaffListResponse {
  staff: StaffMember[]
  count: number
}

export type { Space, StaffMember, StaffListResponse }

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
      apiFetch<{ organization: Organization }>(`/api/organizations/${orgId}`),

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
      apiFetch<{ message: string; booking: any; refund: { issued: boolean; refundId: string | null; reason: string } }>(
        `/api/bookings/${bookingId}/cancel`,
        { method: 'POST' }
      ),

    create: (data: {
      spaceId: string
      renterEmail: string
      startTime: string
      endTime: string
    }) =>
      apiFetch<{ booking: BookingResponse }>(
        `/api/bookings`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      ),
  },

  staff: {
    list: (orgId: string) =>
      apiFetch<StaffListResponse>(`/api/organizations/${orgId}/staff`),

    invite: (orgId: string, email: string, role: 'owner' | 'staff' = 'staff') =>
      apiFetch<{ message: string; membership: { id: string; role: string; user: { id: string; email: string; name: string } } }>(
        `/api/organizations/${orgId}/staff/invite`,
        {
          method: 'POST',
          body: JSON.stringify({ email, role }),
        }
      ),

    remove: (orgId: string, userId: string) =>
      apiFetch<{ message: string }>(
        `/api/organizations/${orgId}/staff/${userId}`,
        {
          method: 'DELETE',
        }
      ),
  },

  public: {
    getStudioBySlug: (slug: string) =>
      apiFetch<{ organization: { id: string; name: string; slug: string; createdAt: string; spaces: Space[] } }>(
        `/api/organizations/by-slug/${slug}`
      ),
  },
};