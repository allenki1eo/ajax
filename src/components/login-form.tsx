"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions";
import { buttonClass, inputClass } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <form action={action} className="space-y-4">
      {state?.error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{state.error}</div> : null}
      <input className={inputClass} name="username" placeholder="Username or email" required />
      <input className={inputClass} name="password" type="password" placeholder="Password" required />
      <button className={buttonClass + " w-full"} disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
