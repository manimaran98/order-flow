import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'Password123!';

export async function registerOwner(page: Page, email = 'owner@kedai.my') {
  await page.goto('/register');
  await page.getByLabel('Name').fill('Aisyah');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function logIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function logOut(page: Page, phone: boolean) {
  if (phone) await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);
}

export async function createProduct(page: Page, p: { name: string; sku: string; price: string; stock: string; threshold: string }) {
  await page.goto('/products/new');
  await page.getByLabel('Name').fill(p.name);
  await page.getByLabel('SKU').fill(p.sku);
  await page.getByLabel('Selling price (RM)').fill(p.price);
  await page.getByLabel('Cost price (RM)').fill('1.00');
  await page.getByLabel('Opening stock').fill(p.stock);
  await page.getByLabel('Low-stock threshold').fill(p.threshold);
  await page.getByRole('button', { name: 'Save product' }).click();
  await expect(page.getByRole('heading', { name: p.name })).toBeVisible();
}

export async function createCustomer(page: Page, name: string, phone: string) {
  await page.goto('/customers/new');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Phone').fill(phone);
  await page.getByRole('button', { name: 'Save customer' }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
}

/** Drives the composer; on phones this walks the 3 steps. */
export async function createOrder(
  page: Page,
  phone: boolean,
  o: { customer: string; items: { name: string; search: string; quantity: number }[]; discount?: string },
) {
  await page.goto('/orders/new');
  await page.getByRole('searchbox', { name: 'Search customers' }).fill(o.customer.split(' ').at(-1)!);
  await page.getByRole('button', { name: new RegExp(o.customer) }).click();
  for (const item of o.items) {
    await page.getByRole('searchbox', { name: 'Search products' }).fill(item.search);
    await page.getByRole('button', { name: `Add ${item.name}` }).click();
    for (let i = 1; i < item.quantity; i++) await page.getByRole('button', { name: `Increase ${item.name}` }).click();
  }
  if (phone) await page.getByRole('button', { name: 'Next: review' }).click();
  if (o.discount) await page.getByRole('textbox', { name: 'Discount (RM)' }).fill(o.discount);
}
