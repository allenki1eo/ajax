import { redirect } from "next/navigation";
import { Boxes } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  if (await currentUser()) redirect("/");

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-white bg-white/90 p-6 shadow-panel">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-md bg-ink text-white">
            <Boxes />
          </div>
          <h1 className="text-3xl font-black text-ink">Business Manager</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to manage stock, sales, and purchasing.</p>
        </div>
        <LoginForm />
        <p className="mt-6 rounded-md bg-slate-50 p-3 text-center text-sm text-slate-500">
          Demo login: <strong>admin</strong> / <strong>admin123</strong>
        </p>
      </section>
    </main>
  );
}
