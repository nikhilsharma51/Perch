import type {
  SignupInput,
  LoginInput,
  Space,
  CreateSpaceInput,
} from "@perch/shared";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function apiFetch<T>(
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

export const api = {
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

  spaces: {
    list: (orgId: string) =>
      apiFetch<Space[]>(`/api/organizations/${orgId}/spaces`),

    create: (orgId: string, body: CreateSpaceInput) =>
      apiFetch<Space>(`/api/organizations/${orgId}/spaces`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
};