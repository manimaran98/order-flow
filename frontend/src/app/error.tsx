'use client';

export default function RootError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="font-medium">OrderFlow could not load this page.</p>
      <button type="button" onClick={() => retry()} className="rounded-md border px-3 py-2 text-sm">
        Try again
      </button>
    </main>
  );
}
