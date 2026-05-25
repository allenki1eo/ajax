"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { buttonClass, deleteBtnClass, ghostButtonClass, inputClass, Field } from "@/components/ui";
import { money } from "@/lib/format";

type CartProduct = {
  id: number;
  name: string;
  selling_price: number;
  stock_quantity: number;
};

type CartItem = {
  key: string;
  productId: string;
  quantity: number;
  unitPrice: number;
};

type ActionResult = { error: string } | null;

function makeRow(products: CartProduct[]): CartItem {
  const p = products[0];
  return {
    key: crypto.randomUUID(),
    productId: String(p?.id ?? ""),
    quantity: 1,
    unitPrice: p?.selling_price ?? 0,
  };
}

export function SaleCartForm({
  products,
  action,
}: {
  products: CartProduct[];
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [items, setItems] = useState<CartItem[]>(() => [makeRow(products)]);

  // Reset cart on success (state goes back to null after redirect-less success)
  useEffect(() => {
    if (state && "error" in state) {
      toast.error(state.error);
    }
  }, [state]);

  function addRow() {
    setItems((prev) => [...prev, makeRow(products)]);
  }

  function removeRow(key: string) {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }

  function updateItem(key: string, patch: Partial<CartItem>) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function handleProductChange(key: string, productId: string) {
    const product = products.find((p) => String(p.id) === productId);
    updateItem(key, { productId, unitPrice: product?.selling_price ?? 0 });
  }

  const grandTotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction}>
      {/* Hidden cart payload — index-aligned arrays */}
      {items.map((item) => (
        <span key={item.key}>
          <input type="hidden" name="product_id" value={item.productId} />
          <input type="hidden" name="quantity" value={item.quantity} />
          <input type="hidden" name="unit_price" value={item.unitPrice} />
        </span>
      ))}

      {/* Cart rows */}
      <div className="mb-3 table-scroll">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="pb-2 pr-3 text-left">Product</th>
              <th className="pb-2 pr-3 w-24 text-left">Qty</th>
              <th className="pb-2 pr-3 w-32 text-left">Unit price</th>
              <th className="pb-2 pr-3 w-28 text-right">Line total</th>
              <th className="pb-2 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => {
              const product = products.find((p) => String(p.id) === item.productId);
              return (
                <tr key={item.key}>
                  <td className="py-2 pr-3">
                    <select
                      className={inputClass}
                      value={item.productId}
                      onChange={(e) => handleProductChange(item.key, e.target.value)}
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.stock_quantity} in stock)
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      className={inputClass}
                      type="number"
                      min="1"
                      max={product?.stock_quantity}
                      value={item.quantity}
                      onChange={(e) => updateItem(item.key, { quantity: Math.max(1, Number(e.target.value)) })}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.key, { unitPrice: Number(e.target.value) })}
                    />
                  </td>
                  <td className="py-2 pr-3 text-right font-semibold">
                    {money(item.unitPrice * item.quantity)}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      className={deleteBtnClass}
                      onClick={() => removeRow(item.key)}
                      disabled={items.length === 1}
                      title="Remove row"
                    >
                      <Trash2 size={11} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add item + grand total */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <button type="button" onClick={addRow} className={ghostButtonClass + " gap-1.5 text-xs"}>
          <Plus size={13} /> Add item
        </button>
        <div className="text-right">
          <span className="text-sm text-muted-foreground">Grand total: </span>
          <span className="text-lg font-bold text-foreground">{money(grandTotal)}</span>
        </div>
      </div>

      {/* Sale metadata */}
      <div className="grid gap-4 border-t pt-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Date">
          <input className={inputClass} name="sale_date" type="date" defaultValue={today} />
        </Field>
        <Field label="Payment">
          <select className={inputClass} name="payment_method">
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Customer name">
          <input className={inputClass} name="customer_name" placeholder="Walk-in" />
        </Field>
        <Field label="Customer phone">
          <input className={inputClass} name="customer_phone" placeholder="Optional" />
        </Field>
        <div className="md:col-span-2 xl:col-span-4">
          <Field label="Notes">
            <input className={inputClass} name="notes" />
          </Field>
        </div>
      </div>

      <button
        className={buttonClass + " mt-4 w-full"}
        disabled={pending || items.length === 0 || products.length === 0}
      >
        {pending ? "Recording…" : "Record sale"}
      </button>
    </form>
  );
}
