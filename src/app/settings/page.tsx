import { saveCategory, saveSupplier } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { Card, Field, PageHeader, buttonClass, inputClass } from "@/components/ui";
import { rows } from "@/lib/db";
import type { Category, Supplier } from "@/lib/types";

export default async function SettingsPage() {
  const categories = await rows<Category>("SELECT id, name, description FROM categories ORDER BY name");
  const suppliers = await rows<Supplier>("SELECT id, name, contact_person, phone, email, address FROM suppliers ORDER BY name");

  return (
    <AppShell>
      <PageHeader title="Settings" eyebrow="Reference data" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-base font-semibold text-foreground">Categories</h2>
          <form action={saveCategory} className="mb-5 grid gap-3 sm:grid-cols-[1fr_1.5fr_auto]">
            <Field label="Name"><input className={inputClass} name="name" required /></Field>
            <Field label="Description"><input className={inputClass} name="description" /></Field>
            <button className={buttonClass + " self-end"}>Add</button>
          </form>
          <div className="space-y-2">{categories.map((c) => <div key={c.id} className="rounded-md bg-muted/50 p-3"><p className="font-bold">{c.name}</p><p className="text-sm text-muted-foreground">{c.description || "No description"}</p></div>)}</div>
        </Card>
        <Card>
          <h2 className="mb-4 text-base font-semibold text-foreground">Suppliers</h2>
          <form action={saveSupplier} className="mb-5 grid gap-3 sm:grid-cols-2">
            <Field label="Name"><input className={inputClass} name="name" required /></Field>
            <Field label="Contact"><input className={inputClass} name="contact_person" /></Field>
            <Field label="Email"><input className={inputClass} name="email" type="email" /></Field>
            <Field label="Phone"><input className={inputClass} name="phone" /></Field>
            <div className="sm:col-span-2"><Field label="Address"><input className={inputClass} name="address" /></Field></div>
            <button className={buttonClass + " sm:col-span-2"}>Add supplier</button>
          </form>
          <div className="space-y-2">{suppliers.map((s) => <div key={s.id} className="rounded-md bg-muted/50 p-3"><p className="font-bold">{s.name}</p><p className="text-sm text-muted-foreground">{s.phone || "No phone"} {s.email ? `- ${s.email}` : ""}</p></div>)}</div>
        </Card>
      </div>
    </AppShell>
  );
}
