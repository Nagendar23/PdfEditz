"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthForm, { type AuthFormValues } from "@/components/auth/AuthForm";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, token, isReady } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isReady && token) {
      router.replace("/dashboard");
    }
  }, [isReady, token, router]);

  async function handleSubmit(values: AuthFormValues) {
    setLoading(true);
    setError(null);

    try {
      await login({
        email: values.email,
        password: values.password,
      });
      router.push("/dashboard");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  if (!isReady) {
    return <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center p-6">Loading...</div>;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <AuthForm mode="login" loading={loading} error={error} onSubmit={handleSubmit} />
        <p className="text-center text-sm text-slate-600">
          No account yet? <button type="button" className="font-medium text-slate-900 underline" onClick={() => router.push("/signup")}>Create one</button>
        </p>
      </div>
    </div>
  );
}