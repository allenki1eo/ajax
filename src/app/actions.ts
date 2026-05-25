"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSession, clearSession, requireUser, verifyPassword } from "@/lib/auth";
import { exec, getDb, row, rows } from "@/lib/db";

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
  const msg = id ? "Product+updated" : "Product+added";
  redirect(`/products?success=${msg}`);
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
  redirect("/settings?success=Category+saved");
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
  redirect("/settings?success=Supplier+saved");
}

export async function adjustStock(_: unknown, formData: FormData): Promise<{ error: string } | void> {
  const user = await requireUser();
  const productId = num(formData, "product_id");
  const quantity = num(formData, "quantity");
  if (quantity < 1) return { error: "Quantity must be at least 1." };
  const direction = str(formData, "movement_type") as "in" | "out";
  if (direction === "out") {
    const current = await row<{ stock_quantity: number }>("SELECT stock_quantity FROM products WHERE id = ?", [productId]);
    if ((current?.stock_quantity ?? 0) < quantity) {
      return { error: `Insufficient stock. Only ${current?.stock_quantity ?? 0} unit(s) available.` };
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

export async function recordSale(_: unknown, formData: FormData): Promise<{ error: string } | null> {
  const user = await requireUser();

  const productIds = formData.getAll("product_id").map(Number);
  const quantities = formData.getAll("quantity").map(Number);
  const unitPrices = formData.getAll("unit_price").map(Number);

  if (productIds.length === 0) return { error: "Cart is empty." };
  if (quantities.some((q) => q < 1)) return { error: "All quantities must be at least 1." };

  // Fetch all products in one query
  const placeholders = productIds.map(() => "?").join(", ");
  const products = await rows<{ id: number; selling_price: number; stock_quantity: number }>(
    `SELECT id, selling_price, stock_quantity FROM products WHERE id IN (${placeholders})`,
    productIds,
  );
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Validate stock for all items before any write
  for (let i = 0; i < productIds.length; i++) {
    const product = productMap.get(productIds[i]);
    if (!product) return { error: `Product not found (ID ${productIds[i]}).` };
    if (product.stock_quantity < quantities[i]) {
      return { error: `Insufficient stock for "${productIds[i]}". Only ${product.stock_quantity} available.` };
    }
  }

  const lineItems = productIds.map((pid, i) => ({
    productId: pid,
    quantity: quantities[i],
    // Use submitted price if provided, otherwise fall back to DB selling price
    unitPrice: unitPrices[i] > 0 ? unitPrices[i] : (productMap.get(pid)?.selling_price ?? 0),
    lineTotal: quantities[i] * (unitPrices[i] > 0 ? unitPrices[i] : (productMap.get(pid)?.selling_price ?? 0)),
  }));

  const grandTotal = lineItems.reduce((sum, li) => sum + li.lineTotal, 0);

  const sale = await exec(
    "INSERT INTO sales (sale_date, customer_name, customer_phone, total_amount, payment_method, status, notes, created_by) VALUES (?, ?, ?, ?, ?, 'completed', ?, ?)",
    [
      str(formData, "sale_date"),
      str(formData, "customer_name") || null,
      str(formData, "customer_phone") || null,
      grandTotal,
      str(formData, "payment_method") || "cash",
      str(formData, "notes") || null,
      user.id,
    ],
  );
  const saleId = Number(sale.lastInsertRowid);

  const batchStatements = lineItems.flatMap((li) => [
    {
      sql: "INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)",
      args: [saleId, li.productId, li.quantity, li.unitPrice, li.lineTotal],
    },
    {
      sql: "UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [li.quantity, li.productId],
    },
    {
      sql: "INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, created_by) VALUES (?, 'out', ?, 'sale', ?, ?)",
      args: [li.productId, li.quantity, saleId, user.id],
    },
  ]);

  await getDb().batch(batchStatements, "write");
  revalidatePath("/sales");
  revalidatePath("/");
  return null;
}

export async function cancelSale(formData: FormData) {
  const user = await requireUser();
  const id = num(formData, "id");

  // Get sale items to restore stock
  const saleItems = await rows<{ product_id: number; quantity: number }>(
    "SELECT product_id, quantity FROM sale_items WHERE sale_id = ?",
    [id],
  );

  const batchStatements = [
    // Mark as cancelled
    { sql: "UPDATE sales SET status = 'cancelled' WHERE id = ?", args: [id] },
    // Restore stock and record return movements for each item
    ...saleItems.flatMap((item) => [
      {
        sql: "UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        args: [item.quantity, item.product_id],
      },
      {
        sql: "INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, notes, created_by) VALUES (?, 'in', ?, 'return', ?, 'Sale cancellation', ?)",
        args: [item.product_id, item.quantity, id, user.id],
      },
    ]),
  ];

  await getDb().batch(batchStatements, "write");
  revalidatePath("/sales");
  revalidatePath("/");
  revalidatePath("/inventory");
  revalidatePath("/products");
  redirect("/sales?success=Sale+cancelled+and+stock+restored");
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
  redirect("/purchases?success=Purchase+recorded");
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
  redirect("/products?success=Product+removed");
}

export async function deleteCategory(formData: FormData) {
  await requireUser();
  const id = num(formData, "id");
  await exec("DELETE FROM categories WHERE id = ?", [id]);
  revalidatePath("/settings");
  redirect("/settings?success=Category+deleted");
}

export async function deleteSupplier(formData: FormData) {
  await requireUser();
  const id = num(formData, "id");
  await exec("DELETE FROM suppliers WHERE id = ?", [id]);
  revalidatePath("/settings");
  redirect("/settings?success=Supplier+deleted");
}

export async function deletePurchase(formData: FormData) {
  await requireUser();
  const id = num(formData, "id");
  await exec("DELETE FROM purchases WHERE id = ?", [id]);
  revalidatePath("/purchases");
  revalidatePath("/inventory");
  redirect("/purchases?success=Purchase+deleted");
}
