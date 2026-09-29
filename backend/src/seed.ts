import './common/money.js';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { AuthService } from './auth/auth.service.js';
import { CustomersService } from './customers/customers.service.js';
import { OrdersService } from './orders/orders.service.js';
import { PaymentsService } from './payments/payments.service.js';
import { PrismaService } from './prisma/prisma.service.js';
import { ProductsService } from './products/products.service.js';
import { UsersService } from './users/users.service.js';

// Dev-only demo data, created through the services so every business rule and ledger row applies.
const PRODUCTS = [
  { name: '100Plus Original 24 x 325ml', sku: '100PLUS-24', sellingPrice: 38.9, costPrice: 31.5, stockQuantity: 40, lowStockThreshold: 10 },
  { name: 'Coca-Cola 24 x 320ml', sku: 'COKE-24', sellingPrice: 36.5, costPrice: 29.8, stockQuantity: 35, lowStockThreshold: 10 },
  { name: 'Milo 3in1 Activ-Go 18 x 33g', sku: 'MILO-18', sellingPrice: 17.9, costPrice: 14.2, stockQuantity: 6, lowStockThreshold: 8 },
  { name: 'Maggi Kari 5 x 79g', sku: 'MAGGI-KARI-5', sellingPrice: 6.8, costPrice: 5.1, stockQuantity: 120, lowStockThreshold: 30 },
  { name: 'Gardenia Original Classic 600g', sku: 'GARDENIA-600', sellingPrice: 4.3, costPrice: 3.4, stockQuantity: 25, lowStockThreshold: 10 },
  { name: 'Beras Wangi Jasmine 10kg', sku: 'BERAS-JAS-10', sellingPrice: 34.9, costPrice: 29.0, stockQuantity: 18, lowStockThreshold: 5 },
  { name: 'Minyak Masak Buruh 5kg', sku: 'BURUH-5KG', sellingPrice: 32.5, costPrice: 27.9, stockQuantity: 4, lowStockThreshold: 6 },
  { name: 'Gula Prai 1kg', sku: 'GULA-PRAI-1', sellingPrice: 3.1, costPrice: 2.7, stockQuantity: 80, lowStockThreshold: 20 },
  { name: 'Teh Boh 100 uncang', sku: 'BOH-100', sellingPrice: 12.9, costPrice: 10.2, stockQuantity: 30, lowStockThreshold: 10 },
  { name: 'Nescafe Classic 200g', sku: 'NESCAFE-200', sellingPrice: 24.9, costPrice: 20.5, stockQuantity: 12, lowStockThreshold: 5 },
  { name: 'Dutch Lady UHT Full Cream 12 x 1L', sku: 'DL-UHT-12', sellingPrice: 79.0, costPrice: 68.0, stockQuantity: 9, lowStockThreshold: 4 },
  { name: 'Spritzer Mineral Water 12 x 1.5L', sku: 'SPRITZER-12', sellingPrice: 16.5, costPrice: 12.9, stockQuantity: 50, lowStockThreshold: 15 },
  { name: 'Tepung Gandum Cap Sauh 1kg', sku: 'TEPUNG-SAUH-1', sellingPrice: 2.9, costPrice: 2.3, stockQuantity: 2, lowStockThreshold: 10 },
  { name: 'Kicap Manis Kipas Udang 345ml', sku: 'KICAP-KIPAS', sellingPrice: 4.6, costPrice: 3.6, stockQuantity: 40, lowStockThreshold: 10 },
  { name: 'Sardin Ayam Brand 425g', sku: 'SARDIN-AB-425', sellingPrice: 9.9, costPrice: 7.9, stockQuantity: 60, lowStockThreshold: 15 },
];

const CUSTOMERS = [
  { name: 'Kedai Runcit Ali', phone: '+60123456789', address: 'Jalan Pasar, Ipoh' },
  { name: 'Mini Market Mei Ling', phone: '+60198887777', email: 'meiling@minimart.my' },
  { name: 'Restoran Nasi Kandar Salim', phone: '+60134445555', address: 'Lebuh Chulia, George Town' },
  { name: 'Syarikat Tan Bros Trading', phone: '+60167778888', email: 'order@tanbros.my' },
  { name: 'Kafe Kopi Kampung', phone: '+60112223333' },
  { name: 'Pasar Mini Siti', phone: '+60145556666', notes: 'Pays on Fridays' },
  { name: 'Kedai Makan Raju', phone: '+60179990000' },
  { name: 'Koperasi Sekolah SMK Taman Jaya', phone: '+60351234567', email: 'koperasi@smktj.edu.my' },
];

const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
try {
  const prisma = app.get(PrismaService);
  if ((await prisma.user.count()) > 0) {
    console.log('Users already exist; skipping seed.');
  } else {
    const { user: admin } = await app
      .get(AuthService)
      .register({ name: 'Demo Admin', email: 'admin@orderflow.local', password: 'Admin123!' });
    const staff = await app
      .get(UsersService)
      .create({ name: 'Demo Staff', email: 'staff@orderflow.local', password: 'Staff123!', role: 'STAFF' });

    const products: { id: string }[] = [];
    for (const p of PRODUCTS) products.push(await app.get(ProductsService).create(p, admin.id));
    const customers: { id: string }[] = [];
    for (const c of CUSTOMERS) customers.push(await app.get(CustomersService).create(c));

    const orders = app.get(OrdersService);
    const payments = app.get(PaymentsService);
    const item = (i: number, quantity: number) => ({ productId: products[i].id, quantity });
    const place = (c: number, items: { productId: string; quantity: number }[], discount = 0) =>
      orders.create({ customerId: customers[c].id, items, discount }, staff.id);
    const advance = async (id: string, ...statuses: ('CONFIRMED' | 'PACKING' | 'READY' | 'DELIVERED' | 'CANCELLED')[]) => {
      for (const s of statuses) await orders.changeStatus(id, s, staff.id);
    };

    const o1 = await place(0, [item(0, 3), item(1, 2)]);
    await advance(o1.id, 'CONFIRMED', 'PACKING', 'READY', 'DELIVERED');
    await payments.record({ orderId: o1.id, amount: Number(o1.total), method: 'BANK_TRANSFER', reference: 'MBB-88121' }, staff.id);

    const o2 = await place(1, [item(3, 20), item(7, 10)], 5);
    await advance(o2.id, 'CONFIRMED', 'PACKING');
    await payments.record({ orderId: o2.id, amount: 50, method: 'CASH' }, staff.id);

    const o3 = await place(2, [item(5, 4), item(6, 2), item(13, 6)]);
    await advance(o3.id, 'CONFIRMED', 'PACKING', 'READY', 'DELIVERED'); // delivered, unpaid

    await place(3, [item(0, 5), item(11, 5)]); // pending
    const o5 = await place(4, [item(8, 2), item(9, 1)]);
    await advance(o5.id, 'CANCELLED');
    await place(5, [item(2, 4), item(4, 6)]); // pending
    const o7 = await place(7, [item(10, 2), item(14, 12)], 10);
    await advance(o7.id, 'CONFIRMED');
    await payments.record({ orderId: o7.id, amount: 100, method: 'BANK_TRANSFER', reference: 'CIMB-5512' }, staff.id);

    console.log('Seeded demo data. Log in with admin@orderflow.local / Admin123! or staff@orderflow.local / Staff123!');
  }
} finally {
  await app.close();
}
