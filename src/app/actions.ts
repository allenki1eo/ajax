"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSession, clearSession, requireUser, verifyPassword } from "@/lib/auth";
import { exec, getDb, row } from "@/lib/db";

function str(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function num(formData: FormData, key: string) {
  return Number(formData.get(key) || 0);
}

export async function loginAction(_: unknown, formData: FormData) {
  const username = str(formData, "username");
  const password = str(formData, "password");
  const user = await row<{ id: number; password: string }>(
    "SELECT id, password FROM users WHERE username = ? OR email = ? LIMIT 1",
    [username, username],
  );

  if (!user || !(await verifyPassword(password, user.password))) {
    return { error: "Invalid username or password." };
  }

  await createSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

export async function saveProduct(formData: FormData) {
  const user = await requireUser();
  const id = num(formData, "id");
  const payload = [
    str(formData, "name"),
    str(formData, "description"),
    str(formData, "sku") || null,
    num(formData, "category_id") || null,
    num(formData, "supplier_id") || null,
    num(formData, "cost_price"),
    num(formData, "selling_price"),
    num(formData, "stock_quantity"),
    num(formData, "min_stock_level"),
    str(formData, "status") || "active",
  ];

  if (id) {
    const existing = await row<{ stock_quantity: number }>("SELECT stock_quantity FROM products WHERE id = ?", [id]);
    await exec(
      `UPDATE products
       SET name = ?, description = ?, sku = ?, category_id = ?, supplier_id = ?, cost_price = ?,
           selling_price = ?, stock_quantity = ?, min_stock_level = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [...payload, id],
    );
    const diff = num(formData, "stock_quantity") - Number(existing?.stock_quantity || 0);
    if (diff !== 0) {
      await exec(
        "INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, notes, created_by) VALUES (?, ?, ?, 'adjustment', 'Stock adjustment', ?)",
        [id, diff > 0 ? "in" : "out", Math.abs(diff), user.id],
      );
    }
  } else {
    const result = await exec(
      `INSERT INTO products
        (name, description, sku, category_id, supplier_id, cost_price, selling_price, stock_quantity, min_stock_level, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      payload,
    );
    const productId = Number(result.lastInsertRowid);
    const initialStock = num(formData, "stock_quantity");
    if (initialStock > 0) {
      await exec(
        "INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, notes, created_by) VALUES (?, 'in', ?, 'adjustment', 'Initial stock', ?)",
        [productId, initialStock, user.id],
      );
    }
  }

  revalidatePath("/products");
  revalidatePath("/");
  redirect("/products");
}

export async function saveCategory(formData: FormData) {
  await requireUser();
  const id = num(formData, "id");
  if (id) {
    await exec("UPDATE categories SET name = ?, description = ? WHERE id = ?", [str(formData, "name"), str(formData, "description"), id]);
  } else {
    await exec("INSERT INTO categories (name, description) VALUES (?, ?)", [str(formData, "name"), str(formData, "description")]);
  }
  revalidatePath("/settings");
}

export async function saveSupplier(formData: FormData) {
  await requireUser();
  const id = num(formData, "id");
  const payload = [str(formData, "name"), str(formData, "contact_person"), str(formData, "email"), str(formData, "phone"), str(formData, "address")];
  if (id) {
    await exec("UPDATE suppliers SET name = ?, contact_person = ?, email = ?, phone = ?, address = ? WHERE id = ?", [...payload, id]);
  } else {
    await exec("INSERT INTO suppliers (name, contact_person, email, phone, address) VALUES (?, ?, ?, ?, ?)", payload);
  }
  revalidatePath("/settings");
}

export async function adjustStock(formData: FormData) {
  const user = await requireUser();
  const productId = num(formData, "product_id");
  const quantity = num(formData, "quantity");
  if (quantity < 1) throw new Error("Quantity must be at least 1.");
  const direction = str(formData, "movement_type") as "in" | "out";
  if (direction === "out") {
    const current = await row<{ stock_quantity: number }>("SELECT stock_quantity FROM products WHERE id = ?", [productId]);
    if ((current?.stock_quantity ?? 0) < quantity) {
      throw new Error(`Insufficient stock. Only ${current?.stock_quantity ?? 0} unit(s) available.`);
    }
  }
  const signed = direction === "out" ? -quantity : quantity;

  await getDb().batch(
    [
      { sql: "UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [signed, productId] },
      {
        sql: "INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, notes, created_by) VALUES (?, ?, ?, 'adjustment', ?, ?)",
        args: [productId, direction, quantity, str(formData, "notes"), user.id],
      },
    ],
    "write",
  );
  revalidatePath("/inventory");
  revalidatePath("/products");
}

export async function recordSale(formData: FormData) {
  const user = await requireUser();
  const productId = num(formData, "product_id");
  const quantity = num(formData, "quantity");
  if (quantity < 1) throw new Error("Quantity must be at least 1.");
  const product = await row<{ selling_price: number; stock_quantity: number }>(
    "SELECT selling_price, stock_quantity FROM products WHERE id = ?",
    [productId],
  );
  if (!product) throw new Error("Product not found.");
  if (product.stock_quantity < quantity) {
    throw new Error(`Insufficient stock. Only ${product.stock_quantity} unit(s) available.`);
  }
  const total = quantity * product.selling_price;

  const sale = await exec(
    "INSERT INTO sales (sale_date, customer_name, total_amount, payment_method, status, notes, created_by) VALUES (?, ?, ?, ?, 'completed', ?, ?)",
    [str(formData, "sale_date"), str(formData, "customer_name"), total, str(formData, "payment_method") || "cash", str(formData, "notes"), user.id],
  );
  const saleId = Number(sale.lastInsertRowid);
  await getDb().batch(
    [
      { sql: "INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)", args: [saleId, productId, quantity, product?.selling_price || 0, total] },
      { sql: "UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [quantity, productId] },
      { sql: "INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, created_by) VALUES (?, 'out', ?, 'sale', ?, ?)", args: [productId, quantity, saleId, user.id] },
    ],
    "write",
  );
  revalidatePath("/sales");
  revalidatePath("/");
}

export async function deleteProduct(formData: FormData) {
  await requireUser();
  const id = num(formData, "id");
  const hasRefs = await row<{ count: number }>(
    `SELECT (SELECT COUNT(*) FROM sale_items WHERE product_id = ?) + (SELECT COUNT(*) FROM purchase_items WHERE product_id = ?) count`,
    [id, id],
  );
  if (Number(hasRefs?.count || 0) > 0) {
    await exec("UPDATE products SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);
  } else {
    await exec("DELETE FROM products WHERE id = ?", [id]);
  }
  revalidatePath("/products");
  revalidatePath("/");
  redirect("/products");
}

export async function deleteSale(formData: FormData) {
  await requireUser();
  const id = num(formData, "id");
  await exec("DELETE FROM sales WHERE id = ?", [id]);
  revalidatePath("/sales");
  revalidatePath("/");
  redirect("/sales");
}

export async function deleteCategory(formData: FormData) {
  await requireUser();
  const id = num(formData, "id");
  await exec("DELETE FROM categories WHERE id = ?", [id]);
  revalidatePath("/settings");
  redirect("/settings");
}

export async function deleteSupplier(formData: FormData) {
  await requireUser();
  const id = num(formData, "id");
  await exec("DELETE FROM suppliers WHERE id = ?", [id]);
  revalidatePath("/settings");
  redirect("/settings");
}

export async function deletePurchase(formData: FormData) {
  await requireUser();
  const id = num(formData, "id");
  await exec("DELETE FROM purchases WHERE id = ?", [id]);
  revalidatePath("/purchases");
  revalidatePath("/inventory");
  redirect("/purchases");
}

export async function recordPurchase(formData: FormData) {
  const user = await requireUser();
  const productId = num(formData, "product_id");
  const quantity = num(formData, "quantity");
  const unitCost = num(formData, "unit_cost");
  const total = quantity * unitCost;
  const purchase = await exec(
    "INSERT INTO purchases (supplier_id, purchase_date, total_amount, status, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)",
    [num(formData, "supplier_id") || null, str(formData, "purchase_date"), total, str(formData, "status") || "received", str(formData, "notes"), user.id],
  );
  const purchaseId = Number(purchase.lastInsertRowid);
  await getDb().batch(
    [
      { sql: "INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_cost, total_cost) VALUES (?, ?, ?, ?, ?)", args: [purchaseId, productId, quantity, unitCost, total] },
      { sql: "UPDATE products SET stock_quantity = stock_quantity + ?, cost_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [quantity, unitCost, productId] },
      { sql: "INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, created_by) VALUES (?, 'in', ?, 'purchase', ?, ?)", args: [productId, quantity, purchaseId, user.id] },
    ],
    "write",
  );
  revalidatePath("/purchases");
  revalidatePath("/inventory");
}
