import { recordSale } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { Card, EmptyState, Field, PageHeader, Pagination, StatusBadge, buttonClass, ghostButtonClass, inputClass } from "@/components/ui";
import { money } from "@/lib/format";
import { row, rows } from "@/lib/db";

export default async function SalesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const search = params.search || "";
  const status = params.status || "";
  const pageSize = 25;
  const page = Math.max(1, Number(params.page || 1));
  const offset = (page - 1) * pageSize;

  const products = await rows<{ id: number; name: string; selling_price: number; stock_quantity: number }>(
    "SELECT id, name, selling_price, stock_quantity FROM products WHERE status = 'active' ORDER BY name",
  );
  const total = await row<{ total: number }>(
    `SELECT COUNT(*) total FROM sales
     WHERE (? = '' OR customer_name LIKE ?)
     AND (? = '' OR status = ?)`,
    [search, `%${search}%`, status, status],
  );
  const sales = await rows<{ id: number; sale_date: string; customer_name: string | null; total_amount: number; payment_method: string; status: string }>(
    `SELECT id, sale_date, customer_name, total_amount, payment_method, status
     FROM sales
     WHERE (? = '' OR customer_name LIKE ?)
     AND (? = '' OR status = ?)
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [search, `%${search}%`, status, status, pageSize, offset],
  );

  return (
    <AppShell>
      <PageHeader title="Sales" eyebrow="Checkout" />
      <Card className="mb-6">
        <form action={recordSale} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Product">
            <select className={inputClass} name="product_id">
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {money(p.selling_price)} ({p.stock_quantity} in stock)
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quantity"><input className={inputClass} name="quantity" type="number" min="1" defaultValue="1" /></Field>
          <Field label="Date"><input className={inputClass} name="sale_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
          <Field label="Payment">
            <select className={inputClass} name="payment_method">
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Customer"><input className={inputClass} name="customer_name" placeholder="Walk-in" /></Field>
          <div className="md:col-span-2 xl:col-span-5">
            <Field label="Notes"><input className={inputClass} name="notes" /></Field>
          </div>
          <button className={buttonClass + " md:col-span-2 xl:col-span-5"}>Record sale</button>
        </form>
      </Card>
      <Card>
        <form className="mb-4 flex flex-wrap gap-3" method="get">
          <input
            className={inputClass + " min-w-48 flex-1"}
            name="search"
            placeholder="Search by customer name"
            defaultValue={search}
          />
          <select className={inputClass + " w-44"} name="status" defaultValue={status}>
            <option value="">All statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className={buttonClass} type="submit">Search</button>
          {(search || status) && (
            <a href="/sales" className={ghostButtonClass}>Clear</a>
          )}
        </form>
        <div className="table-scroll">
          <table className="w-full min-w-[740px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-3">Date</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sales.map((s) => (
                <tr key={s.id}>
                  <td className="py-3">{s.sale_date}</td>
                  <td>{s.customer_name || "Walk-in"}</td>
                  <td className="font-bold">{money(s.total_amount)}</td>
                  <td className="capitalize">{s.payment_method.replace(/_/g, " ")}</td>
                  <td><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sales.length === 0 ? (
          <EmptyState title="No sales found" body="Record a sale above or adjust your search filters." />
        ) : null}
        <Pagination basePath="/sales" page={page} pageSize={pageSize} total={Number(total?.total || 0)} params={{ search, status }} />
      </Card>
    </AppShell>
  );
}
