// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { Economy } from '../src/screens/hollow/Economy';
import { laneApi, LaneApiError } from '../src/lib/hollow-api';
vi.mock('../src/lib/hollow-api', () => ({
  laneApi: vi.fn(),
  LaneApiError: class extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message);
    }
  },
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('reuses the operation after an ambiguous response and does not retry a transfer after a confirmed ack with a failed balance refresh', async () => {
  const sent: { id: string }[] = [];
  let acknowledged = false;
  vi.mocked(laneApi).mockImplementation(async (path, body) => {
    if (path === '/economy') {
      sent.push(body as { id: string });
      if (sent.length === 1)
        throw new TypeError('connection lost after server commit');
      acknowledged = true;
      return { ok: true };
    }
    if (path === '/account') {
      if (acknowledged) throw new TypeError('balance refresh unavailable');
      return { mode: 'test', balance: 1000000, premium: false, holder: true };
    }
    return { balance: 0, notice: 0 };
  });
  render(<Economy code="HOUSE" owner />);
  fireEvent.click(await screen.findByText('ADD TEST BOUNTY'));
  fireEvent.click(await screen.findByText('RETRY LAST REQUEST'));
  await screen.findByText('balance refresh unavailable');
  expect(sent).toHaveLength(2);
  expect(sent[0].id).toBe(sent[1].id);
  expect(screen.queryByText('RETRY LAST REQUEST')).toBeNull();
});
it('allows correcting a rejected amount without keeping an uncertain operation', async () => {
  vi.mocked(laneApi).mockImplementation(async (path) => {
    if (path === '/economy')
      throw new LaneApiError('not enough pretend tokens', 400);
    if (path === '/account')
      return { mode: 'test', balance: 1000000, premium: false, holder: true };
    return { balance: 0, notice: 0 };
  });
  render(<Economy code="HOUSE" owner />);
  fireEvent.click(await screen.findByText('ADD TEST BOUNTY'));
  await screen.findByText('not enough pretend tokens');
  await waitFor(() =>
    expect(
      (screen.getByLabelText('Token amount') as HTMLInputElement).disabled,
    ).toBe(false),
  );
  expect(screen.queryByText('RETRY LAST REQUEST')).toBeNull();
});
