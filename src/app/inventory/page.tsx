import { AppShell } from "@/components/app-shell";
import { Card, EmptyState, PageHeader, Pagination } from "@/components/ui";
import { FlashToast } from "@/components/flash-toast";
import { StockAdjustForm } from "@/components/stock-adjust-form";
import { dateLabel } from "@/lib/format";
import { row, rows } from "@/lib/db";
import { Suspense } from "react";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const pageSize = 30;
  const page = Math.max(1, Number(params.page || 1));
  const offset = (page - 1) * pageSize;
  const products = await rows<{ id: number; name: string; sku: string | null; stock_quantity: number; min_stock_level: number }>(
    "SELECT id, name, sku, stock_quantity, min_stock_level FROM products WHERE status = 'active' ORDER BY stock_quantity <= min_stock_level DESC, name",
  );
  const total = await row<{ total: number }>("SELECT COUNT(*) total FROM stock_movements");
  const movements = await rows<{ id: number; product_name: string; movement_type: string; quantity: number; reference_type: string; notes: string | null; created_at: string }>(
    `SELECT sm.*, p.name product_name FROM stock_movements sm JOIN products p ON p.id = sm.product_id ORDER BY sm.created_at DESC LIMIT ? OFFSET ?`,
    [pageSize, offset],
  );

  return (
    <AppShell>
      <Suspense><FlashToast /></Suspense>
      <PageHeader title="Inventory" eyebrow="Stock control" />
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <h2 className="mb-4 text-base font-semibold text-foreground">Adjust stock</h2>
          <StockAdjustForm products={products} />
        </Card>
        <Card>
          <h2 className="mb-4 text-base font-semibold text-foreground">Stock positions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {products.slice(0, 12).map((p) => (
              <div key={p.id} className="rounded-md bg-muted p-3">
                <p className="font-bold text-foreground">{p.name}</p>
                <p className="text-sm text-muted-foreground">{p.sku || "No SKU"}</p>
                <p className={p.stock_quantity <= p.min_stock_level ? "mt-2 font-semibold text-destructive" : "mt-2 font-semibold text-foreground"}>{p.stock_quantity} in stock</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="mt-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">Recent movements</h2>
        <div className="table-scroll">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr><th className="py-3 pr-4">Date</th><th className="pr-4">Product</th><th className="pr-4">Type</th><th className="pr-4">Qty</th><th className="pr-4">Reference</th><th>Notes</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movements.map((m) => (
                <tr key={m.id}>
                  <td className="py-3 pr-4 text-muted-foreground">{dateLabel(m.created_at)}</td>
                  <td className="pr-4 font-medium">{m.product_name}</td>
                  <td className={`pr-4 font-semibold capitalize ${m.movement_type === "in" ? "text-emerald-600" : "text-rose-600"}`}>{m.movement_type}</td>
                  <td className="pr-4 font-bold">{m.quantity}</td>
                  <td className="pr-4 capitalize text-muted-foreground">{m.reference_type}</td>
                  <td className="text-muted-foreground">{m.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {movements.length === 0 && <EmptyState title="No movements yet" body="Stock adjustments, sales, and purchases will appear here as an audit trail." />}
        <Pagination basePath="/inventory" page={page} pageSize={pageSize} total={Number(total?.total || 0)} />
      </Card>
    </AppShell>
  );
}
