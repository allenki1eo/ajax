export type Product = {
  id: number;
  name: string;
  sku: string | null;
  category_name: string | null;
  supplier_name: string | null;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_level: number;
  status: "active" | "inactive";
  description: string | null;
  profit: number;
  profit_margin: number;
};

export type Category = {
  id: number;
  name: string;
  description: string | null;
};

export type Supplier = {
  id: number;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};
