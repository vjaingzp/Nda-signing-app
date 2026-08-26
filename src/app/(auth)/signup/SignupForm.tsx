"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type AuthActionState } from "../actions";
import { FormField, inputClassName } from "@/components/ui/form-field";

const initialState: AuthActionState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  if (state.message) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">Check your email</h1>
        <p className="text-sm text-zinc-600">{state.message}</p>
        <Link href="/login" className="text-sm font-medium text-zinc-900 underline">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-zinc-900">Create your account</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Generate and sign NDAs in minutes.
        </p>
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <FormField label="Full name" htmlFor="fullName" error={state.fieldErrors?.fullName}>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          className={inputClassName}
          required
        />
      </FormField>

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
          autoComplete="new-password"
          className={inputClassName}
          required
        />
      </FormField>

      <FormField
        label="Confirm password"
        htmlFor="confirmPassword"
        error={state.fieldErrors?.confirmPassword}
      >
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          className={inputClassName}
          required
        />
      </FormField>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-zinc-900 underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
