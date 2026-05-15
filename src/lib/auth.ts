import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { row } from "@/lib/db";

const cookieName = "ajax_session";

type User = {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: "admin" | "manager" | "user";
};

function secret() {
  return process.env.APP_SESSION_SECRET || "development-session-secret";
}

function sign(value: string) {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

export async function createSession(userId: number) {
  const jar = await cookies();
  const value = `${userId}.${sign(String(userId))}`;
  jar.set(cookieName, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(cookieName);
}

export async function currentUser() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (!token) return null;

  const [rawId, signature] = token.split(".");
  if (!rawId || signature !== sign(rawId)) return null;

  return row<User>("SELECT id, username, email, full_name, role FROM users WHERE id = ?", [Number(rawId)]);
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function verifyPassword(password: string, stored: string) {
  if (stored.startsWith("$2")) return bcrypt.compare(password, stored);
  return crypto.createHash("md5").update(password).digest("hex") === stored;
}
