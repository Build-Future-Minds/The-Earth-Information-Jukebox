// Measures the picture scan on the real NASA pictures and writes docs/measurements/scan_pictures.*.
// The numbers come from the app's own rule running in Chromium (audit.ts); this file only starts
// it and writes the report. Run: npm run measure   (from web/)
import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Audit, ScanSummary } from './audit';

const repo = fileURLToPath(new URL('../..', import.meta.url));
const FRAMES = 'assets/frames/svs3912'; // git-ignored: NASA's frames are downloaded, not committed
const TIF = `${FRAMES}/flat_global_ecco2_2028x1024.23000.tif`;
const PNG = `${FRAMES}/flat_global_ecco2_2028x1024.23000.png`;
/** Frame 23000 as a JPEG with full colour resolution (4:4:4) at quality 90, made from the TIF. */
const JPG444 = `${FRAMES}/flat_global_ecco2_2028x1024.23000.q90_444.jpg`;
/** Frame 23000 as a lossless WebP, made from the TIF: another way to keep every pixel. */
const WEBP = `${FRAMES}/flat_global_ecco2_2028x1024.23000.lossless.webp`;
const STILL = 'data/preview.jpg';
const BAR = `${FRAMES}/sst_ecco2_cbar.png`;
/** The numbers printed under NASA's colour bar, left to right, read by eye. Where they sit is measured (audit.ts). */
const BAR_LABELS_C = [0, 10, 20, 32];
/** The end labels, for the old reading that takes the bar's coloured ends as 0 and 32. */
const BAR_RANGE_C: [number, number] = [BAR_LABELS_C[0], BAR_LABELS_C[BAR_LABELS_C.length - 1]];

/** Run a short Python program with Pillow; null when Python or Pillow is missing. */
function python(program: string, ...args: string[]): string | null {
  for (const name of ['python', 'python3']) {
    try {
      return execFileSync(name, ['-c', program, ...args], { encoding: 'utf8' });
    } catch {
      // try the next name
    }
  }
  return null;
}

/** Chromium cannot open a TIFF, so the uncompressed frame is copied to a PNG once (same pixels). */
function losslessPng(): string | null {
  if (existsSync(resolve(repo, PNG))) return PNG;
  if (!existsSync(resolve(repo, TIF))) return null;
  const done = python('import sys; from PIL import Image; Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2])', resolve(repo, TIF), resolve(repo, PNG));
  return done === null ? null : PNG;
}

/** The same frame as a 4:4:4 JPEG at quality 90 (Pillow's encoder, libjpeg's standard tables), made once. */
function jpeg444(): string | null {
  if (existsSync(resolve(repo, JPG444))) return JPG444;
  if (!existsSync(resolve(repo, TIF))) return null;
  const done = python('import sys; from PIL import Image; Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2], quality=90, subsampling=0)', resolve(repo, TIF), resolve(repo, JPG444));
  return done === null ? null : JPG444;
}

/** The same frame as a lossless WebP (every pixel kept), made once, if this Pillow can write WebP. */
function webpLossless(): string | null {
  if (existsSync(resolve(repo, WEBP))) return WEBP;
  if (!existsSync(resolve(repo, TIF))) return null;
  const done = python('import sys; from PIL import Image; Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2], lossless=True, method=6)', resolve(repo, TIF), resolve(repo, WEBP));
  return done === null ? null : WEBP;
}

/**
 * What a JPEG is, read from its header with Pillow: its colour resolution and, if its tables are
 * libjpeg's standard tables scaled for a quality setting, that setting. The standard tables are
 * those of the JPEG standard's Annex K, in row order; libjpeg scales them by 5000 ÷ q below 50 and
 * by 200 − 2q from 50 up.
 */
const JPEG_INFO = `
import sys, json, PIL
from PIL import Image, JpegImagePlugin, features
LUM = [16,11,10,16,24,40,51,61, 12,12,14,19,26,58,60,55, 14,13,16,24,40,57,69,56, 14,17,22,29,51,87,80,62,
       18,22,37,56,68,109,103,77, 24,35,55,64,81,104,113,92, 49,64,78,87,103,121,120,101, 72,92,95,98,112,100,103,99]
CHR = [17,18,24,47,99,99,99,99, 18,21,26,66,99,99,99,99, 24,26,56,99,99,99,99,99, 47,66,99,99,99,99,99,99] + [99] * 32
def scaled(base, q):
    s = 5000 // q if q < 50 else 200 - 2 * q
    return [min(255, max(1, (v * s + 50) // 100)) for v in base]
files = []
for path in sys.argv[1:]:
    im = Image.open(path)
    t = [list(im.quantization[k]) for k in sorted(im.quantization)]
    q = [n for n in range(1, 101) if len(t) >= 2 and t[0] == scaled(LUM, n) and t[1] == scaled(CHR, n)]
    files.append({"sampling": ["4:4:4", "4:2:2", "4:2:0"][JpegImagePlugin.get_sampling(im)], "quality": q[0] if q else None})
print(json.dumps({"pillow": PIL.__version__, "libjpeg": features.version("libjpeg_turbo"), "files": files}))
`;
function jpegInfo(paths: string[]): { pillow: string; libjpeg: string | null; files: { sampling: string; quality: number | null }[] } | null {
  const out = python(JPEG_INFO, ...paths.map((p) => resolve(repo, p)));
  return out === null ? null : JSON.parse(out);
}

const megabytes = (path: string) => `${(statSync(resolve(repo, path)).size / 1e6).toFixed(2)} MB`;

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

interface Files {
  jpeg: ReturnType<typeof jpegInfo>;
  /** For each still compared (by the name audit.ts gives it): a column heading and what the file is. */
  stills: Record<string, { label: string; describe: string }>;
}

function report(a: Audit, meta: Record<string, string>, files: Files): string {
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
    const b = a.bar;
    out.push(`NASA's colour bar, \`${BAR}\` (${b.width}×${b.height}), read as the file stores it. The file carries a colour profile; the browser's own drawing of it differs from the stored numbers by ${b.decodeDifference} grey level${b.decodeDifference === 1 ? '' : 's'} at most.`);
    out.push(`The bar is rows ${b.rows[0]} to ${b.rows[1]} (they differ by ${b.rowDifference} grey level${b.rowDifference === 1 ? '' : 's'} at most), coloured from x ${b.from} to ${b.to}.`);
    out.push(`"Red is the largest channel" is ${b.warmAtColdEnd ? 'true' : 'false'} at the cold end and ${b.warmAtWarmEnd ? 'true' : 'false'} at the warm end, and changes ${b.switches.length} time${b.switches.length === 1 ? '' : 's'}:`);
    b.switches.forEach((s, i) => out.push(`- between x ${b.switchPixels[i] - 1} and ${b.switchPixels[i]}, at ${(100 * s).toFixed(1)}% of the coloured length.`));
    out.push('');
    out.push('### Where the printed labels sit', '');
    const l = b.labels;
    if ('error' in l) {
      out.push(`Not measured: ${l.error}.`, '');
    } else {
      out.push(`The labels are rows ${l.rows[0]} to ${l.rows[1]}. A label's place is the centre of its ink (each pixel weighted by its ${l.translucent ? 'opacity' : 'darkness'}); the centre of its box is given too.`);
      out.push(`A straight line x = a + b · T is fitted to the four ink centres by least squares: a = ${l.byInk.a.toFixed(2)}, b = ${l.byInk.b.toFixed(4)} pixels per °C.`, '');
      out.push(
        table(
          ['Label', 'Pixels', 'Centre of its ink', 'Centre of its box', 'Off the line (ink)', 'Off the line (box)'],
          l.labels.map((x, i) => [
            `${x.value} °C`,
            `${x.from} to ${x.to}`,
            x.centre.toFixed(2),
            x.boxCentre.toFixed(1),
            `${l.byInk.residuals[i] >= 0 ? '+' : ''}${l.byInk.residuals[i].toFixed(2)} px (${(l.byInk.residuals[i] / l.byInk.b).toFixed(3)} °C)`,
            `${l.byBox.residuals[i] >= 0 ? '+' : ''}${l.byBox.residuals[i].toFixed(2)} px`,
          ]),
        ),
        '',
      );
      out.push(`Largest distance of a label from the line: ${l.byInk.largest.toFixed(2)} px by ink, ${l.byBox.largest.toFixed(2)} px by box, which is ${(l.byInk.largest / l.byInk.b).toFixed(3)} and ${(l.byBox.largest / l.byBox.b).toFixed(3)} °C.`);
      out.push(`The line puts ${low} °C at x ${l.byInk.a.toFixed(2)} and ${high} °C at x ${(l.byInk.a + high * l.byInk.b).toFixed(2)}; the coloured part of the bar runs from x ${b.from} to ${b.to}.`, '');
      // The switch is the edge between the last pixel of one answer and the first of the other.
      const at = (x: number, fit: { a: number; b: number }) => (x - fit.a) / fit.b;
      const between = (x: number) => {
        const k = l.labels.findIndex((q, i) => i + 1 < l.labels.length && q.centre <= x && x <= l.labels[i + 1].centre);
        if (k < 0) return null;
        const [p, q] = [l.labels[k], l.labels[k + 1]];
        return { from: p.value, to: q.value, t: p.value + ((q.value - p.value) * (x - p.centre)) / (q.centre - p.centre) };
      };
      b.switchPixels.forEach((x, i) => {
        const edge = x - 0.5;
        const pair = between(edge);
        out.push(`The switch (edge at x ${edge.toFixed(1)}) is at:`);
        out.push(`- ${at(edge, l.byInk).toFixed(2)} °C by the line through the four ink centres (${at(edge, l.byBox).toFixed(2)} °C through the box centres);`);
        if (pair) out.push(`- ${pair.t.toFixed(2)} °C between the labels ${pair.from} and ${pair.to} alone;`);
        out.push(`- ${(low + b.switches[i] * (high - low)).toFixed(2)} °C by the reading used until now (the coloured ends taken as ${low} and ${high}).`, '');
      });
    }
    out.push(`Colour strength of single pixels of the bar, every tenth of its length, cold end first: ${b.strength.map((s) => s.toFixed(2)).join(', ')}.`);
    out.push(`The two end pixels differ by ${(b.strength[10] / b.strength[0]).toFixed(2)} times. Single pixels are not the frame's colours: the next section measures those.`, '');
  } else {
    out.push(`Not run: \`${BAR}\` is not on this machine.`, '');
  }

  out.push('## Do the frame\'s lines use the bar\'s colours? (ocean, uncompressed frame 23000)', '');
  if (a.palette) {
    const p = a.palette;
    const t = p.toleranceDegrees;
    out.push(`Every pixel of the uncompressed frame whose spread (largest − smallest channel) is over 12, the scan's floor: ${p.all.pixels} pixels in ${p.colours} colours.`);
    out.push('For each, the bar colour with the nearest hue. Hue does not change when a line is drawn faintly over black (all three channels scaled by the same number), and neither does the angle between two colours seen as (red, green, blue) arrows.');
    out.push(`Along the bar the hue runs from ${p.bar.hueAtColdEnd.toFixed(1)}° at the cold end to ${p.bar.hueAtWarmEnd.toFixed(1)}° at the warm end: ${p.bar.stepsDown} steps down, ${p.bar.stepsUp} up, ${p.bar.reversals.length ? `turning back at ${p.bar.reversals.map((r) => `${(100 * r).toFixed(1)}%`).join(', ')} of the bar` : 'never turning back'}.`);
    out.push(`Rounding to whole grey levels moves a pixel's hue by up to 60° ÷ spread for each level, so faint pixels cannot match closely. The table gives the share within ${t}°, and within ${t}° or two grey levels' worth (120° ÷ spread), whichever is larger.`, '');
    const rows = [...p.groups.map((g) => ({ label: `${g.range[0]} to ${g.range[1]}`, ...g })), { label: 'All', ...p.all }];
    out.push(
      table(
        ['Spread (grey levels)', 'Pixels', `Hue within ${t}°`, `Within ${t}° or two levels`, `Within ${t}° by colour angle`, 'Hue gap that half / 90% / 99% are within', 'Same instrument as the nearest bar colour'],
        rows.map((g) => [g.label, g.pixels, pct(g.within, 1), pct(g.adaptive, 1), pct(g.angleWithin, 1), `${g.p50.toFixed(2)}° / ${g.p90.toFixed(2)}° / ${g.p99.toFixed(2)}°`, pct(g.agree, 1, 2)]),
      ),
      '',
    );
    out.push(`Neighbouring bar colours are at most ${p.largestHueStep.toFixed(2)}° apart in hue, so any hue inside the bar's range is within ${(p.largestHueStep / 2).toFixed(2)}° of a bar colour. A hue match therefore shows two things only: the frame uses no hue outside the bar's range, and each pixel's hue is on a known side of the switch. It does not show that the frame's colours are the bar's colours. The whole colour (the angle between the arrows) is within ${t}° for ${pct(p.all.angleWithin, 1)} of pixels.`, '');
    out.push(`Pixels further than ${t}° from every bar hue: ${p.all.outside} of ${p.all.pixels}; further than ${t}° or two grey levels: ${p.all.outsideAdaptive}.`);
    out.push(`Weighted by colour strength, as the scan weighs them: ${pct(p.all.withinByMass, 1)} within ${t}°, ${pct(p.all.adaptiveByMass, 1)} within ${t}° or two levels, and ${pct(p.all.agreeByMass, 1, 2)} on the same side of the instrument switch as the nearest bar colour.`);
    out.push(`Of all the colour, ${pct(p.warmShare, 1)} is warm by the pixel rule, and ${pct(p.pastSwitchShare, 1)} is nearest to a bar colour past the switch.`);
    const where = p.disagreeAt.map((s, k) => ({ s, k })).filter((d) => d.s >= 0.0005);
    out.push(where.length ? `Colour on the other side of the switch from its nearest bar colour, by where that bar colour is: ${where.map((d) => `${5 * d.k}–${5 * d.k + 5}% of the bar, ${pct(d.s, 1, 2)} of all colour`).join('; ')}.` : 'No colour of note sits on the other side of the switch from its nearest bar colour (none of 0.05% or more in any twentieth of the bar).');
    out.push('');
    out.push('How strong and how bright the frame\'s colours are, by the tenth of the bar their hue belongs to. "Strength" is the spread ÷ 255, the scan\'s colour strength. "Saturation" is spread ÷ largest channel, which a line drawn faintly over black keeps.', '');
    out.push(
      table(
        ['Tenth of the bar (cold to warm)', 'Frame pixels', 'Bar: strength (mean of the tenth)', 'Frame: strength 99% are below', 'Frame: strongest', 'Frame ÷ bar saturation (middle pixel)', 'Largest brightness ÷ bar colour\'s'],
        p.strengthByTenth.map((s, k) => [`${10 * k}–${10 * k + 10}%`, s.pixels, s.bar.toFixed(3), s.frame99.toFixed(3), s.frameLargest.toFixed(3), s.saturationRatio.toFixed(2), s.brightestAgainstBar.toFixed(2)]),
      ),
      '',
    );
    const [cold, warm] = [p.strengthByTenth[0], p.strengthByTenth[9]];
    out.push(`Warmest tenth ÷ coldest tenth: ${(warm.bar / cold.bar).toFixed(2)} on the bar (tenth means), ${(warm.frameLargest / cold.frameLargest).toFixed(2)} for the frame's strongest pixels, ${(warm.frame99 / cold.frame99).toFixed(2)} for the strength 99% are below.`, '');
    if (p.offBar.length) {
      out.push(`The colour furthest from the bar (outside ${t}° or two levels), by 10° of hue, largest first:`, '');
      out.push(table(['Hue', 'Share of all colour', 'Share of the off-bar colour', 'Pixels', 'Most common colour (R, G, B)'], p.offBar.map((o) => [`${o.hue}° to ${o.hue + 10}°`, pct(o.share, 1, 2), pct(o.ofOffBar, 1), o.pixels, o.example.join(', ')])), '');
    }
  } else {
    out.push(`Not run: it needs both \`${TIF}\` and \`${BAR}\`.`, '');
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

  out.push('## Which still should the scan read? (ocean, frame 23000)', '');
  if (a.stills) {
    const s = a.stills;
    const file = (name: string) => files.stills[name];
    out.push('Each copy is read the way the app reads its still, and scanned by the app\'s rule. "Same place" is the same column and band as a chime of the uncompressed frame; "and instrument" also the same instrument.');
    out.push(`The 4:4:4 JPEG (quality=90, subsampling=0) and the lossless WebP (lossless=True, method=6) are made from the TIF with Pillow ${files.jpeg?.pillow ?? '(not found)'} (libjpeg-turbo ${files.jpeg?.libjpeg ?? 'unknown'}). They are git-ignored, beside the frame. The globe land rule is the globe page's: flat grey pixels (\`geo.ts\`, \`landShare\`), on the still drawn at the frame's size.`, '');
    const head = ['', ...s.map((c) => file(c.name)?.label ?? c.name)];
    const rows: (string | number)[][] = [
      ['File', ...s.map((c) => file(c.name)?.describe ?? '')],
      ['Largest difference from the uncompressed frame, any pixel and channel (grey levels)', ...s.map((c) => c.largestPixelDifference ?? 'other size')],
      ['Map sweep: cells that sound', ...s.map((c) => `${c.line.sounding} (${pct(c.line.sounding, c.line.cells)})`)],
      ['Map sweep: chimes (marimba, bells)', ...s.map((c) => `${c.line.chimes} (${c.line.warm}, ${c.line.cool})`)],
      ['Of these, same place and instrument as the uncompressed frame', ...s.map((c) => c.line.samePlaceAndInstrument)],
      ['Of these, same place, either instrument', ...s.map((c) => c.line.samePlace)],
      ['Level change against the uncompressed frame: mean, largest', ...s.map((c) => `${c.line.meanLevelChange.toFixed(4)}, ${c.line.largestLevelChange.toFixed(4)}`)],
      ...s[0].regions.flatMap((r, i) => [
        [`Radar, ${r.name}: cells that sound`, ...s.map((c) => `${c.regions[i].radar.sounding} of ${c.regions[i].radar.cells}`)],
        [`Radar, ${r.name}: chimes (marimba, bells)`, ...s.map((c) => `${c.regions[i].radar.chimes} (${c.regions[i].radar.warm}, ${c.regions[i].radar.cool})`)],
        [`Radar, ${r.name}: same place and instrument`, ...s.map((c) => c.regions[i].radar.samePlaceAndInstrument)],
        [`Globe land rule, ${r.name}: flat grey share of the circle`, ...s.map((c) => pct(c.regions[i].land, 1, 2))],
      ]),
    ];
    out.push(table(head, rows), '');
  } else {
    out.push(`Not run: it needs \`${TIF}\` (NASA's frames are downloaded, not committed) and Python with Pillow.`, '');
  }

  out.push('## Check on this tool', '');
  out.push('The tool repeats the rule\'s "which cell is this pixel in" to add weights and masks. Largest difference between its levels and the rule\'s, per picture (must be 0):');
  out.push(a.pictures.map((p) => `${p.key} ${p.selfCheck}`).join(', ') + '.', '');
  return out.join('\n');
}

test('measure the picture scan on the NASA pictures', async ({ page, browser }) => {
  const lossless = losslessPng();
  const jpg444 = lossless ? jpeg444() : null;
  const webp = lossless ? webpLossless() : null;
  const options = {
    losslessUrl: lossless ? `/${lossless}` : null,
    barUrl: existsSync(resolve(repo, BAR)) ? `/${BAR}` : null,
    barLabels: BAR_LABELS_C,
    stills: [...(jpg444 ? [{ name: 'q90_444', url: `/${jpg444}` }] : []), ...(webp ? [{ name: 'webp', url: `/${webp}` }] : [])],
  };
  // What each JPEG is, from its header: colour resolution and quality setting.
  const jpegs = [STILL, ...(jpg444 ? [jpg444] : [])];
  const jpeg = jpegInfo(jpegs);
  const kind = (path: string) => {
    const info = jpeg?.files[jpegs.indexOf(path)];
    return info ? `JPEG ${info.sampling}, ${info.quality ? `quality ${info.quality} (libjpeg's standard tables)` : 'not libjpeg\'s standard tables'}` : 'JPEG';
  };
  const files: Files = {
    jpeg,
    stills: {
      app: { label: `The app's still (\`${STILL}\`)`, describe: `${megabytes(STILL)}, ${kind(STILL)}` },
      q90_444: { label: 'JPEG 4:4:4, quality 90', describe: jpg444 ? `${megabytes(jpg444)}, ${kind(jpg444)}` : '' },
      webp: { label: 'WebP, lossless', describe: webp ? `${megabytes(webp)}, WebP lossless (method 6)` : '' },
      uncompressed: { label: 'Uncompressed frame', describe: lossless ? `${megabytes(lossless)}, PNG${existsSync(resolve(repo, TIF)) ? ` from the TIF (${megabytes(TIF)})` : ''}` : '' },
    },
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
  // The bar's colours are long and only feed the check above; the report gives what they show.
  const { bar, ...rest } = result;
  const json = { meta, barLabelsC: BAR_LABELS_C, files, ...rest, bar: bar && { ...bar, colours: `${bar.colours.length} colours, x ${bar.from} to ${bar.to}` } };
  writeFileSync(resolve(folder, 'scan_pictures.json'), JSON.stringify(json, null, 1) + '\n');
  writeFileSync(resolve(folder, 'scan_pictures.md'), report(result, meta, files));
  console.log(report(result, meta, files));
});
