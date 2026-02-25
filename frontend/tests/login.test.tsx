import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import LoginPage from '../app/login/page';

// Mock useRouter
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

const { mockSignIn } = vi.hoisted(() => ({
  mockSignIn: vi.fn()
}));

vi.mock('../app/lib/supabase', () => ({
  supabase: { auth: { signInWithPassword: mockSignIn } }
}));

describe('LoginPage', () => {
  it('renders login form', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/Email address/i)).toBeDefined();
    expect(screen.getByLabelText(/Password/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeDefined();
  });

  it('submits form and redirects on success', async () => {
    // Mock successful Supabase sign in
    mockSignIn.mockResolvedValueOnce({
      data: { session: { access_token: 'fake-token' } },
      error: null,
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
      });
      expect(pushMock).toHaveBeenCalledWith('/dashboard/roster');
    });
  });

  it('displays error message on failure', async () => {
    // Mock failed Supabase sign in
    mockSignIn.mockResolvedValueOnce({
      data: null,
      error: new Error('Invalid login credentials'),
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid login credentials/i)).toBeDefined();
    });
  });
});
