import { Panel } from './ui';
export function WalletModal({
  busy,
  onClose,
  onConnect,
}: {
  busy: boolean;
  onClose: () => void;
  onConnect: (name: string) => void;
}) {
  return (
    <div className="modal-backdrop">
      <Panel
        className="wallet-panel"
        eyebrow="YOUR NAME SURVIVES THE NIGHT"
        title="CONNECT A WALLET"
      >
        <button className="close" aria-label="Close wallet" onClick={onClose}>
          ×
        </button>
        <p>
          one free signature creates a profile.
          <br />
          no transactions. no entry fees.
        </p>
        {['Phantom', 'Solflare', 'Backpack'].map((n) => (
          <button
            key={n}
            className="secondary"
            disabled={busy}
            onClick={() => onConnect(n)}
          >
            {n}
            <span>↗</span>
          </button>
        ))}
        <button
          className="primary"
          disabled={busy}
          onClick={() => onConnect('Local test profile')}
        >
          LOCAL TEST PROFILE
        </button>
        <p className="panel-footnote">development only · holds no assets</p>
      </Panel>
    </div>
  );
}
