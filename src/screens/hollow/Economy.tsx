import { useEffect, useRef, useState } from 'react';
import { laneApi, LaneApiError } from '../../lib/hollow-api';
import { H } from '../../../shared/config';
export function Economy({
  code,
  owner = false,
}: {
  code: string;
  owner?: boolean;
}) {
  const [account, setAccount] = useState<{
      mode: string;
      balance: number;
      premium: boolean;
      holder: boolean;
    } | null>(null),
    [bounty, setBounty] = useState({ balance: 0, notice: 0 }),
    [amount, setAmount] = useState(1000),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  const operation = useRef<{
    action: string;
    code: string;
    amount: number;
    id: string;
  } | null>(null);
  async function refresh() {
    const [a, b] = await Promise.all([
      laneApi<NonNullable<typeof account>>('/account'),
      laneApi<typeof bounty>(`/bounty/${code}`),
    ]);
    setAccount(a);
    setBounty(b);
  }
  useEffect(() => {
    let active = true;
    Promise.all([
      laneApi<NonNullable<typeof account>>('/account'),
      laneApi<typeof bounty>(`/bounty/${code}`),
    ])
      .then(([a, b]) => {
        if (active) {
          setAccount(a);
          setBounty(b);
        }
      })
      .catch((e) => {
        if (active) setMessage(e.message);
      });
    return () => {
      active = false;
    };
  }, [code]);
  async function act(action: string) {
    if (operation.current && operation.current.action !== action) {
      setMessage('retry the unconfirmed request first.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      operation.current ??= { action, code, amount, id: crypto.randomUUID() };
      await laneApi('/economy', operation.current);
      operation.current = null;
      await refresh();
      setMessage(
        action === 'notice'
          ? 'withdrawal available after 24 hours. visitors can still win it.'
          : 'pretend-token ledger updated. no real funds moved.',
      );
    } catch (e) {
      if (e instanceof LaneApiError && e.status < 500) operation.current = null;
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="hl-economy">
      <span className="hl-eyebrow">
        {account?.mode === 'test'
          ? 'TEST ECONOMY · PRETEND TOKENS'
          : 'ECONOMY OFF'}
      </span>
      <p>
        {account?.mode === 'test'
          ? `${account.balance.toLocaleString()} pretend $SCREAM · bounty ${bounty.balance.toLocaleString()}`
          : 'real payments are disabled. visiting and building are free.'}
      </p>
      {account?.mode === 'test' && (
        <>
          <label>
            <input
              aria-label="Token amount"
              type="number"
              min={owner ? H.MIN_BOUNTY : 1}
              step="100"
              value={amount}
              disabled={busy || !!operation.current}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </label>
          <button
            disabled={busy}
            onClick={() => act(owner ? 'deposit' : 'tip')}
          >
            {owner ? 'ADD TEST BOUNTY' : 'SEND TEST TIP'}
          </button>
          {owner && bounty.balance > 0 && (
            <button
              disabled={busy}
              onClick={() =>
                act(
                  bounty.notice && bounty.notice <= Date.now()
                    ? 'withdraw'
                    : 'notice',
                )
              }
            >
              {bounty.notice
                ? `WITHDRAW AFTER ${new Date(bounty.notice).toLocaleString()}`
                : 'REQUEST WITHDRAWAL'}
            </button>
          )}
          <button
            disabled={busy || account.premium}
            onClick={() => act('premium')}
          >
            {account.premium
              ? 'COSMETIC PACK OWNED'
              : `COSMETIC PACK · ${H.PREMIUM_COST}`}
          </button>
          {owner && (
            <div>
              <button disabled={busy} onClick={() => act('weekly')}>
                FUND TEST WEEKLY POOL
              </button>
              <button disabled={busy} onClick={() => act('season')}>
                FUND TEST SEASON POOL
              </button>
            </div>
          )}
          {operation.current && (
            <div>
              <p>the last request is unconfirmed.</p>
              <button
                disabled={busy}
                onClick={() => act(operation.current!.action)}
              >
                RETRY LAST REQUEST
              </button>
            </div>
          )}
          <p>{account.holder ? 'test holder balance reached.' : ''}</p>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
