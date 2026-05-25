import { AppShell } from "@/components/app-shell";
import { Card, PageHeader, Stat, ghostButtonClass } from "@/components/ui";
import { ProductChart } from "@/components/product-chart";
import { money, percent } from "@/lib/format";
import { row, rows } from "@/lib/db";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default async function ProductChartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const product = await row<{
    id: number;
    name: string;
    sku: string | null;
    cost_price: number;
    selling_price: number;
    stock_quantity: number;
    min_stock_level: number;
  }>("SELECT id, name, sku, cost_price, selling_price, stock_quantity, min_stock_level FROM products WHERE id = ?", [id]);

  if (!product) notFound();

  const monthlyData = await rows<{ month: string; qty_sold: number; revenue: number }>(
    `SELECT strftime('%Y-%m', s.sale_date) month,
            COALESCE(SUM(si.quantity), 0) qty_sold,
            COALESCE(SUM(si.total_price), 0) revenue
     FROM sales s
     JOIN sale_items si ON s.id = si.sale_id
     WHERE si.product_id = ?
       AND s.status = 'completed'
       AND s.sale_date >= date('now', '-11 months', 'start of month')
     GROUP BY strftime('%Y-%m', s.sale_date)
     ORDER BY month`,
    [id],
  );

  const allTime = await row<{ total_sold: number; total_revenue: number; total_profit: number }>(
    `SELECT COALESCE(SUM(si.quantity), 0) total_sold,
            COALESCE(SUM(si.total_price), 0) total_revenue,
            COALESCE(SUM(si.total_price) - SUM(si.quantity * p.cost_price), 0) total_profit
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     JOIN products p ON p.id = si.product_id
     WHERE si.product_id = ? AND s.status = 'completed'`,
    [id],
  );

  const margin = product.cost_price > 0
    ? ((product.selling_price - product.cost_price) / product.cost_price) * 100
    : 0;

  return (
    <AppShell>
      <PageHeader title={product.name} eyebrow="Product performance">
        <a href="/reports?type=products" className={ghostButtonClass}>
          <ArrowLeft size={14} className="mr-1" />
          Back to reports
        </a>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="All-time units sold" value={allTime?.total_sold || 0} tone="primary" />
        <Stat label="All-time revenue" value={money(allTime?.total_revenue)} tone="success" />
        <Stat label="All-time profit" value={money(allTime?.total_profit)} tone="info" />
        <Stat label="Profit margin" value={percent(margin)} />
      </div>

      <Card className="mb-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">Monthly sales — last 12 months</h2>
          {product.sku && <span className="text-xs text-muted-foreground">SKU: {product.sku}</span>}
        </div>
        {monthlyData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No completed sales recorded for this product yet.</p>
        ) : (
          <ProductChart data={monthlyData} />
        )}
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-base font-semibold text-foreground">Pricing</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Cost price</dt>
              <dd className="font-medium">{money(product.cost_price)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Selling price</dt>
              <dd className="font-medium">{money(product.selling_price)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Gross profit per unit</dt>
              <dd className="font-semibold text-emerald-600">{money(product.selling_price - product.cost_price)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Margin</dt>
              <dd className="font-semibold">{percent(margin)}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-semibold text-foreground">Stock</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Current stock</dt>
              <dd className={`font-semibold ${product.stock_quantity <= product.min_stock_level ? "text-rose-600" : "text-foreground"}`}>
                {product.stock_quantity} units
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Minimum level</dt>
              <dd className="font-medium">{product.min_stock_level} units</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Stock value</dt>
              <dd className="font-medium">{money(product.stock_quantity * product.cost_price)}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </AppShell>
  );
}
