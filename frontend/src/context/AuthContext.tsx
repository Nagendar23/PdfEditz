"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useReducer } from "react";
import { useRouter } from "next/navigation";
import {
  getStoredAuth,
  loginUser,
  logoutUser,
  type AuthUser,
  type LoginPayload,
} from "@/services/authService";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isReady: boolean;
}

type AuthAction =
  | {
      type: "restore";
      payload: {
        user: AuthUser | null;
        token: string | null;
      };
    }
  | {
      type: "login";
      payload: {
        user: AuthUser;
        token: string;
      };
    }
  | {
      type: "logout";
    };

const AuthContext = createContext<AuthContextValue | null>(null);

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "restore":
      return {
        user: action.payload.user,
        token: action.payload.token,
        isReady: true,
      };
    case "login":
      return {
        user: action.payload.user,
        token: action.payload.token,
        isReady: true,
      };
    case "logout":
      return {
        user: null,
        token: null,
        isReady: true,
      };
    default:
      return state;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    token: null,
    isReady: false,
  });

  const useAuthRestoreEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

  useAuthRestoreEffect(() => {
    const auth = getStoredAuth();
    dispatch({
      type: "restore",
      payload: {
        user: auth.user,
        token: auth.token,
      },
    });
  }, []);

  async function login(payload: LoginPayload) {
    const result = await loginUser(payload);
    dispatch({
      type: "login",
      payload: {
        user: result.user,
        token: result.token,
      },
    });
  }

  async function logout() {
    await logoutUser();
    dispatch({ type: "logout" });
    router.push("/login");
  }

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        token: state.token,
        isAuthenticated: Boolean(state.token),
        isReady: state.isReady,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}