import { cancelSale, recordSale } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { Card, EmptyState, Field, PageHeader, Pagination, StatusBadge, buttonClass, deleteBtnClass, ghostButtonClass, inputClass } from "@/components/ui";
import { FlashToast } from "@/components/flash-toast";
import { SaleCartForm } from "@/components/sale-cart-form";
import { money } from "@/lib/format";
import { row, rows } from "@/lib/db";
import { XCircle } from "lucide-react";
import { Suspense } from "react";

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
    "SELECT id, name, selling_price, stock_quantity FROM products WHERE status = 'active' AND stock_quantity > 0 ORDER BY name",
  );
  const total = await row<{ total: number }>(
    `SELECT COUNT(DISTINCT s.id) total FROM sales s
     WHERE (? = '' OR s.customer_name LIKE ? OR s.customer_phone LIKE ?)
     AND (? = '' OR s.status = ?)
     AND (? = '' OR s.sale_date >= ?)
     AND (? = '' OR s.sale_date <= ?)`,
    [search, `%${search}%`, `%${search}%`, status, status, dateFrom, dateFrom, dateTo, dateTo],
  );
  const sales = await rows<{
    id: number;
    sale_date: string;
    customer_name: string | null;
    customer_phone: string | null;
    total_amount: number;
    payment_method: string;
    status: string;
    item_count: number;
  }>(
    `SELECT s.id, s.sale_date, s.customer_name, s.customer_phone, s.total_amount, s.payment_method, s.status,
            COUNT(si.id) item_count
     FROM sales s
     LEFT JOIN sale_items si ON si.sale_id = s.id
     WHERE (? = '' OR s.customer_name LIKE ? OR s.customer_phone LIKE ?)
     AND (? = '' OR s.status = ?)
     AND (? = '' OR s.sale_date >= ?)
     AND (? = '' OR s.sale_date <= ?)
     GROUP BY s.id
     ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
    [search, `%${search}%`, `%${search}%`, status, status, dateFrom, dateFrom, dateTo, dateTo, pageSize, offset],
  );

  const hasFilter = search || status || dateFrom || dateTo;

  return (
    <AppShell>
      <Suspense><FlashToast /></Suspense>
      <PageHeader title="Sales" eyebrow="Checkout" />

      <Card className="mb-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">New sale</h2>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active products with stock available. Add stock via Inventory first.</p>
        ) : (
          <SaleCartForm products={products} action={recordSale} />
        )}
      </Card>

      <Card>
        <form className="mb-4 flex flex-wrap gap-3" method="get">
          <input
            className={inputClass + " min-w-44 flex-1"}
            name="search"
            placeholder="Search by customer name or phone…"
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
            <span className="text-xs text-muted-foreground">to</span>
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
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-3 pr-4">ID</th>
                <th className="pr-4">Date</th>
                <th className="pr-4">Customer</th>
                <th className="pr-4">Items</th>
                <th className="pr-4">Amount</th>
                <th className="pr-4">Payment</th>
                <th className="pr-4">Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sales.map((s) => (
                <tr key={s.id}>
                  <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                    #{String(s.id).padStart(4, "0")}
                  </td>
                  <td className="pr-4 text-muted-foreground">{s.sale_date}</td>
                  <td className="pr-4">
                    <p className="font-medium">{s.customer_name || "Walk-in"}</p>
                    {s.customer_phone && <p className="text-xs text-muted-foreground">{s.customer_phone}</p>}
                  </td>
                  <td className="pr-4">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {s.item_count} item{s.item_count !== 1 ? "s" : ""}
                    </span>
                  </td>
                  <td className="pr-4 font-bold text-foreground">{money(s.total_amount)}</td>
                  <td className="pr-4 capitalize text-muted-foreground">{s.payment_method.replace(/_/g, " ")}</td>
                  <td className="pr-4"><StatusBadge status={s.status} /></td>
                  <td>
                    {s.status !== "cancelled" && (
                      <form action={cancelSale} data-confirm={`Cancel sale #${String(s.id).padStart(4, "0")}? Stock will be restored.`}>
                        <input type="hidden" name="id" value={s.id} />
                        <button type="submit" className={deleteBtnClass}>
                          <XCircle size={11} />
                          Cancel
                        </button>
                      </form>
                    )}
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
