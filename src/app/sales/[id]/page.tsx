import { AppShell } from "@/components/app-shell";
import { Card, PageHeader, StatusBadge, ghostButtonClass } from "@/components/ui";
import { money, dateLabel } from "@/lib/format";
import { row, rows } from "@/lib/db";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const sale = await row<{
    id: number;
    sale_date: string;
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
    total_amount: number;
    payment_method: string;
    status: string;
    notes: string | null;
    created_at: string;
  }>(
    `SELECT id, sale_date, customer_name, customer_email, customer_phone,
            total_amount, payment_method, status, notes, created_at
     FROM sales WHERE id = ?`,
    [id],
  );

  if (!sale) notFound();

  const items = await rows<{
    product_name: string;
    sku: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>(
    `SELECT p.name product_name, p.sku, si.quantity, si.unit_price, si.total_price
     FROM sale_items si JOIN products p ON p.id = si.product_id
     WHERE si.sale_id = ? ORDER BY p.name`,
    [id],
  );

  return (
    <AppShell>
      <PageHeader title={`Sale #${String(sale.id).padStart(4, "0")}`} eyebrow="Sale detail">
        <a href="/sales" className={ghostButtonClass}>
          <ArrowLeft size={14} className="mr-1" />
          Back to sales
        </a>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-base font-semibold text-foreground">Sale information</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Date</dt>
              <dd className="font-medium">{sale.sale_date}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Status</dt>
              <dd><StatusBadge status={sale.status} /></dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Payment method</dt>
              <dd className="font-medium capitalize">{sale.payment_method.replace(/_/g, " ")}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Total amount</dt>
              <dd className="text-lg font-bold text-foreground">{money(sale.total_amount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Recorded at</dt>
              <dd className="font-medium">{dateLabel(sale.created_at)}</dd>
            </div>
            {sale.notes && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Notes</dt>
                <dd className="text-right font-medium">{sale.notes}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-semibold text-foreground">Customer information</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{sale.customer_name || "Walk-in Customer"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{sale.customer_email || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium">{sale.customer_phone || "—"}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">Items</h2>
        <div className="table-scroll">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-3 pr-4">Product</th>
                <th className="pr-4">SKU</th>
                <th className="pr-4">Qty</th>
                <th className="pr-4">Unit price</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item, i) => (
                <tr key={i}>
                  <td className="py-3 pr-4 font-medium text-foreground">{item.product_name}</td>
                  <td className="pr-4 text-muted-foreground">{item.sku || "—"}</td>
                  <td className="pr-4">{item.quantity}</td>
                  <td className="pr-4 text-muted-foreground">{money(item.unit_price)}</td>
                  <td className="text-right font-semibold">{money(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2">
                <td colSpan={4} className="py-3 pr-4 text-right text-sm font-semibold text-foreground">Grand total</td>
                <td className="text-right text-lg font-bold text-foreground">{money(sale.total_amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
