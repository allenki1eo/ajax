import { recordPurchase } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { Card, EmptyState, Field, PageHeader, Pagination, buttonClass, inputClass } from "@/components/ui";
import { money } from "@/lib/format";
import { row, rows } from "@/lib/db";

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const pageSize = 25;
  const page = Math.max(1, Number(params.page || 1));
  const offset = (page - 1) * pageSize;
  const products = await rows<{ id: number; name: string; cost_price: number }>("SELECT id, name, cost_price FROM products WHERE status = 'active' ORDER BY name");
  const suppliers = await rows<{ id: number; name: string }>("SELECT id, name FROM suppliers ORDER BY name");
  const total = await row<{ total: number }>("SELECT COUNT(*) total FROM purchases");
  const purchases = await rows<{ id: number; purchase_date: string; supplier_name: string | null; total_amount: number; status: string }>(
    "SELECT p.id, p.purchase_date, s.name supplier_name, p.total_amount, p.status FROM purchases p LEFT JOIN suppliers s ON s.id = p.supplier_id ORDER BY p.created_at DESC LIMIT ? OFFSET ?",
    [pageSize, offset],
  );

  return (
    <AppShell>
      <PageHeader title="Purchases" eyebrow="Receiving" />
      <Card className="mb-6">
        <form action={recordPurchase} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Product"><select className={inputClass} name="product_id">{products.map((p) => <option key={p.id} value={p.id}>{p.name} - {money(p.cost_price)}</option>)}</select></Field>
          <Field label="Supplier"><select className={inputClass} name="supplier_id"><option value="">None</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Quantity"><input className={inputClass} name="quantity" type="number" min="1" defaultValue="1" /></Field>
          <Field label="Unit cost"><input className={inputClass} name="unit_cost" type="number" step="0.01" min="0" required /></Field>
          <Field label="Date"><input className={inputClass} name="purchase_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
          <input type="hidden" name="status" value="received" />
          <div className="md:col-span-2 xl:col-span-5"><Field label="Notes"><input className={inputClass} name="notes" /></Field></div>
          <button className={buttonClass + " md:col-span-2 xl:col-span-5"}>Record purchase</button>
        </form>
      </Card>
      <Card>
        <div className="table-scroll">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-3">Date</th><th>Supplier</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.map((p) => <tr key={p.id}><td className="py-3">{p.purchase_date}</td><td>{p.supplier_name || "No supplier"}</td><td className="font-bold">{money(p.total_amount)}</td><td className="capitalize">{p.status}</td></tr>)}
            </tbody>
          </table>
        </div>
        {purchases.length === 0 ? <EmptyState title="No purchases recorded" body="Record incoming stock above to keep inventory value and supplier history current." /> : null}
        <Pagination basePath="/purchases" page={page} pageSize={pageSize} total={Number(total?.total || 0)} />
      </Card>
    </AppShell>
  );
}
