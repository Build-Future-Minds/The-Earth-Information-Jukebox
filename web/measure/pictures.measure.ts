// Measures the picture scan on the real NASA pictures and writes docs/measurements/scan_pictures.*.
// The numbers come from the app's own rule running in Chromium (audit.ts); this file only starts
// it and writes the report. Run: npm run measure   (from web/)
import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Audit, ScanSummary } from './audit';

const repo = fileURLToPath(new URL('../..', import.meta.url));
const FRAMES = 'assets/frames/svs3912'; // git-ignored: NASA's frames are downloaded, not committed
const TIF = `${FRAMES}/flat_global_ecco2_2028x1024.23000.tif`;
const PNG = `${FRAMES}/flat_global_ecco2_2028x1024.23000.png`;
const BAR = `${FRAMES}/sst_ecco2_cbar.png`;
/** The labels printed under NASA's colour bar, read by eye on 15 Nov: 0 at the left end, 32 at the right. */
const BAR_RANGE_C: [number, number] = [0, 32];

/** Chromium cannot open a TIFF, so the uncompressed frame is copied to a PNG once (same pixels). */
function losslessPng(): string | null {
  if (existsSync(resolve(repo, PNG))) return PNG;
  if (!existsSync(resolve(repo, TIF))) return null;
  for (const python of ['python', 'python3']) {
    try {
      execFileSync(python, ['-c', 'import sys; from PIL import Image; Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2])', resolve(repo, TIF), resolve(repo, PNG)]);
      return PNG;
    } catch {
      // try the next name
    }
  }
  return null;
}

const git = (...args: string[]) => {
  try {
    return execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

const pct = (part: number, whole: number, digits = 1) => `${((100 * part) / whole).toFixed(digits)}%`;
const row = (cells: (string | number)[]) => `| ${cells.join(' | ')} |`;
const table = (head: string[], rows: (string | number)[][]) => [row(head), row(head.map(() => '---')), ...rows.map(row)].join('\n');
const funnel = (s: ScanSummary) => `${s.peaks} → ${s.afterSpacing} → ${s.chimes}`;

function report(a: Audit, meta: Record<string, string>): string {
  const out: string[] = [];
  out.push('# Picture scan: measurements on the NASA pictures', '');
  out.push('Written by `npm run measure` (in `web/`). Do not edit by hand: run it again.', '');
  out.push(`Measured ${meta.date} in ${meta.browser}, on commit ${meta.commit}${meta.dirty ? ' with uncommitted changes' : ''}.`);
  out.push('The rule is `web/src/audio/scanScore.ts`, run in the browser on the stills the app plays.');
  out.push(`Map sweep: ${a.lineGrid.columns} columns × ${a.lineGrid.bands} bands. Floor ${(a.floor * 255).toFixed(0)}/255.`);
  out.push(`A chime needs level ${a.chimeRule.minLevel}, ${a.chimeRule.minGap} columns from the next in its band, ${a.chimeRule.perColumn} per column.`, '');
  out.push('Each picture has its own settings and its own numbers. **Never compare a number in one row with another picture\'s row.**', '');

  out.push('## The map sweep, each picture', '');
  out.push(
    table(
      ['Picture', 'Measure', 'Cells that sound', 'Cells at full level', 'Largest cell mean', 'Peaks → spaced → played', 'Left out', 'Marimba', 'Bells'],
      a.pictures.flatMap((p) =>
        (['colour', 'brightness'] as const).map((m) => {
          const s = p.line[m];
          return [`${p.key} (SVS ${p.svs})`, m, pct(s.sounding, s.cells), pct(s.atFull, s.cells), s.largestCellMean.toFixed(3), funnel(s), s.peaks ? pct(s.peaks - s.chimes, s.peaks, 0) : 'none', s.warm, s.cool];
        }),
      ),
    ),
    '',
  );
  out.push('"Peaks → spaced → played": peaks at the chime level, then after the spacing rule, then after one per column.', '');

  out.push('## The radar, each approved circle (measured by colour)', '');
  out.push(
    table(
      ['Picture', 'Circle', 'Cells that sound', 'Largest cell mean', 'Peaks → spaced → played', 'Left out', 'Marimba', 'Bells'],
      a.pictures.flatMap((p) =>
        p.regions.map((r) => [p.key, r.name, pct(r.radar.sounding, r.radar.cells, 0), r.radar.largestCellMean.toFixed(2), funnel(r.radar), r.radar.peaks ? pct(r.radar.peaks - r.radar.chimes, r.radar.peaks, 0) : 'none', r.radar.warm, r.radar.cool]),
      ),
    ),
    '',
  );

  out.push('## The circles on the ground (derived from the map geometry, not measured)', '');
  out.push('A circle of r pixels spans r · 360 ÷ width degrees east–west and r · 180 ÷ height north–south.');
  out.push('On the ground the east–west span shrinks by cos(latitude). The last column is width ÷ height on the ground: 1 is round.', '');
  out.push(
    table(
      ['Picture', 'Circle', 'Centre', 'Radius east–west', 'Radius north–south', 'Ground width ÷ height'],
      a.pictures.flatMap((p) =>
        p.regions.map((r) => [
          p.key,
          r.name,
          `${Math.abs(r.lat).toFixed(1)}° ${r.lat < 0 ? 'S' : 'N'}, ${Math.abs(r.lon).toFixed(1)}° ${r.lon < 0 ? 'W' : 'E'}`,
          `${r.radiusDegrees.eastWest.toFixed(2)}°`,
          `${r.radiusDegrees.northSouth.toFixed(2)}°`,
          r.groundRatio.toFixed(3),
        ]),
      ),
    ),
    '',
  );

  const others = a.pictures.filter((p) => p.landSea);
  if (others.length) {
    out.push('## Do land and empty sea stay silent? (the other pictures)', '');
    out.push('Land here is the ocean still\'s grey land, used as an outline on the other whole-globe maps.');
    out.push('"Land cells" are 90% or more land by that outline; "sea cells" 10% or less.', '');
    out.push(
      table(
        ['Picture', 'Cells', 'How many', 'That sound', 'Mean level', 'Mean colour strength'],
        others.flatMap((p) =>
          (['sea', 'land'] as const).map((k) => {
            const g = p.landSea![k];
            return [p.key, k, g.cells, g.cells ? pct(g.sounding, g.cells, 0) : 'none', g.meanLevel.toFixed(3), g.meanStrength.toFixed(3)];
          }),
        ),
      ),
      '',
    );
    out.push(
      table(
        ['Picture', 'With land pixels left out: cells that sound', 'Cells with nothing read', 'Chimes', 'Marimba'],
        others.map((p) => [p.key, pct(p.landLeftOut!.sounding, p.line.colour.cells), p.landLeftOut!.nothingRead, p.landLeftOut!.chimes, p.landLeftOut!.warm]),
      ),
      '',
    );
  }

  if (a.latitude) {
    out.push('## Equal latitude bands on a stretched map (ocean)', '');
    out.push('"Change" is how far a level moves when each pixel is weighted by cos(latitude) inside its cell.', '');
    out.push(
      table(
        ['Band', 'Latitude', 'Share of the globe', 'Mean level', 'Mean change', 'Largest change'],
        a.latitude.bands.map((b) => [b.band, `${b.south}° to ${b.north}°`, pct(b.groundShare, 1, 2), b.meanLevel.toFixed(3), b.meanChange.toFixed(4), b.largestChange.toFixed(4)]),
      ),
      '',
    );
    out.push(`Chimes: ${a.latitude.chimes} as the rule stands, ${a.latitude.chimesWeighted} with the weighting.`, '');
  }

  out.push('## Which temperature switches the instrument? (ocean)', '');
  if (a.bar) {
    const [low, high] = BAR_RANGE_C;
    out.push(`NASA's colour bar, \`${BAR}\` (${a.bar.width}×${a.bar.height}), row ${a.bar.row}, coloured from x ${a.bar.from} to ${a.bar.to}.`);
    out.push(`"Red is the largest channel" is ${a.bar.warmAtColdEnd ? 'true' : 'false'} at the cold end and ${a.bar.warmAtWarmEnd ? 'true' : 'false'} at the warm end, and changes ${a.bar.switches.length} time${a.bar.switches.length === 1 ? '' : 's'}:`);
    for (const s of a.bar.switches) out.push(`- at ${(100 * s).toFixed(1)}% of the bar's length, which is ${(low + s * (high - low)).toFixed(1)} °C **if** the bar is linear between its end labels (${low} and ${high}; read by eye, not measured).`);
    out.push('', `Colour strength along the bar, every tenth, cold end first: ${a.bar.strength.map((s) => s.toFixed(2)).join(', ')}.`);
    out.push(`For the same share of a cell covered by lines, the cell mean is ${(a.bar.strength[10] / a.bar.strength[0]).toFixed(2)} times larger at the warm end than at the cold end.`, '');
  } else {
    out.push(`Not run: \`${BAR}\` is not on this machine.`, '');
  }

  out.push('## The JPEG the app reads against the uncompressed frame (ocean, frame 23000)', '');
  if (a.lossless && !('error' in a.lossless)) {
    const l = a.lossless;
    out.push(`Mean difference per colour channel: ${l.meanDifference.toFixed(2)} grey levels.`, '');
    out.push(
      table(
        ['In the uncompressed frame', 'Pixels', 'Share of the map', 'Of these, above the floor in the JPEG'],
        [
          ['Grey land (channels within 2, mean 30 to 80)', l.land, pct(l.land, l.pixels), pct(l.landOver, l.land, 2)],
          ['Black sea (largest channel 8 or less)', l.sea, pct(l.sea, l.pixels), pct(l.seaOver, l.sea, 2)],
        ],
      ),
      '',
    );
    out.push(
      table(
        ['Cells that are grey land or black sea', 'How many', 'That sound', 'Largest cell mean (floor 12/255)'],
        l.quietCells.map((q) => [q.least === 1 ? 'Every pixel of the cell' : `${(100 * q.least).toFixed(0)}% of the cell or more`, q.cells, q.sounding, `${(q.largestStrength * 255).toFixed(2)}/255`]),
      ),
      '',
    );
    out.push(
      table(
        ['', 'JPEG still', 'Uncompressed frame'],
        [
          ['Cells that sound', l.sounding.still, l.sounding.lossless],
          ['Chimes', l.chimes.still, l.chimes.lossless],
          ['Largest cell mean', a.pictures.find((p) => p.key === 'ocean')!.line.colour.largestCellMean.toFixed(3), l.largestCellMean.toFixed(3)],
        ],
      ),
      '',
    );
    out.push(`Levels differ by ${l.levels.meanChange.toFixed(4)} on average and ${l.levels.largestChange.toFixed(4)} at most.`);
    out.push(`${l.chimes.samePlaceAndInstrument} of the JPEG's ${l.chimes.still} chimes are at the same column and band, on the same instrument, as a chime of the uncompressed frame.`, '');
  } else {
    out.push(`Not run: ${a.lossless && 'error' in a.lossless ? a.lossless.error : `\`${TIF}\` is not on this machine (NASA's frames are downloaded, not committed)`}.`, '');
  }

  out.push('## Check on this tool', '');
  out.push('The tool repeats the rule\'s "which cell is this pixel in" to add weights and masks. Largest difference between its levels and the rule\'s, per picture (must be 0):');
  out.push(a.pictures.map((p) => `${p.key} ${p.selfCheck}`).join(', ') + '.', '');
  return out.join('\n');
}

test('measure the picture scan on the NASA pictures', async ({ page, browser }) => {
  const lossless = losslessPng();
  const options = {
    losslessUrl: lossless ? `/${lossless}` : null,
    barUrl: existsSync(resolve(repo, BAR)) ? `/${BAR}` : null,
  };
  await page.goto('/#play');
  await expect(page.getByRole('heading', { name: /Earth Sonata/ })).toBeVisible();
  // A string, so the import runs in the page exactly as written.
  const result = (await page.evaluate(`import('/measure/audit.ts').then((m) => m.runAudit(${JSON.stringify(options)}))`)) as Audit | { error: string };
  if ('error' in result) throw new Error(result.error);

  // The tool's copy of the cell rule must agree with the rule itself, or its extra numbers mean nothing.
  for (const p of result.pictures) expect(p.selfCheck, `${p.key}: the tool's cells differ from the rule's`).toBe(0);

  const meta = {
    date: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    browser: `Chromium ${browser.version()}`,
    commit: git('rev-parse', '--short', 'HEAD') || 'unknown',
    dirty: git('status', '--porcelain', '--', 'web/src', 'data') ? 'yes' : '',
  };
  const folder = resolve(repo, 'docs/measurements');
  mkdirSync(folder, { recursive: true });
  writeFileSync(resolve(folder, 'scan_pictures.json'), JSON.stringify({ meta, barRangeC: BAR_RANGE_C, ...result }, null, 1) + '\n');
  writeFileSync(resolve(folder, 'scan_pictures.md'), report(result, meta));
  console.log(report(result, meta));
});
