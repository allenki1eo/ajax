import { AppShell } from "@/components/app-shell";
import { Card, EmptyState, PageHeader, Stat, buttonClass, ghostButtonClass, inputClass } from "@/components/ui";
import { money, percent } from "@/lib/format";
import { row, rows } from "@/lib/db";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const reportType = params.type || "sales";
  const dateFrom = params.from || firstOfMonth();
  const dateTo = params.to || today();

  // ─── Sales report data ───────────────────────────────────────────
  const salesSummary = reportType === "sales"
    ? await row<{ total_transactions: number; total_revenue: number; avg_transaction: number; highest_sale: number }>(
        `SELECT COUNT(*) total_transactions, COALESCE(SUM(total_amount),0) total_revenue,
                COALESCE(AVG(total_amount),0) avg_transaction, COALESCE(MAX(total_amount),0) highest_sale
         FROM sales WHERE sale_date BETWEEN ? AND ? AND status = 'completed'`,
        [dateFrom, dateTo],
      )
    : null;

  const dailySales = reportType === "sales"
    ? await rows<{ date: string; transaction_count: number; total_sales: number; avg_sale: number }>(
        `SELECT sale_date date, COUNT(*) transaction_count,
                SUM(total_amount) total_sales, AVG(total_amount) avg_sale
         FROM sales WHERE sale_date BETWEEN ? AND ? AND status = 'completed'
         GROUP BY sale_date ORDER BY sale_date DESC`,
        [dateFrom, dateTo],
      )
    : [];

  const topCustomers = reportType === "sales"
    ? await rows<{ customer_name: string; customer_email: string | null; purchase_count: number; total_spent: number }>(
        `SELECT customer_name, customer_email, COUNT(*) purchase_count, SUM(total_amount) total_spent
         FROM sales
         WHERE sale_date BETWEEN ? AND ? AND status = 'completed' AND customer_name IS NOT NULL AND customer_name != ''
         GROUP BY customer_name, customer_email
         ORDER BY total_spent DESC LIMIT 10`,
        [dateFrom, dateTo],
      )
    : [];

  // ─── Products report data ─────────────────────────────────────────
  const productPerformance = reportType === "products"
    ? await rows<{ name: string; sku: string | null; total_sold: number; total_revenue: number; total_profit: number; stock_quantity: number }>(
        `SELECT p.name, p.sku,
                COALESCE(SUM(si.quantity),0) total_sold,
                COALESCE(SUM(si.total_price),0) total_revenue,
                COALESCE(SUM(si.total_price) - SUM(si.quantity * p.cost_price),0) total_profit,
                p.stock_quantity
         FROM products p
         LEFT JOIN sale_items si ON p.id = si.product_id
         LEFT JOIN sales s ON si.sale_id = s.id AND s.sale_date BETWEEN ? AND ? AND s.status = 'completed'
         WHERE p.status = 'active'
         GROUP BY p.id ORDER BY total_sold DESC`,
        [dateFrom, dateTo],
      )
    : [];

  const lowStock = reportType === "products"
    ? await rows<{ name: string; sku: string | null; stock_quantity: number; min_stock_level: number }>(
        "SELECT name, sku, stock_quantity, min_stock_level FROM products WHERE status = 'active' AND stock_quantity <= min_stock_level ORDER BY stock_quantity ASC",
      )
    : [];

  // ─── Profit/Loss report data ──────────────────────────────────────
  const profitSummary = reportType === "profit"
    ? await row<{ total_revenue: number; total_cost: number; total_profit: number; overall_margin: number }>(
        `SELECT COALESCE(SUM(si.total_price),0) total_revenue,
                COALESCE(SUM(si.quantity * p.cost_price),0) total_cost,
                COALESCE(SUM(si.total_price) - SUM(si.quantity * p.cost_price),0) total_profit,
                CASE WHEN SUM(si.quantity * p.cost_price) > 0
                     THEN ((SUM(si.total_price) - SUM(si.quantity * p.cost_price)) / SUM(si.quantity * p.cost_price) * 100)
                     ELSE 0 END overall_margin
         FROM sales s JOIN sale_items si ON s.id = si.sale_id JOIN products p ON si.product_id = p.id
         WHERE s.sale_date BETWEEN ? AND ? AND s.status = 'completed'`,
        [dateFrom, dateTo],
      )
    : null;

  const monthlyProfit = reportType === "profit"
    ? await rows<{ month_label: string; revenue: number; cost: number; profit: number; profit_margin: number }>(
        `SELECT strftime('%Y-%m', s.sale_date) month_label,
                SUM(si.total_price) revenue,
                SUM(si.quantity * p.cost_price) cost,
                SUM(si.total_price) - SUM(si.quantity * p.cost_price) profit,
                CASE WHEN SUM(si.quantity * p.cost_price) > 0
                     THEN ((SUM(si.total_price) - SUM(si.quantity * p.cost_price)) / SUM(si.quantity * p.cost_price) * 100)
                     ELSE 0 END profit_margin
         FROM sales s JOIN sale_items si ON s.id = si.sale_id JOIN products p ON si.product_id = p.id
         WHERE s.sale_date BETWEEN ? AND ? AND s.status = 'completed'
         GROUP BY strftime('%Y-%m', s.sale_date)
         ORDER BY month_label DESC`,
        [dateFrom, dateTo],
      )
    : [];

  const typeLabels: Record<string, string> = { sales: "Sales", products: "Products", profit: "Profit / Loss" };

  return (
    <AppShell>
      <PageHeader title="Reports" eyebrow="Analytics" />

      {/* Filter bar */}
      <Card className="mb-6">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">Report type</span>
            <select className={inputClass + " w-48"} name="type" defaultValue={reportType}>
              <option value="sales">Sales Report</option>
              <option value="products">Products Report</option>
              <option value="profit">Profit / Loss</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">From</span>
            <input className={inputClass + " w-36"} name="from" type="date" defaultValue={dateFrom} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">To</span>
            <input className={inputClass + " w-36"} name="to" type="date" defaultValue={dateTo} />
          </label>
          <div className="flex gap-2 self-end">
            <button className={buttonClass} type="submit">Generate</button>
            <a href="/reports" className={ghostButtonClass}>Reset</a>
          </div>
        </form>
      </Card>

      <p className="mb-4 text-sm text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{typeLabels[reportType]}</span> from{" "}
        <span className="font-semibold text-foreground">{dateFrom}</span> to{" "}
        <span className="font-semibold text-foreground">{dateTo}</span>
      </p>

      {/* ─── Sales report ─────────────────────────────────────── */}
      {reportType === "sales" && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Total transactions" value={salesSummary?.total_transactions || 0} tone="primary" />
            <Stat label="Total revenue" value={money(salesSummary?.total_revenue)} tone="success" />
            <Stat label="Average transaction" value={money(salesSummary?.avg_transaction)} tone="info" />
            <Stat label="Highest sale" value={money(salesSummary?.highest_sale)} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <Card>
              <h2 className="mb-4 text-base font-semibold text-foreground">Daily sales</h2>
              {dailySales.length === 0 ? (
                <EmptyState title="No sales in range" body="Adjust the date range or record some completed sales." />
              ) : (
                <div className="table-scroll">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="py-3 pr-4">Date</th>
                        <th className="pr-4">Transactions</th>
                        <th className="pr-4">Total</th>
                        <th>Average</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {dailySales.map((d) => (
                        <tr key={d.date}>
                          <td className="py-3 pr-4 text-muted-foreground">{d.date}</td>
                          <td className="pr-4 font-medium">{d.transaction_count}</td>
                          <td className="pr-4 font-bold text-foreground">{money(d.total_sales)}</td>
                          <td className="text-muted-foreground">{money(d.avg_sale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card>
              <h2 className="mb-4 text-base font-semibold text-foreground">Top customers</h2>
              {topCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No named customers in this period.</p>
              ) : (
                <div className="space-y-3">
                  {topCustomers.map((c) => (
                    <div key={c.customer_name} className="flex items-center justify-between gap-3 rounded-md bg-muted/40 p-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{c.customer_name}</p>
                        {c.customer_email && <p className="truncate text-xs text-muted-foreground">{c.customer_email}</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-bold text-foreground">{money(c.total_spent)}</p>
                        <p className="text-xs text-muted-foreground">{c.purchase_count} order{c.purchase_count !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {/* ─── Products report ──────────────────────────────────── */}
      {reportType === "products" && (
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Card>
            <h2 className="mb-4 text-base font-semibold text-foreground">Product performance</h2>
            {productPerformance.length === 0 ? (
              <EmptyState title="No data" body="No active products found." />
            ) : (
              <div className="table-scroll">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="py-3 pr-4">Product</th>
                      <th className="pr-4">SKU</th>
                      <th className="pr-4">Sold</th>
                      <th className="pr-4">Revenue</th>
                      <th className="pr-4">Profit</th>
                      <th>Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {productPerformance.map((p) => (
                      <tr key={p.name}>
                        <td className="py-3 pr-4 font-semibold text-foreground">{p.name}</td>
                        <td className="pr-4 text-muted-foreground">{p.sku || "—"}</td>
                        <td className="pr-4">{p.total_sold}</td>
                        <td className="pr-4">{money(p.total_revenue)}</td>
                        <td className={`pr-4 font-semibold ${p.total_profit < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                          {money(p.total_profit)}
                        </td>
                        <td>
                          <span className="font-medium">{p.stock_quantity}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-semibold text-foreground">Low stock alert</h2>
            {lowStock.length === 0 ? (
              <p className="text-sm text-emerald-700">All products are well stocked.</p>
            ) : (
              <div className="space-y-2">
                {lowStock.map((p) => (
                  <div key={p.name} className="rounded-md bg-orange-50 p-3">
                    <p className="font-semibold text-foreground">{p.name}</p>
                    {p.sku && <p className="text-xs text-muted-foreground">{p.sku}</p>}
                    <p className="mt-1 text-sm text-orange-700">
                      {p.stock_quantity} in stock — minimum {p.min_stock_level}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ─── Profit / Loss report ─────────────────────────────── */}
      {reportType === "profit" && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Total revenue" value={money(profitSummary?.total_revenue)} tone="success" />
            <Stat label="Total cost" value={money(profitSummary?.total_cost)} />
            <Stat label="Total profit" value={money(profitSummary?.total_profit)} tone={Number(profitSummary?.total_profit || 0) >= 0 ? "info" : "destructive"} />
            <Stat label="Profit margin" value={percent(profitSummary?.overall_margin)} tone="primary" />
          </div>

          <Card>
            <h2 className="mb-4 text-base font-semibold text-foreground">Monthly breakdown</h2>
            {monthlyProfit.length === 0 ? (
              <EmptyState title="No completed sales in range" body="Adjust the date range to see monthly profit and loss." />
            ) : (
              <div className="table-scroll">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="py-3 pr-4">Month</th>
                      <th className="pr-4">Revenue</th>
                      <th className="pr-4">Cost</th>
                      <th className="pr-4">Profit / Loss</th>
                      <th>Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {monthlyProfit.map((m) => (
                      <tr key={m.month_label}>
                        <td className="py-3 pr-4 font-medium text-foreground">{m.month_label}</td>
                        <td className="pr-4">{money(m.revenue)}</td>
                        <td className="pr-4 text-muted-foreground">{money(m.cost)}</td>
                        <td className={`pr-4 font-semibold ${m.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {money(m.profit)}
                        </td>
                        <td>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.profit_margin >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                            {percent(m.profit_margin)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </AppShell>
  );
}
