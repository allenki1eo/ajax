import { recordSale, deleteSale } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { Card, EmptyState, Field, PageHeader, Pagination, StatusBadge, buttonClass, deleteBtnClass, ghostButtonClass, inputClass } from "@/components/ui";
import { money } from "@/lib/format";
import { row, rows } from "@/lib/db";
import { Trash2 } from "lucide-react";

export default async function SalesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const search = params.search || "";
  const status = params.status || "";
  const dateFrom = params.from || "";
  const dateTo = params.to || "";
  const pageSize = 25;
  const page = Math.max(1, Number(params.page || 1));
  const offset = (page - 1) * pageSize;

  const products = await rows<{ id: number; name: string; selling_price: number; stock_quantity: number }>(
    "SELECT id, name, selling_price, stock_quantity FROM products WHERE status = 'active' ORDER BY name",
  );
  const total = await row<{ total: number }>(
    `SELECT COUNT(*) total FROM sales
     WHERE (? = '' OR customer_name LIKE ?)
     AND (? = '' OR status = ?)
     AND (? = '' OR sale_date >= ?)
     AND (? = '' OR sale_date <= ?)`,
    [search, `%${search}%`, status, status, dateFrom, dateFrom, dateTo, dateTo],
  );
  const sales = await rows<{ id: number; sale_date: string; customer_name: string | null; total_amount: number; payment_method: string; status: string }>(
    `SELECT id, sale_date, customer_name, total_amount, payment_method, status
     FROM sales
     WHERE (? = '' OR customer_name LIKE ?)
     AND (? = '' OR status = ?)
     AND (? = '' OR sale_date >= ?)
     AND (? = '' OR sale_date <= ?)
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [search, `%${search}%`, status, status, dateFrom, dateFrom, dateTo, dateTo, pageSize, offset],
  );

  const hasFilter = search || status || dateFrom || dateTo;

  return (
    <AppShell>
      <PageHeader title="Sales" eyebrow="Checkout" />
      <Card className="mb-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">Record a sale</h2>
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
          <Field label="Quantity">
            <input className={inputClass} name="quantity" type="number" min="1" defaultValue="1" />
          </Field>
          <Field label="Date">
            <input className={inputClass} name="sale_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </Field>
          <Field label="Payment">
            <select className={inputClass} name="payment_method">
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Customer">
            <input className={inputClass} name="customer_name" placeholder="Walk-in" />
          </Field>
          <div className="md:col-span-2 xl:col-span-5">
            <Field label="Notes"><input className={inputClass} name="notes" /></Field>
          </div>
          <button className={buttonClass + " md:col-span-2 xl:col-span-5"}>Record sale</button>
        </form>
      </Card>

      <Card>
        <form className="mb-4 flex flex-wrap gap-3" method="get">
          <input
            className={inputClass + " min-w-44 flex-1"}
            name="search"
            placeholder="Search by customer name…"
            defaultValue={search}
          />
          <select className={inputClass + " w-40"} name="status" defaultValue={status}>
            <option value="">All statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <div className="flex items-center gap-2">
            <input className={inputClass + " w-36"} name="from" type="date" defaultValue={dateFrom} title="From date" />
            <span className="text-muted-foreground text-xs">to</span>
            <input className={inputClass + " w-36"} name="to" type="date" defaultValue={dateTo} title="To date" />
          </div>
          <button className={buttonClass} type="submit">Filter</button>
          {hasFilter && <a href="/sales" className={ghostButtonClass}>Clear</a>}
        </form>

        {hasFilter && (
          <p className="mb-3 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{Number(total?.total || 0)}</span> sale{Number(total?.total || 0) !== 1 ? "s" : ""} found
          </p>
        )}

        <div className="table-scroll">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-3 pr-4">Date</th>
                <th className="pr-4">Customer</th>
                <th className="pr-4">Amount</th>
                <th className="pr-4">Payment</th>
                <th className="pr-4">Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sales.map((s) => (
                <tr key={s.id}>
                  <td className="py-3 pr-4 text-muted-foreground">{s.sale_date}</td>
                  <td className="pr-4 font-medium">{s.customer_name || "Walk-in"}</td>
                  <td className="pr-4 font-bold text-foreground">{money(s.total_amount)}</td>
                  <td className="pr-4 capitalize text-muted-foreground">{s.payment_method.replace(/_/g, " ")}</td>
                  <td className="pr-4"><StatusBadge status={s.status} /></td>
                  <td>
                    <form action={deleteSale} data-confirm={`Delete this sale of ${money(s.total_amount)}? This cannot be undone.`}>
                      <input type="hidden" name="id" value={s.id} />
                      <button type="submit" className={deleteBtnClass}>
                        <Trash2 size={11} />
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sales.length === 0 && (
          <EmptyState title="No sales found" body="Record a sale above or adjust your search filters." />
        )}
        <Pagination basePath="/sales" page={page} pageSize={pageSize} total={Number(total?.total || 0)} params={{ search, status, from: dateFrom, to: dateTo }} />
      </Card>
    </AppShell>
  );
}
