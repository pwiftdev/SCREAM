import { readFileSync, writeFileSync } from 'node:fs';
const models = JSON.parse(
  readFileSync('public/assets/environment/manifest.json', 'utf8'),
);
const audio = JSON.parse(
  readFileSync('public/audio/world/manifest.json', 'utf8'),
);
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
const item = (url, label, author) =>
  `<li><a href="${escape(url)}">${escape(label)}</a> — ${escape(author)}</li>`;
let html = readFileSync('public/assets/credits.html', 'utf8');
const start = html.indexOf('<h2>Environment</h2>'),
  end = html.indexOf('<h2>Fonts</h2>');
if (start < 0 || end < start)
  throw new Error('Credits template sections missing');
html =
  html.slice(0, start) +
  `<h2>Environment</h2><p>Models, surfaces and night panorama from <a href="https://polyhaven.com/license">Poly Haven, CC0</a>.</p><ul>${models.map((a) => item(a.source, a.id.replaceAll('_', ' '), Object.keys(a.authors).join(', '))).join('')}</ul>
<h2>Sound recordings and music</h2><p>The following free CC0 works were trimmed, filtered and normalized for local playback. Source links and processed file hashes are in the <a href="/audio/world/manifest.json">audio manifest</a>.</p><ul>${audio.sources.map((a) => item(a.source, a.id === 'impact' ? 'Impact Sounds' : a.id === 'forest' ? 'Forest Ambience 2' : a.id === 'piano' ? 'Dark environment / Horror games' : 'Ancient caverns', a.author)).join('')}</ul>
<h2>Project artwork and sound</h2><p>Fairground architecture, signs, notices, weather effects, UI, fire/engine effects and synthesized creature voices were created for this project. The logo and token artwork were supplied by the project owner.</p>` +
  html.slice(end);
writeFileSync('public/assets/credits.html', html);
