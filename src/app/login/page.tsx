import { redirect } from "next/navigation";
import { Boxes } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  if (await currentUser()) redirect("/");

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-md bg-primary text-primary-foreground">
            <Boxes size={20} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">StockManager</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to manage stock, sales, and purchasing.</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
