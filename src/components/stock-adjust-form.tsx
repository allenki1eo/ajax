"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { adjustStock } from "@/app/actions";
import { buttonClass, Field, inputClass } from "@/components/ui";

type Product = { id: number; name: string; stock_quantity: number };
type State = { error: string } | void | null;

export function StockAdjustForm({ products }: { products: Product[] }) {
  const [state, formAction, pending] = useActionState<State, FormData>(adjustStock, null);

  useEffect(() => {
    if (state === null) return;
    if (state && "error" in state) {
      toast.error(state.error);
    } else if (state === undefined && !pending) {
      toast.success("Stock adjusted successfully");
    }
  }, [state, pending]);

  return (
    <form action={formAction} className="space-y-4">
      {state != null && typeof state === "object" && "error" in state && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}
      <Field label="Product">
        <select className={inputClass} name="product_id">
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name} ({p.stock_quantity})</option>
          ))}
        </select>
      </Field>
      <Field label="Movement">
        <select className={inputClass} name="movement_type">
          <option value="in">Stock in</option>
          <option value="out">Stock out</option>
        </select>
      </Field>
      <Field label="Quantity">
        <input className={inputClass} name="quantity" type="number" min="1" required />
      </Field>
      <Field label="Notes">
        <input className={inputClass} name="notes" />
      </Field>
      <button className={buttonClass + " w-full"} disabled={pending}>
        {pending ? "Saving…" : "Save adjustment"}
      </button>
    </form>
  );
}
