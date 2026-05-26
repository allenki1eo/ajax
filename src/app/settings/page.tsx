import { saveCategory, saveSupplier, deleteCategory, deleteSupplier, saveUser, deleteUser } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { Card, Field, PageHeader, buttonClass, deleteBtnClass, editBtnClass, ghostButtonClass, inputClass } from "@/components/ui";
import { FlashToast } from "@/components/flash-toast";
import { ChangePasswordForm } from "@/components/change-password-form";
import { rows, row } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import type { Category, Supplier } from "@/lib/types";
import { KeyRound, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Suspense } from "react";

type UserRow = {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: "admin" | "manager" | "user";
};

const roleBadge: Record<string, string> = {
  admin: "bg-red-100 text-red-800",
  manager: "bg-amber-100 text-amber-800",
  user: "bg-muted text-muted-foreground",
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const currentUser = await requireUser();
  const editCatId = params.editCat ? Number(params.editCat) : null;
  const editSupId = params.editSup ? Number(params.editSup) : null;
  const editUserId = params.editUser ? Number(params.editUser) : null;

  const categories = await rows<Category>("SELECT id, name, description FROM categories ORDER BY name");
  const suppliers = await rows<Supplier>("SELECT id, name, contact_person, phone, email, address FROM suppliers ORDER BY name");
  const users = await rows<UserRow>("SELECT id, username, email, full_name, role FROM users ORDER BY full_name");

  const editCat = editCatId ? categories.find((c) => c.id === editCatId) ?? null : null;
  const editSup = editSupId ? suppliers.find((s) => s.id === editSupId) ?? null : null;
  const editUser = editUserId ? users.find((u) => u.id === editUserId) ?? null : null;

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

      {/* Users — admin only */}
      {currentUser.role === "admin" && (
        <Card className="mt-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
            <Users size={15} className="text-primary" />
            {editUser ? "Edit User" : "User Management"}
          </h2>

          {/* Add / Edit form */}
          <form action={saveUser} className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {editUser && <input type="hidden" name="id" value={editUser.id} />}
            <Field label="Full name">
              <input className={inputClass} name="full_name" required defaultValue={editUser?.full_name || ""} placeholder="Jane Smith" />
            </Field>
            <Field label="Username">
              <input className={inputClass} name="username" required defaultValue={editUser?.username || ""} placeholder="jsmith" />
            </Field>
            <Field label="Email">
              <input className={inputClass} name="email" type="email" required defaultValue={editUser?.email || ""} placeholder="jane@example.com" />
            </Field>
            <Field label="Role">
              <select className={inputClass} name="role" defaultValue={editUser?.role || "user"}>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="user">User</option>
              </select>
            </Field>
            <div className="sm:col-span-2 xl:col-span-3">
              <Field label={editUser ? "New password (leave blank to keep current)" : "Password"}>
                <input
                  className={inputClass}
                  name="password"
                  type="password"
                  required={!editUser}
                  minLength={6}
                  autoComplete="new-password"
                  placeholder={editUser ? "Leave blank to keep current" : "Min 6 characters"}
                />
              </Field>
            </div>
            <div className="flex items-end gap-2">
              <button className={buttonClass + " flex-1"}>{editUser ? "Update user" : "Add user"}</button>
              {editUser && <a href="/settings" className={ghostButtonClass}>Cancel</a>}
            </div>
          </form>

          {/* Users list */}
          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u.id}
                className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${u.id === editUserId ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30 hover:bg-muted/60"}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {initials(u.full_name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{u.full_name}</p>
                      {u.id === currentUser.id && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">You</span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${roleBadge[u.role] || roleBadge.user}`}>
                        {u.role}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">@{u.username} · {u.email}</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <a href={`/settings?editUser=${u.id}`} className={editBtnClass}>
                    <Pencil size={11} /> Edit
                  </a>
                  {u.id !== currentUser.id && (
                    <form action={deleteUser} data-confirm={`Delete user "${u.full_name}"? This cannot be undone.`}>
                      <input type="hidden" name="id" value={u.id} />
                      <button type="submit" className={deleteBtnClass}>
                        <Trash2 size={11} /> Delete
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Change Password */}
      <Card className="mt-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <KeyRound size={15} className="text-primary" />
          Change Password
        </h2>
        <ChangePasswordForm />
      </Card>
    </AppShell>
  );
}
