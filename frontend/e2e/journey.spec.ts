import { expect, test } from '@playwright/test';
import { resetDb } from './db';
import { createCustomer, createOrder, createProduct, logIn, logOut, PASSWORD, registerOwner } from './helpers';

test.beforeEach(async () => {
  await resetDb();
});

test('an owner takes a WhatsApp order all the way to paid (brief §23)', async ({ page }, info) => {
  const phone = info.project.name === 'phone';

  // Signed-out visitors are sent to login and kept on the page they wanted.
  await page.goto('/orders');
  await expect(page).toHaveURL(/\/login\?next=%2Forders$/);

  // 1. Register the first admin; log out; log back in.
  await registerOwner(page);
  await logOut(page, phone);
  await logIn(page, 'owner@kedai.my');

  // 2–3. Products (one that will be low) and a customer.
  await createProduct(page, { name: 'Coca-Cola 24 x 320ml', sku: 'COKE-24', price: '36.50', stock: '10', threshold: '2' });
  await createProduct(page, { name: 'Milo 3in1', sku: 'MILO-18', price: '17.90', stock: '3', threshold: '5' });
  await createCustomer(page, 'Kedai Runcit Ali', '+60123456789');

  // 4–5. An order with two items and a discount: 2 × 36.50 + 17.90 − 0.90 = 90.00.
  await createOrder(page, phone, {
    customer: 'Kedai Runcit Ali',
    items: [
      { name: 'Coca-Cola 24 x 320ml', search: 'Coca', quantity: 2 },
      { name: 'Milo 3in1', search: 'Milo', quantity: 1 },
    ],
    discount: '0.90',
  });
  await expect(page.getByRole('status', { name: 'Order total' })).toHaveText('RM 90.00');
  await page.getByRole('button', { name: 'Create order' }).click();
  await expect(page.getByRole('heading', { name: /^ORD-\d{8}-0001$/ })).toBeVisible();
  const orderUrl = page.url();

  // 6–7. Confirm deducts stock.
  await page.getByRole('button', { name: 'Confirm order' }).click();
  await expect(page.getByRole('button', { name: 'Start packing' })).toBeVisible();
  await page.goto('/inventory');
  await expect(page.getByTestId('stock-COKE-24').filter({ visible: true })).toHaveText('8');

  // 8. Fulfilment.
  await page.goto(orderUrl);
  for (const [click, next] of [
    ['Start packing', 'Mark ready'],
    ['Mark ready', 'Mark delivered'],
  ]) {
    await page.getByRole('button', { name: click }).click();
    await expect(page.getByRole('button', { name: next })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Mark delivered' }).click();
  await expect(page.getByRole('button', { name: 'Cancel order' })).toHaveCount(0);

  // 9–10. Partial payment, then the rest.
  if (phone) await page.getByRole('button', { name: 'Record payment' }).click();
  await page.getByRole('spinbutton', { name: 'Amount (RM)' }).fill('50');
  await page.getByRole('button', { name: 'Save payment' }).click();
  await expect(page.getByText('Partial', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  if (phone) await page.getByRole('button', { name: 'Record payment' }).click();
  await expect(page.getByRole('spinbutton', { name: 'Amount (RM)' })).toHaveValue('40.00');
  await page.getByRole('button', { name: 'Save payment' }).click();
  // "Paid" is also a totals label, so wait for the payment UI itself to go away (it only does once fully paid).
  await expect(page.getByText('Record payment').filter({ visible: true })).toHaveCount(0);
  await expect(page.getByText('RM 0.00').filter({ visible: true }).first()).toBeVisible();

  // 11–12. The dashboard reflects it.
  await page.goto('/dashboard');
  await expect(page.getByRole('link', { name: /^Today's orders: 1 · RM / })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Low-stock products: 1' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Unpaid orders: 0' })).toBeVisible();

  // STAFF don't get admin controls.
  await page.goto('/users');
  await page.getByLabel('Name').fill('Siti');
  await page.getByLabel('Email').fill('siti@kedai.my');
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create user' }).click();
  await expect(page.getByText('siti@kedai.my')).toBeVisible();
  await logOut(page, phone);
  await logIn(page, 'siti@kedai.my');
  await page.goto('/inventory');
  await expect(page.getByRole('button', { name: /Adjust stock for/ })).toHaveCount(0);
  await page.goto('/products');
  await expect(page.getByRole('link', { name: 'New product' })).toHaveCount(0);
  await page.goto('/users');
  await expect(page.getByText('Admins only')).toBeVisible();
});

test('confirming without enough stock explains why and keeps the order pending', async ({ page }, info) => {
  const phone = info.project.name === 'phone';
  await registerOwner(page);
  await createProduct(page, { name: 'Tepung Gandum 1kg', sku: 'TEPUNG-1', price: '2.90', stock: '1', threshold: '0' });
  await createCustomer(page, 'Pasar Mini Siti', '+60145556666');
  await createOrder(page, phone, { customer: 'Pasar Mini Siti', items: [{ name: 'Tepung Gandum 1kg', search: 'Tepung', quantity: 3 }] });
  await page.getByRole('button', { name: 'Create order' }).click();
  await expect(page.getByText(/stock is short for TEPUNG-1/)).toBeVisible();

  await page.getByRole('button', { name: 'Confirm order' }).click();
  await expect(page.getByText('Insufficient stock for TEPUNG-1: requested 3, available 1')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm order' })).toBeVisible();
});
