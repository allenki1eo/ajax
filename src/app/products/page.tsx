import { saveProduct } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { Card, EmptyState, Field, PageHeader, Pagination, StatusBadge, buttonClass, ghostButtonClass, inputClass } from "@/components/ui";
import { money, percent } from "@/lib/format";
import { row, rows } from "@/lib/db";
import type { Category, Product, Supplier } from "@/lib/types";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const search = params.search || "";
  const pageSize = 20;
  const page = Math.max(1, Number(params.page || 1));
  const offset = (page - 1) * pageSize;
  const total = await row<{ total: number }>(
    `SELECT COUNT(*) total
     FROM products p
     WHERE (? = '' OR p.name LIKE ? OR p.sku LIKE ?)`,
    [search, `%${search}%`, `%${search}%`],
  );
  const products = await rows<Product>(
    `SELECT p.*, c.name category_name, s.name supplier_name,
      (p.selling_price - p.cost_price) profit,
      CASE WHEN p.cost_price > 0 THEN ((p.selling_price - p.cost_price) / p.cost_price * 100) ELSE 0 END profit_margin
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN suppliers s ON s.id = p.supplier_id
     WHERE (? = '' OR p.name LIKE ? OR p.sku LIKE ?)
     ORDER BY p.status, p.name LIMIT ? OFFSET ?`,
    [search, `%${search}%`, `%${search}%`, pageSize, offset],
  );
  const categories = await rows<Category>("SELECT id, name, description FROM categories ORDER BY name");
  const suppliers = await rows<Supplier>("SELECT id, name, contact_person, phone, email, address FROM suppliers ORDER BY name");

  return (
    <AppShell>
      <PageHeader title="Products" eyebrow="Catalog" />
      <Card className="mb-6">
        <form action={saveProduct} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Name"><input className={inputClass} name="name" required /></Field>
          <Field label="SKU"><input className={inputClass} name="sku" /></Field>
          <Field label="Category">
            <select className={inputClass} name="category_id"><option value="">None</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </Field>
          <Field label="Supplier">
            <select className={inputClass} name="supplier_id"><option value="">None</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          </Field>
          <Field label="Cost price"><input className={inputClass} name="cost_price" type="number" step="0.01" min="0" required /></Field>
          <Field label="Selling price"><input className={inputClass} name="selling_price" type="number" step="0.01" min="0" required /></Field>
          <Field label="Stock"><input className={inputClass} name="stock_quantity" type="number" min="0" defaultValue="0" /></Field>
          <Field label="Minimum stock"><input className={inputClass} name="min_stock_level" type="number" min="0" defaultValue="0" /></Field>
          <input type="hidden" name="status" value="active" />
          <div className="md:col-span-2 xl:col-span-4">
            <Field label="Description"><textarea className={inputClass + " min-h-24 py-3"} name="description" /></Field>
          </div>
          <button className={buttonClass + " md:col-span-2 xl:col-span-4"}>Add product</button>
        </form>
      </Card>
      <Card>
        <form className="mb-4 flex flex-wrap gap-3" method="get">
          <input className={inputClass + " min-w-48 flex-1"} name="search" placeholder="Search by name or SKU" defaultValue={search} />
          <button className={buttonClass} type="submit">Search</button>
          {search && <a href="/products" className={ghostButtonClass}>Clear</a>}
        </form>
        {search && (
          <p className="mb-3 text-sm text-muted-foreground">
            {Number(total?.total || 0)} result{Number(total?.total || 0) !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
          </p>
        )}
        <div className="table-scroll">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="py-3">Product</th><th>Category</th><th>Stock</th><th>Cost</th><th>Sell</th><th>Margin</th><th>Status</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="py-3"><p className="font-bold text-foreground">{p.name}</p><p className="text-xs text-muted-foreground">{p.sku || "No SKU"}</p></td>
                  <td>{p.category_name || "Uncategorized"}</td>
                  <td><span className={p.stock_quantity <= p.min_stock_level ? "font-semibold text-destructive" : "font-medium text-foreground"}>{p.stock_quantity}</span><span className="text-muted-foreground"> / {p.min_stock_level}</span></td>
                  <td>{money(p.cost_price)}</td>
                  <td>{money(p.selling_price)}</td>
                  <td>{percent(p.profit_margin)}</td>
                  <td><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {products.length === 0 ? <EmptyState title="No products found" body="Add a product or change the search term to widen the catalog view." /> : null}
        <Pagination basePath="/products" page={page} pageSize={pageSize} total={Number(total?.total || 0)} params={{ search }} />
      </Card>
    </AppShell>
  );
}
