const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const TOKEN_KEY = "token";
const USER_KEY = "auth_user";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  userId: string;
  email: string;
  name: string;
}

export interface SignupResponse {
  message: string;
}

function canUseStorage() {
  return typeof window !== "undefined";
}

function getJsonErrorMessage(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

export function getToken() {
  if (!canUseStorage()) {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (!canUseStorage()) {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  if (!canUseStorage()) {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (!canUseStorage()) {
    return null;
  }

  const rawUser = localStorage.getItem(USER_KEY);
  if (!rawUser) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawUser) as Partial<AuthUser>;
    if (
      typeof parsed.id === "string" &&
      typeof parsed.name === "string" &&
      typeof parsed.email === "string"
    ) {
      return {
        id: parsed.id,
        name: parsed.name,
        email: parsed.email,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function setStoredUser(user: AuthUser) {
  if (!canUseStorage()) {
    return;
  }

  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeStoredUser() {
  if (!canUseStorage()) {
    return;
  }

  localStorage.removeItem(USER_KEY);
}

export function getStoredAuth() {
  return {
    token: getToken(),
    user: getStoredUser(),
  };
}

export async function loginUser(payload: LoginPayload) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getJsonErrorMessage(data, "Login failed"));
  }

  const authUser: AuthUser = {
    id: (data as LoginResponse).userId,
    email: (data as LoginResponse).email,
    name: (data as LoginResponse).name,
  };

  setToken((data as LoginResponse).token);
  setStoredUser(authUser);

  return {
    ...(data as LoginResponse),
    user: authUser,
  };
}

export async function signupUser(payload: SignupPayload) {
  const response = await fetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getJsonErrorMessage(data, "Signup failed"));
  }

  return data as SignupResponse;
}

export async function logoutUser() {
  const token = getToken();

  if (token) {
    try {
      await fetch(`${BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Clear local auth state even if the network request fails.
    }
  }

  removeToken();
  removeStoredUser();
}