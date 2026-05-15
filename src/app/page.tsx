import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SalesChart } from "@/components/sales-chart";
import { Card, PageHeader, Stat, ghostButtonClass } from "@/components/ui";
import { money } from "@/lib/format";
import { row, rows } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const stats = await row<{ products: number; low_stock: number; today_sales: number; month_sales: number; stock_value: number }>(
    `SELECT
      (SELECT COUNT(*) FROM products WHERE status = 'active') products,
      (SELECT COUNT(*) FROM products WHERE status = 'active' AND stock_quantity <= min_stock_level) low_stock,
      (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE sale_date = date('now') AND status = 'completed') today_sales,
      (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE strftime('%Y-%m', sale_date) = strftime('%Y-%m', 'now') AND status = 'completed') month_sales,
      (SELECT COALESCE(SUM(stock_quantity * cost_price), 0) FROM products WHERE status = 'active') stock_value`,
  );
  const recentSales = await rows<{ id: number; sale_date: string; customer_name: string | null; total_amount: number; status: string }>(
    "SELECT id, sale_date, customer_name, total_amount, status FROM sales ORDER BY created_at DESC LIMIT 6",
  );
  const topProducts = await rows<{ name: string; total_sold: number; revenue: number }>(
    `SELECT p.name, SUM(si.quantity) total_sold, SUM(si.total_price) revenue
     FROM products p JOIN sale_items si ON p.id = si.product_id JOIN sales s ON s.id = si.sale_id
     WHERE s.status = 'completed' GROUP BY p.id ORDER BY total_sold DESC LIMIT 6`,
  );
  const chart = await rows<{ month: string; total: number }>(
    `SELECT strftime('%m', sale_date) month, COALESCE(SUM(total_amount), 0) total
     FROM sales WHERE strftime('%Y', sale_date) = strftime('%Y', 'now') AND status = 'completed'
     GROUP BY month ORDER BY month`,
  );

  return (
    <AppShell>
      <PageHeader title="Command Center" eyebrow="Overview">
        <Button asChild variant="outline" className={ghostButtonClass}>
          <Link href="/sales">Record sale</Link>
        </Button>
      </PageHeader>
      <Card className="mb-6 overflow-hidden bg-[linear-gradient(135deg,#14352c_0%,#2f7d5c_55%,#b8623b_140%)] text-white">
        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
          <div>
            <Badge className="mb-4 bg-white/15 text-white hover:bg-white/20">Jungle signal</Badge>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Stock, cash, and margin in one living view.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
              The dashboard now reads the shop floor like a canopy map: fast-moving products rise, low-stock items surface, and daily revenue stays visible.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-white/15 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
              <p className="text-white/65">This month</p>
              <p className="mt-2 text-xl font-black">{money(stats?.month_sales)}</p>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
              <p className="text-white/65">Low alerts</p>
              <p className="mt-2 text-xl font-black">{stats?.low_stock || 0}</p>
            </div>
          </div>
        </div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active products" value={stats?.products || 0} />
        <Stat label="Low stock alerts" value={stats?.low_stock || 0} tone="ember" />
        <Stat label="Today sales" value={money(stats?.today_sales)} tone="mint" />
        <Stat label="Inventory value" value={money(stats?.stock_value)} tone="sky" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-canopy">Monthly sales</h2>
            <span className="text-sm font-semibold text-slate-500">{money(stats?.month_sales)} this month</span>
          </div>
          <SalesChart data={chart.map((item) => ({ month: item.month, total: Number(item.total) }))} />
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-black text-canopy">Top products</h2>
          <div className="space-y-3">
            {topProducts.map((product) => (
              <div key={product.name} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-3">
                <div>
                  <p className="font-bold text-slate-900">{product.name}</p>
                  <p className="text-sm text-slate-500">{product.total_sold} sold</p>
                </div>
                <p className="text-sm font-black text-canopy">{money(product.revenue)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="mt-6">
        <h2 className="mb-4 text-lg font-black text-canopy">Recent sales</h2>
        <div className="table-scroll">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="py-3">Date</th><th>Customer</th><th>Amount</th><th>Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentSales.map((sale) => (
                <tr key={sale.id}><td className="py-3">{sale.sale_date}</td><td>{sale.customer_name || "Walk-in"}</td><td className="font-bold">{money(sale.total_amount)}</td><td className="capitalize">{sale.status}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
