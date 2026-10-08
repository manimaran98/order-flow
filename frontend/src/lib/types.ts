export type Role = 'ADMIN' | 'STAFF';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PACKING' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';
/** Money as the API sends it: a decimal string such as "12.50". */
export type Money = string;

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: Money;
  paidAmount: Money;
  createdAt: string;
}

export interface CustomerDetail extends Customer {
  orders: OrderSummary[];
}

export interface OrderListItem extends OrderSummary {
  subtotal: Money;
  discount: Money;
  outstandingAmount: Money;
  notes: string | null;
  customer: { id: string; name: string };
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: Money;
  subtotal: Money;
  product: { id: string; name: string; sku: string };
}

export interface Payment {
  id: string;
  orderId: string;
  amount: Money;
  method: PaymentMethod;
  reference: string | null;
  paidAt: string;
  createdAt: string;
}

export interface OrderDetail extends OrderSummary {
  subtotal: Money;
  discount: Money;
  outstandingAmount: Money;
  notes: string | null;
  customer: { id: string; name: string; phone: string | null };
  items: OrderItem[];
  payments: Payment[];
  confirmedAt: string | null;
  cancelledAt: string | null;
  deliveredAt: string | null;
}

export interface OrderInput {
  customerId: string;
  items: { productId: string; quantity: number }[];
  discount: number;
  notes: string | null;
}

export interface StockWarning {
  productId: string;
  sku: string;
  requested: number;
  available: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  sellingPrice: Money;
  costPrice: Money;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A product as the public catalog shows it: no cost, SKU or stock count. */
export interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  sellingPrice: Money;
  inStock: boolean;
}

export interface StockRow {
  id: string;
  name: string;
  sku: string;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  isLow?: boolean;
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  type: 'SALE' | 'RESTOCK' | 'ADJUSTMENT' | 'RETURN';
  quantity: number;
  referenceType: 'ORDER' | 'MANUAL';
  referenceId: string | null;
  note: string | null;
  createdAt: string;
}

export interface Ledger {
  product: StockRow;
  transactions: Paginated<InventoryTransaction>;
}

export interface DashboardSummary {
  todayOrders: number;
  todaySales: Money;
  unpaidOrders: number;
  outstandingAmount: Money;
  pendingOrders: number;
  awaitingFulfilment: number;
  lowStockProducts: number;
  completedOrders: number;
}
