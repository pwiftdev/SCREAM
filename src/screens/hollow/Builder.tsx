import { hollowAudio } from '../../lib/hollow-audio';
import { useEffect, useRef, useState } from 'react';
import { BUILD_ITEMS } from '../../../shared/house/build-items';
import { NIGHT, nightmare } from '../../../shared/house/rework';
import { PanelTitle, Segments, Hotbar, ItemIcon, KeyCap } from '../rework/ui';
import { insidePlot } from '../../../shared/house/plots';
import { H } from '../../../shared/config';
import { BLOCKS, B } from '../../../shared/house/blocks';
import { HouseEditor } from '../../../shared/house/editor';
import {
  decodeHouse,
  stashPositions,
  encodeHouse,
  at,
  cleanText,
  PROP_TYPES,
  TRIGGERS,
  type Prop,
  type Vec3i,
} from '../../../shared/house/format';
import { prop } from '../../../shared/house/samples';
import { readDraft, writeDraft, forgetDraft } from '../../lib/hollow-draft';
import { SignEditor } from './SignEditor';
import { BuildController } from '../../game/hollow/build-controller';
import { laneApi, type OwnHouse } from '../../lib/hollow-api';
const hotIds: number[] = [
  B.PLANK,
  B.DARK,
  B.BRICK,
  B.GLASS,
  B.DOOR,
  B.SPIKES,
  B.SCREAMER,
  B.CANDY,
  B.JACK,
];

export function Builder({
  initial,
  onExit,
  onClear,
}: {
  initial: OwnHouse;
  onExit: (saved: OwnHouse, menu?: boolean) => void;
  onClear: (saved: OwnHouse) => void;
}) {
  const [editor] = useState(
      () =>
        new HouseEditor(
          readDraft(initial.code, initial.hash) ??
            decodeHouse(initial.house, true),
        ),
    ),
    [house, setHouse] = useState(editor.house),
    [selected, setSelected] = useState<number>(B.PLANK),
    [search, setSearch] = useState(''),
    [palette, setPalette] = useState(false),
    [tool, setTool] = useState<'block' | 'line' | 'fill'>('block'),
    [rotation, setRotation] = useState(0),
    [level, setLevel] = useState((editor.house.height ?? 16) - 1),
    [dark, setDark] = useState(true),
    [category, setCategory] = useState('STRUCTURE'),
    [breaking, setBreaking] = useState(false),
    [activeProp, setActiveProp] = useState(-1),
    [propType, setPropType] = useState<Prop['type']>('lurker'),
    [placingProp, setPlacingProp] = useState(false),
    [status, setStatus] = useState(() =>
      readDraft(initial.code, initial.hash)
        ? 'recovered unsaved changes from this device'
        : 'draft loaded',
    ),
    [busy, setBusy] = useState(false),
    [recent, setRecent] = useState<number[]>([]);
  const host = useRef<HTMLDivElement>(null),
    controller = useRef<BuildController | null>(null),
    saved = useRef(initial),
    pending = useRef<Promise<OwnHouse> | null>(null),
    anchor = useRef<Vec3i | null>(null),
    state = useRef({ selected, rotation, tool, placingProp, propType });
  state.current = { selected, rotation, tool, placingProp, propType };
  const refresh = () => setHouse(editor.house);
  useEffect(() => {
    hollowAudio.street();
    const c = new BuildController(
      host.current!,
      editor.house,
      (p, remove, pick) => {
        const s = state.current;
        if (!remove && initial.plot && !insidePlot(p, initial.plot.tier)) {
          setStatus('Outside your plot. Build inside the foundation.');
          return;
        }
        if (pick) {
          setSelected(at(editor.house, p.x, p.y, p.z));
          return;
        }
        if (s.placingProp) {
          if (
            editor.house.props.length >=
            ((editor.house.height ?? H.PLOT_H) > H.PLOT_H
              ? H.HOLDER_PROPS
              : H.MAX_PROPS)
          ) {
            setStatus('prop limit reached');
            return;
          }
          editor.change((h) =>
            h.props.push(
              prop(s.propType, p.x, p.z, {
                id: crypto.randomUUID(),
                pos: { ...p },
                target: { ...p },
              }),
            ),
          );
          setActiveProp(editor.house.props.length - 1);
          setPlacingProp(false);
        } else if (!remove && s.selected === B.CANDY) {
          try {
            editor.placeStash(p);
          } catch (e) {
            setStatus((e as Error).message);
            return;
          }
        } else if (s.tool !== 'block' && !anchor.current) {
          anchor.current = p;
          setStatus('first corner set. choose the other end.');
          return;
        } else {
          editor.paint(
            anchor.current ?? p,
            p,
            remove ? 0 : s.selected,
            s.rotation,
            s.tool,
          );
          anchor.current = null;
          setRecent((old) =>
            [s.selected, ...old.filter((id) => id !== s.selected)].slice(0, 8),
          );
        }
        hollowAudio.build(s.selected, remove);
        setHouse(editor.house);
        setStatus('unsaved changes');
      },
      () => setRotation((r) => (r + 1) % 4),
      (redo) => {
        if (redo) editor.redo();
        else editor.undo();
        setHouse(editor.house);
      },
      initial.plot ?? undefined,
    );
    c.move();
    controller.current = c;
    return () => {
      c.dispose();
      controller.current = null;
    };
  }, [editor, initial.plot]);
  useEffect(
    () => controller.current?.update(house, level, dark),
    [house, level, dark],
  );
  const saveRef = useRef<() => Promise<OwnHouse>>(async () => initial);
  useEffect(() => {
    if (!writeDraft(initial.code, saved.current.hash, house))
      setStatus('device backup unavailable. use SAVE before closing.');
  }, [house, initial.code]);
  async function save() {
    if (pending.current) {
      await pending.current;
    }
    const snapshot = editor.house;
    setStatus('saving draft…');
    const task = laneApi<OwnHouse>(
      '/mine',
      { house: encodeHouse(snapshot), expected: saved.current.hash },
      'PUT',
    );
    pending.current = task;
    try {
      const result = await task;
      saved.current = result;
      if (editor.house === snapshot) forgetDraft(initial.code);
      else writeDraft(initial.code, result.hash, editor.house);
      setStatus(
        editor.house === snapshot
          ? 'draft saved'
          : 'new changes waiting to save',
      );
      return result;
    } catch (e) {
      setStatus((e as Error).message);
      throw e;
    } finally {
      if (pending.current === task) pending.current = null;
    }
  }
  saveRef.current = save;
  useEffect(() => {
    const id = setInterval(() => {
      void saveRef.current().catch(() => {});
    }, H.AUTOSAVE_MS);
    const warn = (e: BeforeUnloadEvent) => {
      if (
        JSON.stringify(encodeHouse(editor.house)) !==
        JSON.stringify(saved.current.house)
      )
        e.preventDefault();
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden')
        void saveRef.current().catch(() => {});
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', warn);
    return () => {
      clearInterval(id);
      window.removeEventListener('beforeunload', warn);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [editor]);
  async function leave(clear: boolean, menu = false) {
    setBusy(true);
    try {
      const result = await save();
      if (clear) onClear(result);
      else onExit(result, menu);
    } catch {
      return;
    } finally {
      setBusy(false);
    }
  }
  function editProp(change: Partial<Prop>) {
    editor.change((h) => {
      h.props[activeProp] = { ...h.props[activeProp], ...change };
    });
    refresh();
  }
  const p = house.props[activeProp];
  const candyHidden = house.blocks.includes(B.CANDY);
  function hideCandy(x: number, z: number) {
    try {
      editor.placeStash({ x, y: 1, z });
    } catch (e) {
      setStatus((e as Error).message);
      return;
    }
    refresh();
    setStatus('Candy hidden. Test your escape, then publish.');
  }
  const leaveRef = useRef(leave);
  leaveRef.current = leave;
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === 'Escape') void leaveRef.current(false, true);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  const item = BUILD_ITEMS.find((i) => i.id === selected) ?? BUILD_ITEMS[0],
    stashes = stashPositions(house),
    rating = nightmare(house),
    blocks = house.blocks.filter(Boolean).length;
  useEffect(
    () => controller.current?.select(selected, rotation),
    [selected, rotation],
  );
  useEffect(() => controller.current?.mode(breaking), [breaking]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.matches('input,textarea,select')
      )
        return;
      if (/^Digit[1-9]$/.test(e.code)) {
        setSelected(hotIds[Number(e.code.slice(-1)) - 1]);
      }
      if (e.code === 'KeyM') {
        setPalette(false);
        controller.current?.move();
      }
      if (e.code === 'KeyE') setPalette((v) => !v);
    };
    const wheel = (e: WheelEvent) => {
      if (
        e.target instanceof Element &&
        e.target.closest('aside,input,textarea,select')
      )
        return;
      setSelected(
        (s) =>
          hotIds[(Math.max(0, hotIds.indexOf(s)) + (e.deltaY > 0 ? 1 : 8)) % 9],
      );
    };
    window.addEventListener('keydown', key);
    window.addEventListener('wheel', wheel);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('wheel', wheel);
    };
  }, []);
  return (
    <main
      className={`hl-app night-builder in-world-build${palette ? ' palette-open' : ''}`}
    >
      <div ref={host} className="hl-world" />
      <div className="night-build-top">
        <button
          className="night-outline"
          aria-label="Exit builder"
          disabled={busy}
          onClick={() => leave(false, true)}
        >
          ‹
        </button>
        <div>
          <h2>BUILD MODE</h2>
          <input
            aria-label="House title"
            maxLength={H.TITLE_MAX}
            value={house.title}
            onChange={(e) => {
              editor.change(
                (h) => (h.title = cleanText(e.target.value, H.TITLE_MAX)),
              );
              refresh();
            }}
          />
        </div>
        <div className="night-build-tools">
          <button aria-pressed={!breaking} onClick={() => setBreaking(false)}>
            PLACE
          </button>
          <button aria-pressed={breaking} onClick={() => setBreaking(true)}>
            BREAK
          </button>
          <button onClick={() => setRotation((rotation + 1) % 4)}>
            <KeyCap>R</KeyCap> ROTATE
          </button>
          <button
            onClick={() => {
              setPalette(!palette);
              controller.current?.pause();
            }}
          >
            PALETTE
          </button>
          <button
            onClick={() => {
              setPalette(false);
              controller.current?.move();
            }}
          >
            <KeyCap>M</KeyCap> MOVE
          </button>
        </div>
        <div className="night-block-count">
          <small>
            BLOCKS {blocks.toLocaleString()} /{' '}
            {house.blocks.length.toLocaleString()}
          </small>
          <Segments
            value={blocks}
            max={house.blocks.length}
            label="Blocks used"
          />
        </div>
        <button
          className="night-outline"
          disabled={busy || !candyHidden}
          onClick={() => leave(true)}
        >
          TEST RAID
        </button>
        <button
          className="night-primary"
          disabled={busy}
          onClick={() => leave(false)}
        >
          SAVE & RETURN TO WORLD
        </button>
      </div>
      <div className="night-crosshair" />
      <div className="night-build-prompt">
        <strong>{item.name}</strong>
        <small>
          <KeyCap>LMB</KeyCap> PLACE <KeyCap>RMB</KeyCap> BREAK{' '}
          <KeyCap>R</KeyCap> ROTATE <KeyCap>E</KeyCap> PALETTE
        </small>
      </div>
      <aside className="night-build-palette night-panel">
        <PanelTitle>BUILD PALETTE</PanelTitle>
        <div className="night-categories">
          {['STRUCTURE', 'TRAPS', 'HIDING', 'DECOR'].map((c) => (
            <button
              key={c}
              aria-pressed={category === c}
              onClick={() => {
                setCategory(c);
                setSearch('');
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <input
          className="night-search"
          aria-label="Search blocks"
          value={search}
          placeholder="Find a block…"
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="night-build-items">
          {BUILD_ITEMS.filter((i) =>
            search
              ? i.name.toLowerCase().includes(search.toLowerCase())
              : i.category === category,
          ).map((i) => (
            <button
              key={i.id}
              aria-pressed={selected === i.id && !placingProp}
              onClick={() => {
                setSelected(i.id);
                setPlacingProp(false);
              }}
            >
              <ItemIcon name={i.texture} />
              <span>{i.name}</span>
              <small>{i.cost ? `${i.cost} CANDY` : 'FREE'}</small>
            </button>
          ))}
        </div>
        <div className="night-item-description">
          <h3>{item.name}</h3>
          <small className="candy-text">{item.cost} CANDY · DESIGN COST</small>
          <p>{item.description}</p>
          <small>BUILD MATERIALS ARE FREE IN THIS LOCAL PLAYTEST.</small>
        </div>
      </aside>
      <aside className="night-build-stashes night-panel">
        <PanelTitle>
          YOUR STASHES{' '}
          <span>
            {stashes.length} / {NIGHT.maxStashes}
          </span>
        </PanelTitle>
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className={`night-stash-row ${stashes[i] ? '' : 'empty'}`}
          >
            <ItemIcon name="chest_open" />
            <div>
              <b>
                {stashes[i]
                  ? `Stash ${String.fromCharCode(65 + i)}`
                  : 'Empty slot'}
              </b>
              <p>
                {stashes[i]
                  ? `Hidden at ${stashes[i].x}, ${stashes[i].y}, ${stashes[i].z}`
                  : 'Place a Stash Chest to use it'}
              </p>
            </div>
            <span>{stashes[i] ? 'HIDDEN' : '—'}</span>
          </div>
        ))}
        {!candyHidden && (
          <div className="night-stash-help">
            <p>Hide your first stash, then test your escape.</p>
            <button onClick={() => hideCandy(12, 18)}>HIDE AT THE BACK</button>
            <button onClick={() => hideCandy(16, 16)}>
              HIDE IN THE CORNER
            </button>
          </div>
        )}
        <div className="night-rating">
          <PanelTitle>NIGHTMARE RATING</PanelTitle>
          <strong>{rating.total}</strong>
          <small>
            / 100 · {rating.total > 60 ? 'HARD TO RAID' : 'MAKE IT SCARIER'}
          </small>
          {(['traps', 'hiding', 'darkness'] as const).map((k) => (
            <div key={k}>
              <p>
                {k}
                <small>{rating[k]}/10</small>
              </p>
              <Segments
                value={rating[k]}
                max={10}
                color={k === 'traps' ? 'blood' : 'bone'}
                label={k}
              />
            </div>
          ))}
        </div>
        <details className="night-advanced">
          <summary>SCARES, SIGNS & ADVANCED TOOLS</summary>{' '}
          <span className="hl-eyebrow">
            SCARE PROPS · {house.props.length}/
            {(house.height ?? H.PLOT_H) > H.PLOT_H
              ? H.HOLDER_PROPS
              : H.MAX_PROPS}
          </span>
          <select
            aria-label="Scare type"
            value={propType}
            onChange={(e) => setPropType(e.target.value as Prop['type'])}
          >
            {PROP_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <button onClick={() => setPlacingProp(!placingProp)}>
            {placingProp ? 'CLICK A BLOCK TO PLACE' : 'PLACE SCARE'}
          </button>
          <div className="hl-prop-list">
            {house.props.map((p, i) => (
              <button
                aria-pressed={i === activeProp}
                key={p.id}
                onClick={() => setActiveProp(i)}
              >
                {p.type}{' '}
                <small>
                  {p.pos.x},{p.pos.z}
                </small>
              </button>
            ))}
          </div>
          <SignEditor house={house} editor={editor} refresh={refresh} />
          {p && (
            <div className="hl-prop-fields">
              <label>
                trigger
                <select
                  value={p.trigger}
                  onChange={(e) =>
                    editProp({ trigger: e.target.value as Prop['trigger'] })
                  }
                >
                  {TRIGGERS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              {(['radius', 'delay', 'duration', 'cooldown'] as const).map(
                (k) => (
                  <label key={k}>
                    {k}
                    <input
                      type="number"
                      min={k === 'radius' ? 0.5 : 0}
                      max={k === 'radius' ? 12 : 120}
                      step="0.1"
                      value={p[k]}
                      onChange={(e) =>
                        editProp({ [k]: Number(e.target.value) })
                      }
                    />
                  </label>
                ),
              )}
              <label>
                one shot
                <input
                  type="checkbox"
                  checked={p.once}
                  onChange={(e) => editProp({ once: e.target.checked })}
                />
              </label>
              <label>
                sound
                <select
                  value={p.sound}
                  onChange={(e) =>
                    editProp({ sound: e.target.value as Prop['sound'] })
                  }
                >
                  {['whisper', 'steps', 'scream', 'knock'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              {(['x', 'y', 'z'] as const).map((axis) => (
                <label key={axis}>
                  target {axis}
                  <input
                    type="number"
                    min="0"
                    max={
                      axis === 'y'
                        ? (house.height ?? H.PLOT_H) - 1
                        : H.PLOT_W - 1
                    }
                    value={p.target[axis]}
                    onChange={(e) =>
                      editProp({
                        target: { ...p.target, [axis]: Number(e.target.value) },
                      })
                    }
                  />
                </label>
              ))}
              <button
                onClick={() => {
                  editor.change((h) => h.props.splice(activeProp, 1));
                  setActiveProp(-1);
                  refresh();
                }}
              >
                REMOVE SCARE
              </button>
            </div>
          )}
          <div className="hl-tools">
            {(['block', 'line', 'fill'] as const).map((t) => (
              <button
                key={t}
                aria-pressed={tool === t}
                onClick={() => {
                  setTool(t);
                  anchor.current = null;
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <label>
            Visible height
            <input
              aria-label="Visible height"
              type="range"
              min="0"
              max={(house.height ?? 16) - 1}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
            />
          </label>
          <button onClick={() => setDark(!dark)}>
            {dark ? 'WORK LIGHT' : 'NIGHT LIGHT'}
          </button>
          <div>
            {recent.map((id) => (
              <button key={id} onClick={() => setSelected(id)}>
                {BLOCKS[id].name}
              </button>
            ))}
          </div>
        </details>
        <p className="night-raid-rule">
          If a raider finds a stash and escapes, they take a share of your
          house’s remaining reward.
        </p>
      </aside>
      <Hotbar
        items={hotIds.map((id) => {
          const i = BUILD_ITEMS.find((i) => i.id === id)!;
          return { name: i.name, texture: i.texture };
        })}
        selected={hotIds.indexOf(selected as (typeof hotIds)[number])}
        onSelect={(n) => setSelected(hotIds[n])}
      />
      <div className="night-build-save">
        <span role="status">{status}</span>
        <button
          disabled={!editor.canUndo}
          onClick={() => {
            editor.undo();
            refresh();
          }}
        >
          UNDO
        </button>
        <button
          disabled={!editor.canRedo}
          onClick={() => {
            editor.redo();
            refresh();
          }}
        >
          REDO
        </button>
        <button disabled={busy} onClick={() => void save().catch(() => {})}>
          SAVE
        </button>
      </div>
    </main>
  );
}
