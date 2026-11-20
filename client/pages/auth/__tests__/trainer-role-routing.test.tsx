import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  checkAuth: vi.fn().mockResolvedValue(undefined),
  role: 'trainer',
  getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'trainer-id', email: 'trainer@test.invalid' } } } }),
  getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'trainer-id', email: 'trainer@test.invalid' } }, error: null }),
  updateUser: vi.fn().mockResolvedValue({ error: null }),
  rpc: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
}));

vi.mock('react-router-dom', async () => ({
  ...await vi.importActual<typeof import('react-router-dom')>('react-router-dom'),
  useNavigate: () => mocks.navigate,
}));
vi.mock('@/app/providers/AuthProvider', () => ({
  useAuthContext: () => ({
    user: { id: 'trainer-id', profile: { role: mocks.role } },
    isLoading: false,
    checkAuth: mocks.checkAuth,
  }),
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: mocks.getSession, getUser: mocks.getUser, updateUser: mocks.updateUser },
    rpc: mocks.rpc,
  },
}));

import SetPassword from '../SetPassword';
import { DashboardRouter } from '../../../components/DashboardRouter';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.role = 'trainer';
  sessionStorage.clear();
  window.history.replaceState({}, '', '/auth/set-password');
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

async function submitPassword() {
  const password = await screen.findByLabelText('New Password');
  fireEvent.change(password, { target: { value: 'Local-test-password-2026' } });
  fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Local-test-password-2026' } });
  vi.useFakeTimers();
  await act(async () => { fireEvent.click(screen.getByText('Set Password & Access Portal')); });
}

describe('registered trainer routing independent of completion link', () => {
  it('refreshes authoritative role and uses role-neutral dashboard after general password setup', async () => {
    render(<MemoryRouter><SetPassword /></MemoryRouter>);
    await submitPassword();
    expect(mocks.updateUser).toHaveBeenCalledOnce();
    expect(mocks.checkAuth).toHaveBeenCalledOnce();
    expect(mocks.rpc).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(mocks.navigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    expect(mocks.navigate).not.toHaveBeenCalledWith('/workspace');
  });

  it('retains authenticated invitation acceptance for the trainer-specific setup link', async () => {
    window.history.replaceState({}, '', '/auth/set-password?trainer_invitation=local-token');
    render(<MemoryRouter><SetPassword /></MemoryRouter>);
    await submitPassword();
    expect(mocks.rpc).toHaveBeenCalledWith('accept_trainer_invite', { p_token: 'local-token', p_user_id: 'trainer-id' });
    expect(mocks.checkAuth).toHaveBeenCalledOnce();
    await act(async () => { await vi.advanceTimersByTimeAsync(1200); });
    expect(mocks.navigate).toHaveBeenCalledWith('/instructor/dashboard', { replace: true });
  });

  it.each([
    ['trainer', '/instructor/dashboard'],
    ['individual', '/individual/dashboard'],
    ['ecp', '/workspace'],
    ['pdp', '/pdp/dashboard'],
    ['admin', '/admin/dashboard'],
    ['super_admin', '/admin/dashboard'],
  ])('preserves the %s role destination', (role, destination) => {
    mocks.role = role;
    render(<MemoryRouter><DashboardRouter /></MemoryRouter>);
    expect(mocks.navigate).toHaveBeenCalledWith(destination, { replace: true });
  });
});
