import { H } from '../../../shared/config';
import { cleanText, type HouseV1 } from '../../../shared/house/format';
import type { HouseEditor } from '../../../shared/house/editor';
export function SignEditor({
  house,
  editor,
  refresh,
}: {
  house: HouseV1;
  editor: HouseEditor;
  refresh: () => void;
}) {
  const edit = (change: (h: HouseV1) => void) => {
    editor.change(change);
    refresh();
  };
  return (
    <details className="hl-sign-editor">
      <summary>
        SIGNS · {house.signs.length}/{H.MAX_SIGNS}
      </summary>
      {house.signs.map((sign, i) => (
        <fieldset key={i}>
          <input
            aria-label={`Sign ${i + 1} text`}
            maxLength={H.SIGN_MAX}
            value={sign.text}
            onChange={(e) =>
              edit((h) => {
                h.signs[i].text = cleanText(e.target.value, H.SIGN_MAX);
              })
            }
          />
          {(['x', 'y', 'z'] as const).map((axis) => (
            <label key={axis}>
              {axis}
              <input
                aria-label={`Sign ${i + 1} ${axis}`}
                type="number"
                min="0"
                max={(axis === 'y' ? (house.height ?? H.PLOT_H) : H.PLOT_W) - 1}
                value={sign.pos[axis]}
                onChange={(e) =>
                  edit((h) => {
                    h.signs[i].pos[axis] = Math.max(
                      0,
                      Math.min(
                        (axis === 'y' ? (house.height ?? H.PLOT_H) : H.PLOT_W) -
                          1,
                        Math.round(Number(e.target.value)),
                      ),
                    );
                  })
                }
              />
            </label>
          ))}
          <button
            onClick={() =>
              edit((h) => {
                h.signs.splice(i, 1);
              })
            }
          >
            REMOVE SIGN
          </button>
        </fieldset>
      ))}
      <button
        disabled={house.signs.length >= H.MAX_SIGNS}
        onClick={() =>
          edit((h) => {
            h.signs.push({ pos: { x: 12, y: 2, z: 5 }, text: 'turn back' });
          })
        }
      >
        ADD SIGN
      </button>
    </details>
  );
}
