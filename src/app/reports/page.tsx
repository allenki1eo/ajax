import { AppShell } from "@/components/app-shell";
import { Card, PageHeader, Stat } from "@/components/ui";
import { money, percent } from "@/lib/format";
import { row, rows } from "@/lib/db";

export default async function ReportsPage() {
  const summary = await row<{ revenue: number; cost: number; profit: number; margin: number; sales_count: number }>(
    `SELECT
      COALESCE(SUM(si.total_price), 0) revenue,
      COALESCE(SUM(si.quantity * p.cost_price), 0) cost,
      COALESCE(SUM(si.total_price - (si.quantity * p.cost_price)), 0) profit,
      CASE WHEN SUM(si.total_price) > 0 THEN (SUM(si.total_price - (si.quantity * p.cost_price)) / SUM(si.total_price) * 100) ELSE 0 END margin,
      COUNT(DISTINCT s.id) sales_count
     FROM sales s
     JOIN sale_items si ON si.sale_id = s.id
     JOIN products p ON p.id = si.product_id
     WHERE s.status = 'completed'`,
  );
  const productPerformance = await rows<{ name: string; qty: number; revenue: number; profit: number }>(
    `SELECT p.name, SUM(si.quantity) qty, SUM(si.total_price) revenue, SUM(si.total_price - si.quantity * p.cost_price) profit
     FROM sale_items si JOIN products p ON p.id = si.product_id JOIN sales s ON s.id = si.sale_id
     WHERE s.status = 'completed'
     GROUP BY p.id ORDER BY revenue DESC LIMIT 20`,
  );
  const lowStock = await rows<{ name: string; stock_quantity: number; min_stock_level: number }>(
    "SELECT name, stock_quantity, min_stock_level FROM products WHERE status = 'active' AND stock_quantity <= min_stock_level ORDER BY stock_quantity ASC LIMIT 20",
  );

  return (
    <AppShell>
      <PageHeader title="Reports" eyebrow="Profit and stock" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Completed revenue" value={money(summary?.revenue)} tone="mint" />
        <Stat label="Gross profit" value={money(summary?.profit)} />
        <Stat label="Profit margin" value={percent(summary?.margin)} tone="sky" />
        <Stat label="Completed sales" value={summary?.sales_count || 0} tone="ember" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <h2 className="mb-4 text-lg font-black text-ink">Product performance</h2>
          <div className="table-scroll">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-3">Product</th><th>Sold</th><th>Revenue</th><th>Profit</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {productPerformance.map((p) => <tr key={p.name}><td className="py-3 font-bold">{p.name}</td><td>{p.qty}</td><td>{money(p.revenue)}</td><td className="font-bold">{money(p.profit)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-black text-ink">Low stock</h2>
          <div className="space-y-3">
            {lowStock.length === 0 ? <p className="text-sm text-slate-500">No low stock items.</p> : null}
            {lowStock.map((p) => (
              <div key={p.name} className="rounded-md bg-orange-50 p-3">
                <p className="font-bold text-slate-900">{p.name}</p>
                <p className="text-sm text-orange-700">{p.stock_quantity} available, minimum {p.min_stock_level}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
