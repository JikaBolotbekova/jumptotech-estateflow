import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { App } from '../App';
import * as api from '../api';

describe('App', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders properties fetched from the API', async () => {
    vi.spyOn(api, 'fetchProperties').mockResolvedValue([
      {
        id: 1,
        title: 'Test Villa',
        description: null,
        price: 500000,
        address: '1 Test Way',
        bedrooms: 3,
        bathrooms: 2,
        created_at: new Date().toISOString(),
      },
    ]);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Test Villa/)).toBeInTheDocument();
    });
  });

  it('shows an error message when the API call fails', async () => {
    vi.spyOn(api, 'fetchProperties').mockRejectedValue(new Error('Network error'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    });
  });

  it('renders an empty state when there are no properties', async () => {
    vi.spyOn(api, 'fetchProperties').mockResolvedValue([]);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
  });
});
