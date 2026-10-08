import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CatalogItem } from '@/lib/types';
import { CatalogBrowser } from './catalog-browser';

const products: CatalogItem[] = [
  { id: 'p1', name: '100Plus 24 x 325ml', description: 'Isotonic drink', sellingPrice: '1234.5', inStock: true },
  { id: 'p2', name: 'Milo 3in1', description: null, sellingPrice: '15.90', inStock: false },
];

const productList = () => screen.getByRole('list', { name: 'Products' });

describe('CatalogBrowser', () => {
  it('shows price in RM and stock status, linking to each product', () => {
    render(<CatalogBrowser products={products} />);
    const items = within(productList()).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('RM 1,234.50');
    expect(items[0]).toHaveTextContent('In stock');
    expect(items[1]).toHaveTextContent('Out of stock');
    expect(within(items[1]).getByRole('link')).toHaveAttribute('href', '/catalog/p2');
  });

  it('renders one list for every screen size, with the description when there is one', () => {
    render(<CatalogBrowser products={products} />);
    expect(screen.getAllByRole('list')).toHaveLength(1);
    const items = within(productList()).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Isotonic drink');
    expect(screen.getByText('2 products')).toBeInTheDocument();
  });

  it('filters by name as the customer types', async () => {
    render(<CatalogBrowser products={products} />);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search products' }), 'milo');
    const items = within(productList()).getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('Milo 3in1');
  });

  it('says so when nothing matches', async () => {
    render(<CatalogBrowser products={products} />);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search products' }), 'kopi');
    expect(screen.getByText('No products match “kopi”')).toBeInTheDocument();
  });
});
