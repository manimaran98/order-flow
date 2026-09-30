import { render, screen } from '@testing-library/react';
import { Pagination } from './pagination';

describe('Pagination', () => {
  it('keeps the current filters when moving between pages', () => {
    render(
      <Pagination
        meta={{ page: 2, limit: 20, total: 50, totalPages: 3 }}
        pathname="/orders"
        params={{ status: 'PENDING', search: undefined, page: '2' }}
      />,
    );
    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute('href', '/orders?status=PENDING&page=1');
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute('href', '/orders?status=PENDING&page=3');
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('disables Previous on page 1 and renders nothing for a single page', () => {
    const { rerender, container } = render(
      <Pagination meta={{ page: 1, limit: 20, total: 30, totalPages: 2 }} pathname="/orders" params={{}} />,
    );
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    rerender(<Pagination meta={{ page: 1, limit: 20, total: 3, totalPages: 1 }} pathname="/orders" params={{}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
