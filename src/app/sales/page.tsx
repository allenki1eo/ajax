import { recordSale } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { Card, Field, PageHeader, buttonClass, inputClass } from "@/components/ui";
import { money } from "@/lib/format";
import { rows } from "@/lib/db";

export default async function SalesPage() {
  const products = await rows<{ id: number; name: string; selling_price: number; stock_quantity: number }>("SELECT id, name, selling_price, stock_quantity FROM products WHERE status = 'active' ORDER BY name");
  const sales = await rows<{ id: number; sale_date: string; customer_name: string | null; total_amount: number; payment_method: string; status: string }>("SELECT id, sale_date, customer_name, total_amount, payment_method, status FROM sales ORDER BY created_at DESC LIMIT 80");

  return (
    <AppShell>
      <PageHeader title="Sales" eyebrow="Checkout" />
      <Card className="mb-6">
        <form action={recordSale} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Product"><select className={inputClass} name="product_id">{products.map((p) => <option key={p.id} value={p.id}>{p.name} - {money(p.selling_price)} ({p.stock_quantity})</option>)}</select></Field>
          <Field label="Quantity"><input className={inputClass} name="quantity" type="number" min="1" defaultValue="1" /></Field>
          <Field label="Date"><input className={inputClass} name="sale_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
          <Field label="Payment"><select className={inputClass} name="payment_method"><option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="other">Other</option></select></Field>
          <Field label="Customer"><input className={inputClass} name="customer_name" placeholder="Walk-in" /></Field>
          <div className="md:col-span-2 xl:col-span-5"><Field label="Notes"><input className={inputClass} name="notes" /></Field></div>
          <button className={buttonClass + " md:col-span-2 xl:col-span-5"}>Record sale</button>
        </form>
      </Card>
      <Card>
        <div className="table-scroll">
          <table className="w-full min-w-[740px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-3">Date</th><th>Customer</th><th>Amount</th><th>Payment</th><th>Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {sales.map((s) => <tr key={s.id}><td className="py-3">{s.sale_date}</td><td>{s.customer_name || "Walk-in"}</td><td className="font-bold">{money(s.total_amount)}</td><td className="capitalize">{s.payment_method.replace("_", " ")}</td><td className="capitalize">{s.status}</td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
