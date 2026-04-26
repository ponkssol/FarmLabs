import Link from "next/link";

export default function NotFound() {
  return (
    <div className="app-container py-24 text-center sm:py-32">
      <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold">404</h1>
      <p className="mt-2 text-sm text-zinc-500">Page or listing not found.</p>
      <Link href="/" className="mt-6 inline-block text-sm text-zinc-400 hover:text-zinc-200">
        Back to home
      </Link>
      </div>
    </div>
  );
}
