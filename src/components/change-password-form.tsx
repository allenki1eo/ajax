"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { buttonClass, inputClass, Field } from "@/components/ui";
import { changePassword } from "@/app/actions";

type State = { error: string } | null;

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<State, FormData>(changePassword, null);
  const formRef = useRef<HTMLFormElement>(null);
  const didSubmit = useRef(false);

  useEffect(() => {
    if (pending) { didSubmit.current = true; return; }
    if (!didSubmit.current) return;
    if (state && "error" in state) {
      toast.error(state.error);
    } else if (state === null) {
      toast.success("Password changed successfully!");
      formRef.current?.reset();
      didSubmit.current = false;
    }
  }, [state, pending]);

  return (
    <form action={formAction} ref={formRef} className="grid gap-4 sm:grid-cols-3">
      <Field label="Current password">
        <input className={inputClass} name="current_password" type="password" required autoComplete="current-password" />
      </Field>
      <Field label="New password">
        <input className={inputClass} name="new_password" type="password" required minLength={6} autoComplete="new-password" />
      </Field>
      <Field label="Confirm new password">
        <input className={inputClass} name="confirm_password" type="password" required minLength={6} autoComplete="new-password" />
      </Field>
      <div className="sm:col-span-3">
        <button className={buttonClass} disabled={pending}>
          {pending ? "Saving…" : "Change password"}
        </button>
      </div>
    </form>
  );
}
