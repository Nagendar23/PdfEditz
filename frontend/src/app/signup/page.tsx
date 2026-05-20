"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthForm, { type AuthFormValues } from "@/components/auth/AuthForm";
import { signupUser } from "@/services/authService";
import { useAuth } from "@/context/AuthContext";

export default function SignupPage() {
  const router = useRouter();
  const { token, isReady } = useAuth();
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
      await signupUser({
        name: values.name || "",
        email: values.email,
        password: values.password,
      });
      router.push("/login");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Signup failed");
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
        <AuthForm mode="signup" loading={loading} error={error} onSubmit={handleSubmit} />
        <p className="text-center text-sm text-slate-600">
          Already have an account? <button type="button" className="font-medium text-slate-900 underline" onClick={() => router.push("/login")}>Log in</button>
        </p>
      </div>
    </div>
  );
}