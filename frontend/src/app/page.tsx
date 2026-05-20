import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">PdfEditz</h1>
        <p className="text-base text-slate-600">
          A focused PDF editor for uploads, overlays, and document export.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/login" className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800">
          Log in
        </Link>
        <Link href="/signup" className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-100">
          Sign up
        </Link>
        <Link href="/dashboard" className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
