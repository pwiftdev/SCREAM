import { CHARACTERS, COLORS } from '../../shared/config';
import type { Role } from '../../shared/types';
import { Panel, Icon } from '../components/ui';
interface Props {
  role: Role;
  selected: number;
  name: string;
  roomCode: string;
  busy: boolean;
  waiting: number;
  onRole: (r: Role) => void;
  onCharacter: (i: number) => void;
  onName: (s: string) => void;
  onRoom: (s: string) => void;
  onPractice: () => void;
  onQueue: () => void;
  onFill: () => void;
}
export function Characters(p: Props) {
  return (
    <>
      <section className="character-title">
        <p className="eyebrow">CHOOSE WHO MAKES IT HOME</p>
        <h1 className={p.role === 'killer' ? 'danger' : ''}>
          {p.role === 'killer'
            ? 'THE HOLLOW.'
            : `${CHARACTERS[p.selected].toUpperCase()}.`}
        </h1>
        <p>
          {p.role === 'killer'
            ? 'a bell in the dark. a silence after.'
            : 'no special powers. just a reason to get out.'}
        </p>
        <p className="holder-look">
          token holders wear the brass ember charm in queued matches.
        </p>
        <div className="character-select">
          {CHARACTERS.map((n, i) => (
            <button
              className={i === p.selected ? 'selected' : ''}
              style={{ '--character': COLORS[i] } as React.CSSProperties}
              key={n}
              onClick={() => {
                p.onCharacter(i);
                p.onRole('survivor');
              }}
            >
              <img src={`/assets/portraits/${i}.png`} alt="" />
              <span>{n[0]}</span>
              {n}
            </button>
          ))}
        </div>
      </section>
      <Panel
        className="role-panel"
        eyebrow="PICK A SIDE"
        title="EVERY NIGHT NEEDS A VILLAIN."
      >
        <div className="role-options">
          <button
            className={p.role === 'survivor' ? 'selected' : ''}
            onClick={() => p.onRole('survivor')}
          >
            <Icon kind="heart" />
            <div>
              <h3>SURVIVOR</h3>
              <p>repair. rescue. run.</p>
            </div>
          </button>
          <button
            className={p.role === 'killer' ? 'selected danger' : ''}
            onClick={() => p.onRole('killer')}
          >
            <Icon kind="skull" />
            <div>
              <h3>THE HOLLOW</h3>
              <p>make sure nobody leaves.</p>
            </div>
          </button>
        </div>
        <label className="field-label">
          WHAT SHOULD THEY CALL YOU?
          <input
            maxLength={20}
            value={p.name}
            onChange={(e) => p.onName(e.target.value)}
            aria-label="Player name"
          />
        </label>
        <label className="field-label">
          FRIEND’S ROOM CODE <span>optional</span>
          <input
            value={p.roomCode}
            onChange={(e) => p.onRoom(e.target.value)}
            placeholder="leave empty to host"
            aria-label="Room code"
          />
        </label>
        <button className="primary" disabled={p.busy} onClick={p.onPractice}>
          STEP INSIDE <span>↗</span>
        </button>
        <button className="secondary" disabled={p.busy} onClick={p.onQueue}>
          JOIN ROLE QUEUE · {p.waiting} WAITING
        </button>
        <button
          className="text-button fill-queue"
          disabled={p.busy}
          onClick={p.onFill}
        >
          OR FILL EITHER ROLE
        </button>
        <p className="panel-footnote">
          local test profile · development bots fill empty seats
        </p>
      </Panel>
    </>
  );
}
