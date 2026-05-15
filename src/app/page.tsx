import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SalesChart } from "@/components/sales-chart";
import { Card, PageHeader, Stat } from "@/components/ui";
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
      <PageHeader title="Dashboard" eyebrow="Overview">
        <Button asChild>
          <Link href="/sales">Record sale</Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active products" value={stats?.products || 0} />
        <Stat label="Low stock alerts" value={stats?.low_stock || 0} tone="destructive" />
        <Stat label="Today's sales" value={money(stats?.today_sales)} tone="success" />
        <Stat label="Inventory value" value={money(stats?.stock_value)} tone="info" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Monthly Sales</h2>
            <span className="text-sm text-muted-foreground">{money(stats?.month_sales)} this month</span>
          </div>
          <SalesChart data={chart.map((item) => ({ month: item.month, total: Number(item.total) }))} />
        </Card>
        <Card>
          <h2 className="mb-4 text-base font-semibold text-foreground">Top Products</h2>
          <div className="space-y-2">
            {topProducts.map((product) => (
              <div key={product.name} className="flex items-center justify-between gap-3 rounded-md bg-muted/50 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.total_sold} sold</p>
                </div>
                <p className="text-sm font-semibold text-foreground">{money(product.revenue)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Recent Sales</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/sales">View all</Link>
          </Button>
        </div>
        <div className="table-scroll">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3 pr-4">Customer</th>
                <th className="pb-3 pr-4">Amount</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentSales.map((sale) => (
                <tr key={sale.id}>
                  <td className="py-3 pr-4 text-muted-foreground">{sale.sale_date}</td>
                  <td className="py-3 pr-4 font-medium">{sale.customer_name || "Walk-in"}</td>
                  <td className="py-3 pr-4 font-semibold">{money(sale.total_amount)}</td>
                  <td className="py-3">
                    <Badge variant={sale.status === "completed" ? "default" : "secondary"} className="capitalize">
                      {sale.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
