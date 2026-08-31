"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, loginDemo, type AuthActionState } from "../actions";
import { FormField, inputClassName } from "@/components/ui/form-field";

const initialState: AuthActionState = {};

export function LoginForm({
  redirectTo,
  demoError,
}: {
  redirectTo?: string;
  demoError?: boolean;
}) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-zinc-900">Log in</h1>
        <p className="mt-1 text-sm text-zinc-500">Welcome back.</p>
      </div>

      {demoError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          The demo account isn&apos;t available right now.
        </p>
      )}

      <form action={formAction} className="flex flex-col gap-5">
        {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}

        {state.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <FormField label="Email" htmlFor="email" error={state.fieldErrors?.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className={inputClassName}
            required
          />
        </FormField>

        <FormField label="Password" htmlFor="password" error={state.fieldErrors?.password}>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className={inputClassName}
            required
          />
        </FormField>

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
        >
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-500">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-zinc-900 underline">
          Sign up
        </Link>
      </p>

      <div className="flex items-center gap-3 text-xs text-zinc-400">
        <div className="h-px flex-1 bg-zinc-200" />
        or
        <div className="h-px flex-1 bg-zinc-200" />
      </div>

      <form action={loginDemo}>
        <button
          type="submit"
          className="w-full rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Try the demo
        </button>
      </form>
    </div>
  );
}
