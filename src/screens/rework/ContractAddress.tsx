import { useState } from 'react';

const address = 'AQgLsh5nxGiWsqBD98ftDosrW3dgtA8ZpUrnodQvpump';

export function ContractAddress() {
  const [status, setStatus] = useState('');
  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setStatus('COPIED');
    } catch {
      setStatus('Select the address to copy manually.');
    }
  }
  return (
    <div className="night-contract">
      <div>
        <label htmlFor="scream-contract">$SCREAM CA</label>
        <input
          id="scream-contract"
          aria-label="$SCREAM contract address"
          readOnly
          value={address}
          onFocus={(event) => event.target.select()}
        />
        <span role="status">{status}</span>
      </div>
      <button
        className="night-outline"
        type="button"
        onClick={() => void copy()}
      >
        COPY CA
      </button>
    </div>
  );
}
