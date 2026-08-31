import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginDemo } from "@/app/(auth)/actions";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-24 text-center">
      <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-zinc-900">
        Generate and e-sign NDAs in minutes
      </h1>
      <p className="mt-4 max-w-md text-lg text-zinc-600">
        Choose a template, fill in the details, and get a signed document
        with a shareable link — no account needed for the other party.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <form action={loginDemo}>
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Try the demo
          </button>
        </form>
        <Link
          href="/signup"
          className="rounded-md border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Log in
        </Link>
      </div>
      <p className="mt-3 text-xs text-zinc-400">
        The demo account is shared with other visitors — don&apos;t enter
        anything you wouldn&apos;t want a stranger to see or change.
      </p>
    </div>
  );
}
