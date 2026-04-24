import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-32 text-center">
      <h1 className="text-2xl font-semibold">404</h1>
      <p className="mt-2 text-sm text-zinc-500">Page or listing not found.</p>
      <Link href="/" className="mt-6 inline-block text-sm text-zinc-400 hover:text-zinc-200">
        Back to home
      </Link>
    </div>
  );
}
