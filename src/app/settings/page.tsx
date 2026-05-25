import { saveCategory, saveSupplier, deleteCategory, deleteSupplier } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { Card, Field, PageHeader, buttonClass, deleteBtnClass, editBtnClass, ghostButtonClass, inputClass } from "@/components/ui";
import { FlashToast } from "@/components/flash-toast";
import { rows, row } from "@/lib/db";
import type { Category, Supplier } from "@/lib/types";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Suspense } from "react";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const editCatId = params.editCat ? Number(params.editCat) : null;
  const editSupId = params.editSup ? Number(params.editSup) : null;

  const categories = await rows<Category>("SELECT id, name, description FROM categories ORDER BY name");
  const suppliers = await rows<Supplier>("SELECT id, name, contact_person, phone, email, address FROM suppliers ORDER BY name");

  const editCat = editCatId ? categories.find((c) => c.id === editCatId) ?? null : null;
  const editSup = editSupId ? suppliers.find((s) => s.id === editSupId) ?? null : null;

  return (
    <AppShell>
      <Suspense><FlashToast /></Suspense>
      <PageHeader title="Settings" eyebrow="Reference data" />
      <div className="grid gap-6 xl:grid-cols-2">

        {/* Categories */}
        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
            {editCat ? <><Pencil size={14} className="text-primary" /> Edit Category</> : <><Plus size={14} className="text-primary" /> Add Category</>}
          </h2>
          <form action={saveCategory} className="mb-6 grid gap-3 sm:grid-cols-[1fr_1.5fr_auto]">
            {editCat && <input type="hidden" name="id" value={editCat.id} />}
            <Field label="Name">
              <input className={inputClass} name="name" required defaultValue={editCat?.name || ""} placeholder="Category name" />
            </Field>
            <Field label="Description">
              <input className={inputClass} name="description" defaultValue={editCat?.description || ""} placeholder="Optional description" />
            </Field>
            <div className="flex gap-2 self-end">
              <button className={buttonClass}>{editCat ? "Update" : "Add"}</button>
              {editCat && <a href="/settings" className={ghostButtonClass}>Cancel</a>}
            </div>
          </form>

          <div className="space-y-2">
            {categories.map((c) => (
              <div
                key={c.id}
                className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${c.id === editCatId ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30 hover:bg-muted/60"}`}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{c.name}</p>
                  {c.description && <p className="text-xs text-muted-foreground truncate">{c.description}</p>}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <a href={`/settings?editCat=${c.id}`} className={editBtnClass}>
                    <Pencil size={11} /> Edit
                  </a>
                  <form action={deleteCategory} data-confirm={`Delete category "${c.name}"? Products in this category will become uncategorized.`}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className={deleteBtnClass}>
                      <Trash2 size={11} /> Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="rounded-lg border border-dashed bg-muted/30 py-6 text-center text-sm text-muted-foreground">No categories yet</p>
            )}
          </div>
        </Card>

        {/* Suppliers */}
        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
            {editSup ? <><Pencil size={14} className="text-primary" /> Edit Supplier</> : <><Plus size={14} className="text-primary" /> Add Supplier</>}
          </h2>
          <form action={saveSupplier} className="mb-6 grid gap-3 sm:grid-cols-2">
            {editSup && <input type="hidden" name="id" value={editSup.id} />}
            <Field label="Name">
              <input className={inputClass} name="name" required defaultValue={editSup?.name || ""} placeholder="Supplier name" />
            </Field>
            <Field label="Contact person">
              <input className={inputClass} name="contact_person" defaultValue={editSup?.contact_person || ""} placeholder="Full name" />
            </Field>
            <Field label="Email">
              <input className={inputClass} name="email" type="email" defaultValue={editSup?.email || ""} placeholder="email@example.com" />
            </Field>
            <Field label="Phone">
              <input className={inputClass} name="phone" defaultValue={editSup?.phone || ""} placeholder="+1 234 567 8900" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Address">
                <input className={inputClass} name="address" defaultValue={editSup?.address || ""} placeholder="Street, City, Country" />
              </Field>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <button className={buttonClass + " flex-1"}>{editSup ? "Update supplier" : "Add supplier"}</button>
              {editSup && <a href="/settings" className={ghostButtonClass}>Cancel</a>}
            </div>
          </form>

          <div className="space-y-2">
            {suppliers.map((s) => (
              <div
                key={s.id}
                className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${s.id === editSupId ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30 hover:bg-muted/60"}`}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[s.contact_person, s.phone, s.email].filter(Boolean).join(" · ") || "No contact info"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <a href={`/settings?editSup=${s.id}`} className={editBtnClass}>
                    <Pencil size={11} /> Edit
                  </a>
                  <form action={deleteSupplier} data-confirm={`Delete supplier "${s.name}"? Their products will remain but lose the supplier link.`}>
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className={deleteBtnClass}>
                      <Trash2 size={11} /> Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
            {suppliers.length === 0 && (
              <p className="rounded-lg border border-dashed bg-muted/30 py-6 text-center text-sm text-muted-foreground">No suppliers yet</p>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
