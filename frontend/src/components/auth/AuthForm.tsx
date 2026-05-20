"use client";

import { useState } from "react";

export interface AuthFormValues {
  name?: string;
  email: string;
  password: string;
}

interface AuthFormProps {
  mode: "login" | "signup";
  loading?: boolean;
  error?: string | null;
  onSubmit: (values: AuthFormValues) => Promise<void> | void;
}

export default function AuthForm({ mode, loading, error, onSubmit }: AuthFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      name: mode === "signup" ? name.trim() : undefined,
      email: email.trim(),
      password,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">
          {mode === "signup" ? "Create account" : "Welcome back"}
        </h1>
        <p className="text-sm text-slate-600">
          {mode === "signup"
            ? "Create your editor account with name, email, and password."
            : "Sign in to access your dashboard and editor."}
        </p>
      </div>

      {mode === "signup" && (
        <label className="block space-y-2 text-sm font-medium text-slate-700">
          <span>Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            type="text"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-500"
            placeholder="Your name"
          />
        </label>
      )}

      <label className="block space-y-2 text-sm font-medium text-slate-700">
        <span>Email</span>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-500"
          placeholder="you@example.com"
        />
      </label>

      <label className="block space-y-2 text-sm font-medium text-slate-700">
        <span>Password</span>
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-500"
          placeholder="Enter your password"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}
      </button>
    </form>
  );
}