import { saveProduct, deleteProduct } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { Card, EmptyState, Field, PageHeader, Pagination, StatusBadge, buttonClass, deleteBtnClass, editBtnClass, ghostButtonClass, inputClass } from "@/components/ui";
import { FlashToast } from "@/components/flash-toast";
import { money, percent } from "@/lib/format";
import { row, rows } from "@/lib/db";
import type { Category, Product, Supplier } from "@/lib/types";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Suspense } from "react";

type ProductRow = {
  id: number;
  name: string;
  sku: string | null;
  category_id: number | null;
  supplier_id: number | null;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_level: number;
  status: string;
  description: string | null;
};

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const search = params.search || "";
  const categoryFilter = params.category || "";
  const statusFilter = params.status ?? "active";
  const pageSize = 20;
  const page = Math.max(1, Number(params.page || 1));
  const offset = (page - 1) * pageSize;
  const isEditing = !!params.edit;

  const editProduct = params.edit
    ? await row<ProductRow>("SELECT * FROM products WHERE id = ?", [params.edit])
    : null;

  const total = await row<{ total: number }>(
    `SELECT COUNT(*) total
     FROM products p
     WHERE (? = '' OR p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)
     AND (? = '' OR p.category_id = ?)
     AND (? = '' OR p.status = ?)`,
    [search, `%${search}%`, `%${search}%`, `%${search}%`, categoryFilter, categoryFilter, statusFilter, statusFilter],
  );
  const products = await rows<Product>(
    `SELECT p.*, c.name category_name, s.name supplier_name,
      (p.selling_price - p.cost_price) profit,
      CASE WHEN p.cost_price > 0 THEN ((p.selling_price - p.cost_price) / p.cost_price * 100) ELSE 0 END profit_margin
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN suppliers s ON s.id = p.supplier_id
     WHERE (? = '' OR p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)
     AND (? = '' OR p.category_id = ?)
     AND (? = '' OR p.status = ?)
     ORDER BY p.status, p.name LIMIT ? OFFSET ?`,
    [search, `%${search}%`, `%${search}%`, `%${search}%`, categoryFilter, categoryFilter, statusFilter, statusFilter, pageSize, offset],
  );
  const categories = await rows<Category>("SELECT id, name, description FROM categories ORDER BY name");
  const suppliers = await rows<Supplier>("SELECT id, name, contact_person, phone, email, address FROM suppliers ORDER BY name");

  return (
    <AppShell>
      <Suspense><FlashToast /></Suspense>
      <PageHeader title="Products" eyebrow="Catalog" />

      <Card className="mb-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          {isEditing ? <><Pencil size={15} className="text-primary" /> Edit Product</> : <><Plus size={15} className="text-primary" /> Add Product</>}
        </h2>
        <script dangerouslySetInnerHTML={{ __html: `
          function calcMargin() {
            var cost = parseFloat(document.getElementById('cost_price_input')?.value) || 0;
            var sell = parseFloat(document.getElementById('selling_price_input')?.value) || 0;
            var el = document.getElementById('margin-display');
            if (!el) return;
            if (cost > 0) {
              var m = (sell - cost) / cost * 100;
              el.textContent = m.toFixed(1) + '%';
              el.style.color = m < 0 ? 'hsl(var(--destructive))' : m < 20 ? '#d97706' : '#059669';
            } else { el.textContent = '—'; el.style.color = ''; }
          }
          document.addEventListener('input', function(e) {
            if (e.target.id === 'cost_price_input' || e.target.id === 'selling_price_input') calcMargin();
          });
          document.addEventListener('DOMContentLoaded', calcMargin);
        ` }} />
        <form action={saveProduct} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {editProduct && <input type="hidden" name="id" value={editProduct.id} />}
          <Field label="Name">
            <input className={inputClass} name="name" required defaultValue={editProduct?.name || ""} placeholder="Product name" />
          </Field>
          <Field label="SKU">
            <input className={inputClass} name="sku" defaultValue={editProduct?.sku || ""} placeholder="Optional code" />
          </Field>
          <Field label="Category">
            <select className={inputClass} name="category_id" defaultValue={editProduct?.category_id ?? ""}>
              <option value="">None</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Supplier">
            <select className={inputClass} name="supplier_id" defaultValue={editProduct?.supplier_id ?? ""}>
              <option value="">None</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Cost price">
            <input className={inputClass} id="cost_price_input" name="cost_price" type="number" step="0.01" min="0" required defaultValue={editProduct?.cost_price ?? ""} placeholder="0.00" />
          </Field>
          <Field label="Selling price">
            <input className={inputClass} id="selling_price_input" name="selling_price" type="number" step="0.01" min="0" required defaultValue={editProduct?.selling_price ?? ""} placeholder="0.00" />
          </Field>
          <Field label="Profit margin">
            <div id="margin-display" className={inputClass + " flex items-center bg-muted/30 font-semibold text-muted-foreground"}>—</div>
          </Field>
          <Field label="Stock quantity">
            <input className={inputClass} name="stock_quantity" type="number" min="0" defaultValue={editProduct?.stock_quantity ?? 0} />
          </Field>
          <Field label="Minimum stock">
            <input className={inputClass} name="min_stock_level" type="number" min="0" defaultValue={editProduct?.min_stock_level ?? 0} />
          </Field>
          {isEditing && (
            <Field label="Status">
              <select className={inputClass} name="status" defaultValue={editProduct?.status || "active"}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          )}
          {!isEditing && <input type="hidden" name="status" value="active" />}
          <div className={isEditing ? "md:col-span-2 xl:col-span-3" : "md:col-span-2 xl:col-span-4"}>
            <Field label="Description">
              <textarea className={inputClass + " min-h-20 py-2"} name="description" defaultValue={editProduct?.description || ""} />
            </Field>
          </div>
          <div className="flex gap-2 items-end md:col-span-2 xl:col-span-4">
            <button className={buttonClass + " flex-1"}>
              {isEditing ? "Update product" : "Add product"}
            </button>
            {isEditing && (
              <a href="/products" className={ghostButtonClass}>Cancel</a>
            )}
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <form className="flex flex-wrap gap-3 flex-1" method="get">
            <input
              className={inputClass + " min-w-44 flex-1"}
              name="search"
              placeholder="Search name, SKU or description…"
              defaultValue={search}
            />
            <select className={inputClass + " w-44"} name="category" defaultValue={categoryFilter}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className={inputClass + " w-36"} name="status" defaultValue={statusFilter}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button className={buttonClass} type="submit">Filter</button>
            {(search || categoryFilter || statusFilter) && (
              <a href="/products" className={ghostButtonClass}>Clear</a>
            )}
          </form>
        </div>

        {(search || categoryFilter || statusFilter) && (
          <p className="mb-3 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{Number(total?.total || 0)}</span> product{Number(total?.total || 0) !== 1 ? "s" : ""} found
          </p>
        )}

        <div className="table-scroll">
          <table className="w-full min-w-[1020px] text-left text-sm">
            <thead className="border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-3 pr-4">Product</th>
                <th className="pr-4">Category</th>
                <th className="pr-4">Stock / Min</th>
                <th className="pr-4">Cost</th>
                <th className="pr-4">Sell</th>
                <th className="pr-4">Margin</th>
                <th className="pr-4">Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => (
                <tr key={p.id} className={p.id === editProduct?.id ? "bg-primary/5" : ""}>
                  <td className="py-3 pr-4">
                    <p className="font-semibold text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.sku || "No SKU"}</p>
                    {p.description && (
                      <p className="mt-0.5 max-w-[180px] truncate text-xs text-muted-foreground/70">
                        {p.description.length > 50 ? p.description.slice(0, 50) + "…" : p.description}
                      </p>
                    )}
                  </td>
                  <td className="pr-4 text-muted-foreground">{p.category_name || "—"}</td>
                  <td className="pr-4">
                    <span className={p.stock_quantity <= p.min_stock_level ? "font-semibold text-rose-600" : "font-medium text-foreground"}>
                      {p.stock_quantity}
                    </span>
                    <span className="text-muted-foreground"> / {p.min_stock_level}</span>
                  </td>
                  <td className="pr-4 text-muted-foreground">{money(p.cost_price)}</td>
                  <td className="pr-4 font-medium">{money(p.selling_price)}</td>
                  <td className="pr-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      Number(p.profit_margin) < 0
                        ? "bg-red-100 text-red-800"
                        : Number(p.profit_margin) < 20
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {percent(p.profit_margin)}
                    </span>
                  </td>
                  <td className="pr-4"><StatusBadge status={p.status} /></td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <a href={`/products?edit=${p.id}`} className={editBtnClass}>
                        <Pencil size={11} />
                        Edit
                      </a>
                      <form action={deleteProduct} data-confirm={`Delete "${p.name}"? If it has sales history it will be deactivated instead.`}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className={deleteBtnClass}>
                          <Trash2 size={11} />
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {products.length === 0 && (
          <EmptyState title="No products found" body="Add a product above or clear the filters to see all products." />
        )}
        <Pagination
          basePath="/products"
          page={page}
          pageSize={pageSize}
          total={Number(total?.total || 0)}
          params={{ search, category: categoryFilter, status: statusFilter }}
        />
      </Card>
    </AppShell>
  );
}
