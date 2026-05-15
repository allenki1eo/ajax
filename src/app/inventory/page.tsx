import { adjustStock } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { Card, Field, PageHeader, buttonClass, inputClass } from "@/components/ui";
import { dateLabel } from "@/lib/format";
import { rows } from "@/lib/db";

export default async function InventoryPage() {
  const products = await rows<{ id: number; name: string; sku: string | null; stock_quantity: number; min_stock_level: number }>(
    "SELECT id, name, sku, stock_quantity, min_stock_level FROM products WHERE status = 'active' ORDER BY stock_quantity <= min_stock_level DESC, name",
  );
  const movements = await rows<{ id: number; product_name: string; movement_type: string; quantity: number; reference_type: string; notes: string | null; created_at: string }>(
    `SELECT sm.*, p.name product_name FROM stock_movements sm JOIN products p ON p.id = sm.product_id ORDER BY sm.created_at DESC LIMIT 50`,
  );

  return (
    <AppShell>
      <PageHeader title="Inventory" eyebrow="Stock control" />
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <h2 className="mb-4 text-lg font-black text-ink">Adjust stock</h2>
          <form action={adjustStock} className="space-y-4">
            <Field label="Product">
              <select className={inputClass} name="product_id">{products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.stock_quantity})</option>)}</select>
            </Field>
            <Field label="Movement">
              <select className={inputClass} name="movement_type"><option value="in">Stock in</option><option value="out">Stock out</option></select>
            </Field>
            <Field label="Quantity"><input className={inputClass} name="quantity" type="number" min="1" required /></Field>
            <Field label="Notes"><input className={inputClass} name="notes" /></Field>
            <button className={buttonClass + " w-full"}>Save adjustment</button>
          </form>
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-black text-ink">Stock positions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {products.slice(0, 12).map((p) => (
              <div key={p.id} className="rounded-md bg-slate-50 p-3">
                <p className="font-bold text-slate-900">{p.name}</p>
                <p className="text-sm text-slate-500">{p.sku || "No SKU"}</p>
                <p className={p.stock_quantity <= p.min_stock_level ? "mt-2 font-black text-ember" : "mt-2 font-black text-ink"}>{p.stock_quantity} in stock</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="mt-6">
        <h2 className="mb-4 text-lg font-black text-ink">Recent movements</h2>
        <div className="table-scroll">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-3">Date</th><th>Product</th><th>Type</th><th>Qty</th><th>Reference</th><th>Notes</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {movements.map((m) => <tr key={m.id}><td className="py-3">{dateLabel(m.created_at)}</td><td>{m.product_name}</td><td className="capitalize">{m.movement_type}</td><td className="font-bold">{m.quantity}</td><td className="capitalize">{m.reference_type}</td><td>{m.notes || "-"}</td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
