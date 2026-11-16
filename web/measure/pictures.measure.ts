// Measures the picture scan on the real NASA pictures and writes docs/measurements/scan_pictures.*.
// The numbers come from the app's own rule running in Chromium (audit.ts); this file only starts
// it and writes the report. Run: npm run measure   (from web/)
//
// The report has one section per picture. No table in it holds two pictures: each picture is drawn
// and measured with its own settings, and its numbers are never compared with another's.
import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Audit, BarFile, FrameFile, PictureAudit, PictureFiles, ScanSummary } from './audit';

const repo = fileURLToPath(new URL('../..', import.meta.url));
const have = (file: string) => existsSync(resolve(repo, file));
const url = (file: string) => `/${file}`; // the dev server serves assets/frames/ (vite.config.ts)

// ---------- NASA's files, which are downloaded and git-ignored (bash tools/download_frames.sh) ----------

const OCEAN_TIF = 'assets/frames/svs3912/flat_global_ecco2_2028x1024.23000.tif';
const OCEAN_PNG = 'assets/frames/svs3912/flat_global_ecco2_2028x1024.23000.png';
/** Frame 23000 as a JPEG with full colour resolution (4:4:4) at quality 90, made from the TIF. */
const JPG444 = 'assets/frames/svs3912/flat_global_ecco2_2028x1024.23000.q90_444.jpg';
/** Frame 23000 as a lossless WebP, made from the TIF: another way to keep every pixel. */
const WEBP = 'assets/frames/svs3912/flat_global_ecco2_2028x1024.23000.lossless.webp';
/** The ocean still the app reads. */
const STILL = 'data/preview.jpg';
/** The numbers printed under NASA's colour bar for the ocean, left to right, read by eye on 15 Nov. Where they sit is measured (audit.ts). */
const BAR_LABELS_C = [0, 10, 20, 32];

/** Chromium cannot open a TIFF, so the uncompressed ocean frame is copied to a PNG once (same pixels). */
function oceanPng(): string | null {
  if (have(OCEAN_PNG)) return OCEAN_PNG;
  if (!have(OCEAN_TIF)) return null;
  const done = python('import sys; from PIL import Image; Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2])', resolve(repo, OCEAN_TIF), resolve(repo, OCEAN_PNG));
  return done === null ? null : OCEAN_PNG;
}

/** The 30 rain frames, numbered 0–29 by the download script, with their times. */
function rainFrames(): FrameFile[] {
  const dates = 'assets/frames/svs4285/imerg_dates.txt';
  if (!have(dates)) return [];
  return readFileSync(resolve(repo, dates), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length === 2 && /^\d+$/.test(parts[0]))
    .map(([n, time]) => ({ file: `assets/frames/svs4285/imergert_composite.${n}.png`, frame: `frame ${n}`, time }))
    .filter((f) => have(f.file))
    .map((f) => ({ ...f, url: url(f.file) }));
}

const bar = (b: Omit<BarFile, 'url'>): BarFile[] => (have(b.file) ? [{ ...b, url: url(b.file) }] : []);

/**
 * What each picture's files are. Read by eye on 15 Nov, and typed here: the numbers printed under the
 * ocean bar (0, 10, 20 and 32 °C; where they sit is measured), and the names of the aerosol bar's four
 * swatches, left to right.
 */
function files(copies: { jpg444: string | null; webp: string | null }): Record<string, PictureFiles> {
  const ocean = oceanPng();
  const aerosolFrame = 'assets/frames/svs5669/Aerosols_2025-08-19T20_00_00_3840x2160.png';
  return {
    ocean: {
      frames: ocean ? [{ file: ocean, url: url(ocean), frame: 'frame 23000', time: '2007-03-25T12:00Z' }] : [],
      bars: bar({ file: 'assets/frames/svs3912/sst_ecco2_cbar.png', name: 'sea surface temperature', coloured: 100, stepped: false, ends: [BAR_LABELS_C[0], BAR_LABELS_C[BAR_LABELS_C.length - 1]], unit: '°C', labels: BAR_LABELS_C }),
      // Other copies of frame 23000, to compare with the uncompressed frame (made from the TIF, git-ignored).
      stills: [...(copies.jpg444 ? [{ name: 'q90_444', url: url(copies.jpg444) }] : []), ...(copies.webp ? [{ name: 'webp', url: url(copies.webp) }] : [])],
    },
    aerosols: {
      frames: have(aerosolFrame) ? [{ file: aerosolFrame, url: url(aerosolFrame), frame: 'full-size still', time: '2025-08-19T20:00Z' }] : [],
      bars: bar({ file: 'assets/frames/svs5669/Aerosols_cbar.png', name: 'aerosol type', coloured: 20, stepped: true, names: ['black carbon', 'dust', 'sea salt', 'sulfate'] }),
    },
    imerg: {
      frames: rainFrames(),
      bars: [
        ...bar({ file: 'assets/frames/svs4285/rainbarwhite2.png', name: 'rain', coloured: 60, stepped: true }),
        ...bar({ file: 'assets/frames/svs4285/snowbarwhite2.png', name: 'snow', coloured: 60, stepped: true }),
      ],
    },
  };
}

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

/** The same frame as a 4:4:4 JPEG at quality 90 (Pillow's encoder, libjpeg's standard tables), made once. */
function jpeg444(): string | null {
  if (existsSync(resolve(repo, JPG444))) return JPG444;
  if (!existsSync(resolve(repo, OCEAN_TIF))) return null;
  const done = python('import sys; from PIL import Image; Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2], quality=90, subsampling=0)', resolve(repo, OCEAN_TIF), resolve(repo, JPG444));
  return done === null ? null : JPG444;
}

/** The same frame as a lossless WebP (every pixel kept), made once, if this Pillow can write WebP. */
function webpLossless(): string | null {
  if (existsSync(resolve(repo, WEBP))) return WEBP;
  if (!existsSync(resolve(repo, OCEAN_TIF))) return null;
  const done = python('import sys; from PIL import Image; Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2], lossless=True, method=6)', resolve(repo, OCEAN_TIF), resolve(repo, WEBP));
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

// ---------- The report ----------

const git = (...args: string[]) => {
  try {
    return execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

const pct = (part: number, whole: number, digits = 1) => (whole ? `${((100 * part) / whole).toFixed(digits)}%` : 'none');
const row = (cells: (string | number)[]) => `| ${cells.join(' | ')} |`;
const table = (head: string[], rows: (string | number)[][]) => [row(head), row(head.map(() => '---')), ...rows.map(row)].join('\n');
const funnel = (s: ScanSummary) => `${s.peaks} → ${s.afterSpacing} → ${s.chimes}`;
const leftOut = (s: ScanSummary) => (s.peaks ? pct(s.peaks - s.chimes, s.peaks, 0) : 'none');
const g255 = (x: number) => `${(x * 255).toFixed(2).replace(/\.00$/, '')}/255`;
const rgb = (c: number[]) => `(${c.map((v) => Math.round(v)).join(', ')})`;
const NAMES: Record<string, string> = { ocean: 'Ocean', aerosols: 'Aerosols', imerg: 'Rain' };

/** Instrument columns, named as in the default scan sound (Ocean choir). */
const instrumentHeads = (blue: boolean) => ['Marimba (warm)', 'Bells (cool)', ...(blue ? ['Harp (blue)'] : [])];
const instrumentCells = (s: ScanSummary, blue: boolean) => [s.warm, s.cool, ...(blue ? [s.blue] : [])];

function scanRow(name: string, s: ScanSummary, blue: boolean): (string | number)[] {
  return [name, pct(s.sounding, s.cells), s.noData, pct(s.atFull, s.cells), s.largestCellMean.toFixed(3), funnel(s), leftOut(s), ...instrumentCells(s, blue)];
}

function section(p: PictureAudit, a: Audit, stillFiles: StillFiles): string[] {
  const out: string[] = [];
  const set = p.settings;
  out.push(`## ${NAMES[p.key] ?? p.key} (SVS ${p.svs})`, '');
  out.push(`${p.title}. The still the app plays is ${p.still.width} × ${p.still.height}; NASA's frames are ${p.frames.width} × ${p.frames.height}.`, '');

  out.push('### Settings', '');
  out.push(
    p.hasRule
      ? 'Measured with this picture\'s rule in `web/src/data/sources.ts`. The last column is what the procedure gives (see the top of this page).'
      : '**This picture has no scan rule yet**, so it was measured with what the procedure gives. The app does not play it.',
    '',
  );
  out.push(
    table(
      ['Setting', 'Measured with', 'The procedure gives'],
      [
        ['Measure', set.measure, p.procedure.measure],
        ['Floor', g255(set.floor), g255(p.procedure.floor)],
        ['Full level, map sweep', set.full.line, p.procedure.full.line],
        ['Full level, radar', set.full.radar, p.procedure.full.radar],
        ['Mask (pixels never read)', set.mask ? `\`${set.mask}\`` : 'none', p.procedure.mask ? `\`${p.procedure.mask}\`` : 'none'],
        ['A third instrument for the blue side', set.blueClass ? 'yes' : 'no', '(chosen from the legend, not by the procedure)'],
      ],
    ),
    '',
  );

  out.push('### Which still', '');
  const from = p.still.from;
  if (!from) {
    out.push('Not run: NASA\'s frames for this picture are not on this machine.', '');
  } else if (from.candidates.length === 1) {
    out.push(`Compared with NASA's ${from.best.frame} (\`${from.best.file}\`${from.best.time ? `, ${from.best.time}` : ''}), drawn at the still's size by the browser: mean difference ${from.best.meanDifference.toFixed(2)} grey levels a channel.`, '');
  } else {
    out.push(`Each of NASA's ${from.candidates.length} frames was drawn at the still's size by the browser and compared with the still, pixel by pixel. The still is closest to **${from.best.frame}** (${from.best.time}): mean difference ${from.best.meanDifference.toFixed(2)} grey levels a channel. The next closest, ${from.runnerUp!.frame}, differs by ${from.runnerUp!.meanDifference.toFixed(2)}.`, '');
    out.push(table(['Frame', 'Time', 'Mean difference'], from.candidates.slice(0, 5).map((c) => [c.frame, c.time ?? '', c.meanDifference.toFixed(2)])), '');
    out.push(`The five closest of ${from.candidates.length}.`, '');
  }

  out.push('### What "nothing drawn" looks like, and the floor', '');
  out.push(`The commonest colour among the pixels the scan reads is RGB ${rgb(p.background.rgb)}, colour strength ${p.background.spread.toFixed(1)} grey levels. ${pct(p.background.nearShare, 1)} of the pixels read are within 12 grey levels of it on every channel.`, '');
  out.push(
    table(
      ['Cells that are this colour', 'How many', 'That sound', 'Largest cell mean'],
      p.quiet.map((q) => [q.least === 1 ? 'Every pixel read' : `${(100 * q.least).toFixed(0)}% of the pixels read or more`, q.cells, q.sounding, g255(q.largestMean)]),
    ),
    '',
  );
  for (const q of p.quiet) {
    for (const c of q.soundingCells) {
      out.push(
        `- A cell that is ${(100 * q.least).toFixed(0)}% or more this colour and sounds: column ${c.column}, band ${c.band}; mean ${g255(c.mean)}, level ${c.level.toFixed(3)}; ` +
          `${pct(c.nearCommonest, 1)} of its pixels are this colour${c.legendColour !== null ? `, ${pct(c.legendColour, 1)} are drawn in a colour of NASA's bar above the floor` : ''}.`,
      );
    }
  }
  if (p.quiet.some((q) => q.soundingCells.length)) out.push('');
  out.push(
    table(
      ['Cells where some pixels are not this colour', 'How many', `Sound at this floor (${g255(set.floor)})`, 'Sound at 12/255'],
      p.drawn.map((d) => [`${(100 * d.least).toFixed(0)}% or more`, d.cells, d.sounding, d.soundingAtOceanFloor]),
    ),
    '',
  );
  if (p.legendDrawn) {
    out.push(
      table(
        ['Cells where some pixels are drawn in a colour of NASA\'s bar, above the floor', 'How many', `Sound at this floor (${g255(set.floor)})`, 'Sound at 12/255'],
        p.legendDrawn.map((d) => [`${(100 * d.least).toFixed(0)}% or more`, d.cells, d.sounding, d.soundingAtOceanFloor]),
      ),
      '',
    );
  }
  if (p.greyLand) {
    out.push(`Grey land by this picture's land rule (mean ${p.greyLand.rule[0]} to ${p.greyLand.rule[1]}, channels within ${p.greyLand.rule[2]}): ${p.greyLand.cells} cells are 90% or more grey land, ${p.greyLand.sounding} of them sound, largest cell mean ${g255(p.greyLand.largestMean)}.`, '');
  }

  out.push('### Pixels never read', '');
  out.push(p.mask ? `\`${p.mask.file}\`: ${pct(p.mask.share, 1, 2)} of the still's pixels are never read. ${p.mask.nothingRead} of the map sweep's ${p.line.colour.cells} cells read nothing (no data).` : 'None: every pixel is read.', '');

  out.push('### The map sweep', '');
  out.push(
    table(
      ['', 'Cells that sound', 'No data', 'At full level', 'Largest cell mean', 'Peaks → spaced → played', 'Left out', ...instrumentHeads(set.blueClass)],
      [
        scanRow(`${set.measure}, as measured with`, p.line.colour, set.blueClass),
        scanRow('brightness, same floor and full level (for the record)', p.line.brightness, set.blueClass),
        scanRow('colour at the ocean\'s floor, 12/255 (for the record)', p.line.atOceanFloor, set.blueClass),
      ],
    ),
    '',
  );
  out.push('"Peaks → spaced → played": peaks at the chime level, then after the spacing rule, then after one per column.', '');

  out.push('### The radar, each circle', '');
  out.push(
    table(
      ['Circle', 'Cells that sound', 'No data', 'At full level', 'Largest cell mean', 'Peaks → spaced → played', 'Left out', ...instrumentHeads(set.blueClass)],
      p.regions.flatMap((r) =>
        [
          [r.name, r.radar],
          [`${r.name}, at the ocean's floor 12/255 (for the record)`, r.radarAtOceanFloor],
        ].map(([name, s]) => {
          const x = s as ScanSummary;
          return [name as string, pct(x.sounding, x.cells, 0), x.noData, pct(x.atFull, x.cells), x.largestCellMean.toFixed(2), funnel(x), leftOut(x), ...instrumentCells(x, set.blueClass)];
        }),
      ),
    ),
    '',
  );

  out.push('### What each instrument means in this picture', '');
  if (!p.classes.length) {
    out.push('Not run: NASA\'s colour bar for this picture is not on this machine.', '');
  } else {
    out.push(`Each struck note is given the colour of NASA's bar that most of its cell's pixels are nearest to. "Nearest" compares the direction of a colour only (the colour minus its smallest channel), so a colour faded into black or grey keeps its direction. A pixel within about 26° of a bar colour (cos ${a.matchCos}) votes for it, weighted by its colour strength; pixels at or below the floor do not vote.`, '');
    const scans = [{ name: 'Map sweep', colours: p.lineColours }, ...p.regions.map((r) => ({ name: r.name, colours: r.colours }))];
    for (const s of scans) {
      const names = [...new Set([...Object.keys(s.colours.warm), ...Object.keys(s.colours.cool), ...Object.keys(s.colours.blue)])];
      out.push(`**${s.name}**`, '');
      out.push(
        names.length
          ? table(['Colour of the bar', ...instrumentHeads(set.blueClass)], names.map((n) => [n, s.colours.warm[n] ?? 0, s.colours.cool[n] ?? 0, ...(set.blueClass ? [s.colours.blue[n] ?? 0] : [])]))
          : 'No struck notes.',
        '',
      );
    }
    out.push(`Pixels read above the floor, by the colour of the bar they are nearest to: ${Object.entries(p.pixelColours).map(([n, share]) => `${n} ${pct(share, 1)}`).join(', ')}.`, '');
  }

  out.push('### NASA\'s colour bar' + (p.bars.length > 1 ? 's' : ''), '');
  if (!p.bars.length) out.push('Not run: no colour bar for this picture is on this machine.', '');
  for (const b of p.bars) {
    if (b.labels) {
      // A bar given its printed labels is read as the file stores it, and where the labels sit is measured.
      const [low, high] = b.ends ?? [0, 0];
      out.push(`NASA's colour bar, \`${b.file}\` (${b.width}×${b.height}), read as the file stores it. The file carries a colour profile; the browser's own drawing of it differs from the stored numbers by ${b.decodeDifference} grey level${b.decodeDifference === 1 ? '' : 's'} at most.`);
      out.push(`The bar is rows ${b.rows[0]} to ${b.rows[1]} (they differ by ${b.rowDifference} grey level${b.rowDifference === 1 ? '' : 's'} at most), coloured from x ${b.from} to ${b.to}.`);
      out.push(`"Red is the largest channel" is ${b.warmAtStart ? 'true' : 'false'} at the cold end and ${b.warmAtEnd ? 'true' : 'false'} at the warm end, and changes ${b.switches.length} time${b.switches.length === 1 ? '' : 's'}:`);
      b.switches.forEach((s, i) => out.push(`- between x ${b.switchPixels[i] - 1} and ${b.switchPixels[i]}, at ${(100 * s.at).toFixed(1)}% of the coloured length.`));
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
          out.push(`- ${(low + b.switches[i].at * (high - low)).toFixed(2)} °C by the reading used until now (the coloured ends taken as ${low} and ${high}).`, '');
        });
      }
      out.push(`Colour strength of single pixels of the bar, every tenth of its length, cold end first: ${b.strength.map((s) => s.toFixed(2)).join(', ')}.`);
      out.push(`The two end pixels differ by ${(b.strength[10] / b.strength[0]).toFixed(2)} times. Single pixels are not the frame's colours: the next section measures those.`, '');
      continue;
    }
    out.push(`\`${b.file}\` (${b.width}×${b.height}), the ${b.name} bar: read along row ${b.row}, coloured (channels spread more than ${b.colouredThreshold}) from x ${b.from} to ${b.to}${b.colouredPixels < b.to - b.from + 1 ? `, ${b.colouredPixels} coloured pixels in that span` : ''}.`);
    out.push(`"Red is the largest channel" is ${b.warmAtStart ? 'true' : 'false'} at the left end and ${b.warmAtEnd ? 'true' : 'false'} at the right end, and changes ${b.switches.length} time${b.switches.length === 1 ? '' : 's'}${b.switches.length ? ':' : '.'}`);
    for (const s of b.switches) {
      const value = b.ends ? `, which is ${(b.ends[0] + s.at * (b.ends[1] - b.ends[0])).toFixed(1)} ${b.unit ?? ''} **if** the bar is linear between its end labels (${b.ends[0]} and ${b.ends[1]}; read by eye, not measured)` : '';
      out.push(`- at ${(100 * s.at).toFixed(1)}% of the bar's length, from RGB ${rgb(s.from)} to ${rgb(s.to)}${value}.`);
    }
    out.push('');
    if (b.steps.length) {
      const instrument = (s: { warm: boolean; blue: boolean }) => (s.warm ? 'marimba (warm)' : set.blueClass && s.blue ? 'harp (blue)' : 'bells (cool)');
      out.push(table(['Step', 'x', 'RGB', 'Colour strength', 'Instrument'], b.steps.map((s) => [s.name, `${s.from}–${s.to}`, rgb(s.rgb), s.strength.toFixed(3), instrument(s)])), '');
      if (set.blueClass) out.push(`"Blue is the largest channel" (the third instrument) is true for ${b.steps.filter((s) => s.blue).length} of these ${b.steps.length} steps.`, '');
      if (b.names) out.push('The step names were read by eye from the labels on the bar.', '');
    } else {
      out.push(`Colour strength along the bar, every tenth, left end first: ${b.strength.map((s) => s.toFixed(2)).join(', ')}.`);
      out.push(`For the same share of a cell covered by lines, the cell mean is ${(b.strength[10] / b.strength[0]).toFixed(2)} times larger at the right end than at the left end.`, '');
    }
  }
  for (const m of p.barsMissing) out.push(`Not run: \`${m}\` could not be read.`, '');

  if (p.key === 'ocean') {
    out.push('### Do the frame\'s lines use the bar\'s colours? (uncompressed frame 23000)', '');
    if (p.palette) {
      const pal = p.palette;
      const t = pal.toleranceDegrees;
      out.push(`Every pixel of the uncompressed frame whose spread (largest − smallest channel) is over 12, the scan's floor: ${pal.all.pixels} pixels in ${pal.colours} colours.`);
      out.push('For each, the bar colour with the nearest hue. Hue does not change when a line is drawn faintly over black (all three channels scaled by the same number), and neither does the angle between two colours seen as (red, green, blue) arrows.');
      out.push(`Along the bar the hue runs from ${pal.bar.hueAtColdEnd.toFixed(1)}° at the cold end to ${pal.bar.hueAtWarmEnd.toFixed(1)}° at the warm end: ${pal.bar.stepsDown} steps down, ${pal.bar.stepsUp} up, ${pal.bar.reversals.length ? `turning back at ${pal.bar.reversals.map((r) => `${(100 * r).toFixed(1)}%`).join(', ')} of the bar` : 'never turning back'}.`);
      out.push(`Rounding to whole grey levels moves a pixel's hue by up to 60° ÷ spread for each level, so faint pixels cannot match closely. The table gives the share within ${t}°, and within ${t}° or two grey levels' worth (120° ÷ spread), whichever is larger.`, '');
      const rows = [...pal.groups.map((g) => ({ label: `${g.range[0]} to ${g.range[1]}`, ...g })), { label: 'All', ...pal.all }];
      out.push(
        table(
          ['Spread (grey levels)', 'Pixels', `Hue within ${t}°`, `Within ${t}° or two levels`, `Within ${t}° by colour angle`, 'Hue gap that half / 90% / 99% are within', 'Same instrument as the nearest bar colour'],
          rows.map((g) => [g.label, g.pixels, pct(g.within, 1), pct(g.adaptive, 1), pct(g.angleWithin, 1), `${g.p50.toFixed(2)}° / ${g.p90.toFixed(2)}° / ${g.p99.toFixed(2)}°`, pct(g.agree, 1, 2)]),
        ),
        '',
      );
      out.push(`Neighbouring bar colours are at most ${pal.largestHueStep.toFixed(2)}° apart in hue, so any hue inside the bar's range is within ${(pal.largestHueStep / 2).toFixed(2)}° of a bar colour. A hue match therefore shows two things only: the frame uses no hue outside the bar's range, and each pixel's hue is on a known side of the switch. It does not show that the frame's colours are the bar's colours. The whole colour (the angle between the arrows) is within ${t}° for ${pct(pal.all.angleWithin, 1)} of pixels.`, '');
      out.push(`Pixels further than ${t}° from every bar hue: ${pal.all.outside} of ${pal.all.pixels}; further than ${t}° or two grey levels: ${pal.all.outsideAdaptive}.`);
      out.push(`Weighted by colour strength, as the scan weighs them: ${pct(pal.all.withinByMass, 1)} within ${t}°, ${pct(pal.all.adaptiveByMass, 1)} within ${t}° or two levels, and ${pct(pal.all.agreeByMass, 1, 2)} on the same side of the instrument switch as the nearest bar colour.`);
      out.push(`Of all the colour, ${pct(pal.warmShare, 1)} is warm by the pixel rule, and ${pct(pal.pastSwitchShare, 1)} is nearest to a bar colour past the switch.`);
      const where = pal.disagreeAt.map((s, k) => ({ s, k })).filter((d) => d.s >= 0.0005);
      out.push(where.length ? `Colour on the other side of the switch from its nearest bar colour, by where that bar colour is: ${where.map((d) => `${5 * d.k}–${5 * d.k + 5}% of the bar, ${pct(d.s, 1, 2)} of all colour`).join('; ')}.` : 'No colour of note sits on the other side of the switch from its nearest bar colour (none of 0.05% or more in any twentieth of the bar).');
      out.push('');
      out.push('How strong and how bright the frame\'s colours are, by the tenth of the bar their hue belongs to. "Strength" is the spread ÷ 255, the scan\'s colour strength. "Saturation" is spread ÷ largest channel, which a line drawn faintly over black keeps.', '');
      out.push(
        table(
          ['Tenth of the bar (cold to warm)', 'Frame pixels', 'Bar: strength (mean of the tenth)', 'Frame: strength 99% are below', 'Frame: strongest', 'Frame ÷ bar saturation (middle pixel)', 'Largest brightness ÷ bar colour\'s'],
          pal.strengthByTenth.map((s, k) => [`${10 * k}–${10 * k + 10}%`, s.pixels, s.bar.toFixed(3), s.frame99.toFixed(3), s.frameLargest.toFixed(3), s.saturationRatio.toFixed(2), s.brightestAgainstBar.toFixed(2)]),
        ),
        '',
      );
      const [cold, warm] = [pal.strengthByTenth[0], pal.strengthByTenth[9]];
      out.push(`Warmest tenth ÷ coldest tenth: ${(warm.bar / cold.bar).toFixed(2)} on the bar (tenth means), ${(warm.frameLargest / cold.frameLargest).toFixed(2)} for the frame's strongest pixels, ${(warm.frame99 / cold.frame99).toFixed(2)} for the strength 99% are below.`, '');
      if (pal.offBar.length) {
        out.push(`The colour furthest from the bar (outside ${t}° or two levels), by 10° of hue, largest first:`, '');
        out.push(table(['Hue', 'Share of all colour', 'Share of the off-bar colour', 'Pixels', 'Most common colour (R, G, B)'], pal.offBar.map((o) => [`${o.hue}° to ${o.hue + 10}°`, pct(o.share, 1, 2), pct(o.ofOffBar, 1), o.pixels, o.example.join(', ')])), '');
      }

    } else {
      out.push(`Not run: it needs both \`${OCEAN_TIF}\` and the colour bar.`, '');
    }
  }

  out.push('### The still against NASA\'s frame', '');
  const f = p.frame as Record<string, any> | null;
  if (!f) {
    out.push('Not run: NASA\'s frame is not on this machine.', '');
  } else if ('error' in f) {
    out.push(`Not run: ${f.error}.`, '');
  } else {
    out.push(`The same rule and settings on the still and on NASA's ${f.frame} (${f.width} × ${f.height}, read at its own size${p.mask ? ', with the same mask' : ''}).`, '');
    out.push(
      table(
        ['', 'Still', 'NASA\'s frame'],
        [
          ['Map sweep: cells that sound', f.sounding.still, f.sounding.frame],
          ['Map sweep: chimes', f.chimes.still, f.chimes.frame],
          ['Map sweep: largest cell mean', p.line.colour.largestCellMean.toFixed(3), f.largestCellMean.toFixed(3)],
          ...f.regions.map((r: { id: string; still: number; frame: number }) => [`Radar, ${p.regions.find((x) => x.id === r.id)!.name}: chimes`, r.still, r.frame]),
        ],
      ),
      '',
    );
    out.push(`Levels differ by ${f.levels.meanChange.toFixed(4)} on average and ${f.levels.largestChange.toFixed(4)} at most. ${f.chimes.samePlaceAndInstrument} of the still's ${f.chimes.still} map-sweep chimes are at the same column and band, on the same instrument, as a chime of the frame.`);
    for (const r of f.regions as { id: string; still: number; samePlaceAndInstrument: number }[]) {
      out.push(`${p.regions.find((x) => x.id === r.id)!.name}: ${r.samePlaceAndInstrument} of the still's ${r.still} chimes are at the same place, on the same instrument.`);
    }
    out.push('');
    if (typeof f.exactQuiet90Cells === 'number') {
      out.push('In the uncompressed frame land is exactly grey and empty sea exactly black. Mean difference per colour channel between it and the still: ' + `${f.meanDifference.toFixed(2)} grey levels.`, '');
      out.push(
        table(
          ['In the uncompressed frame', 'Pixels', 'Share of the map', 'Of these, above the floor in the still'],
          [
            ['Grey land (channels within 2, mean 30 to 80)', f.land, pct(f.land, f.pixels), pct(f.landOver, f.land, 2)],
            ['Black sea (largest channel 8 or less)', f.sea, pct(f.sea, f.pixels), pct(f.seaOver, f.sea, 2)],
          ],
        ),
        '',
      );
      out.push(
        table(
          ['Cells that are grey land or black sea', 'How many', 'That sound', 'Largest cell mean'],
          f.quietCells.map((q: { least: number; cells: number; sounding: number; largestMean: number }) => [q.least === 1 ? 'Every pixel of the cell' : `${(100 * q.least).toFixed(0)}% of the cell or more`, q.cells, q.sounding, g255(q.largestMean)]),
        ),
        '',
      );
    }
  }

  if (p.key === 'ocean') {
    out.push('### Which still should the scan read? (frame 23000)', '');
    if (p.stills) {
      const s = p.stills;
      const file = (name: string) => stillFiles.stills[name];
      out.push('Each copy is read the way the app reads its still, and scanned by the app\'s rule. "Same place" is the same column and band as a chime of the uncompressed frame; "and instrument" also the same instrument.');
      out.push(`The 4:4:4 JPEG (quality=90, subsampling=0) and the lossless WebP (lossless=True, method=6) are made from the TIF with Pillow ${stillFiles.jpeg?.pillow ?? '(not found)'} (libjpeg-turbo ${stillFiles.jpeg?.libjpeg ?? 'unknown'}). They are git-ignored, beside the frame. The globe land rule is the globe page's: flat grey pixels (\`geo.ts\`, \`landShare\`), on the still drawn at the frame's size.`, '');
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
      out.push(`Not run: it needs \`${OCEAN_TIF}\` (NASA's frames are downloaded, not committed) and Python with Pillow.`, '');
    }
  }

  out.push('### The circles on the ground (derived from the map geometry, not measured)', '');
  out.push(
    table(
      ['Circle', 'Centre', 'Radius east–west', 'Radius north–south', 'Ground width ÷ height'],
      p.regions.map((r) => [
        r.name,
        `${Math.abs(r.lat).toFixed(1)}° ${r.lat < 0 ? 'S' : 'N'}, ${Math.abs(r.lon).toFixed(1)}° ${r.lon < 0 ? 'W' : 'E'}`,
        `${r.radiusDegrees.eastWest.toFixed(2)}°`,
        `${r.radiusDegrees.northSouth.toFixed(2)}°`,
        r.groundRatio.toFixed(3),
      ]),
    ),
    '',
  );

  out.push('### Equal latitude bands on a stretched map', '');
  out.push('"Change" is how far a level moves when each pixel is weighted by cos(latitude) inside its cell. Cells with no data are left out.', '');
  out.push(
    table(
      ['Band', 'Latitude', 'Share of the globe', 'Columns with data', 'Mean level', 'Mean change', 'Largest change'],
      p.latitude.bands.map((b) => [b.band, `${b.south}° to ${b.north}°`, pct(b.groundShare, 1, 2), b.columnsWithData, b.meanLevel.toFixed(3), b.meanChange.toFixed(4), b.largestChange.toFixed(4)]),
    ),
    '',
  );
  out.push(`Chimes: ${p.latitude.chimes} as the rule stands, ${p.latitude.chimesWeighted} with the weighting.`, '');

  out.push('### Check on this tool', '');
  out.push(`The tool repeats the rule's "which cell is this pixel in" to add weights and masks. Largest difference between its levels and the rule's (must be 0): ${p.selfCheck}.`, '');
  return out;
}

interface StillFiles {
  jpeg: ReturnType<typeof jpegInfo>;
  /** For each still compared (by the name audit.ts gives it): a column heading and what the file is. */
  stills: Record<string, { label: string; describe: string }>;
}

/** One scan read on the flat picture (Play along) and on the globe (Globe tab). */
interface GlobeCheck {
  scan: string;
  cells: number;
  chimes: number;
  /** Levels, cell means, chimes and left-out peaks all equal, number for number. */
  same: boolean;
}

/** The globe check of every picture: its own list, never mixed with another picture's. */
interface GlobeChecks {
  /** What drew the globe (software or the graphics card). */
  renderer: string;
  pictures: { label: string; checks: GlobeCheck[] }[];
}

function report(a: Audit, meta: Record<string, string>, stillFiles: StillFiles, globe: GlobeChecks): string {
  const out: string[] = [];
  out.push('# Picture scan: measurements on the NASA pictures', '');
  out.push('Written by `npm run measure` (in `web/`). Do not edit by hand: run it again.', '');
  out.push(`Measured ${meta.date} in ${meta.browser}, on commit ${meta.commit}${meta.dirty ? ' with uncommitted changes' : ''}.`);
  out.push('The rule is `web/src/audio/scanScore.ts`, run in the browser on the stills the app plays.', '');
  out.push('**Each picture has its own section, its own settings and its own numbers. No table here holds two pictures. Never compare a number in one section with a number in another.**', '');
  out.push('The rule, the same for every picture (not a setting):', '');
  out.push(`- Map sweep: ${a.lineGrid.columns} columns × ${a.lineGrid.bands} bands, ${a.lineGrid.seconds} s. Radar: ${a.radarGrid.columns} columns × ${a.radarGrid.bands} bands, ${a.radarGrid.seconds} s, each cell read at ${a.radarSamples * a.radarSamples} points.`);
  out.push(`- A chime needs level ${a.chimeRule.minLevel}, ${a.chimeRule.minGap} columns from the next in its band, ${a.chimeRule.perColumn} per column.`);
  out.push('- A cell that reads nothing (masked, or outside the picture) is no data: silent, never a peak, left out of the smoothing and of the low note.');
  out.push('- The instrument is chosen by the pixels above the floor only, each weighted by its colour strength: warm when red is their largest channel; for a picture with a third instrument, blue when blue is (a tie with green counts as blue); cool otherwise.', '');
  out.push('Each picture\'s settings (`web/src/data/sources.ts`, `scan`) were chosen by this procedure, the same for every picture:', '');
  out.push('- **Floor:** the colour strength of the commonest colour among the pixels read, plus 12 grey levels (the tolerance for JPEG noise).');
  out.push('- **Full level:** the largest cell mean on that scan (the radar: the larger of the two circles), rounded up to 0.05, so no cell is clipped.');
  out.push('- **Mask:** the picture\'s `scan_mask.png`, if it has one (written by `analysis/scan_mask.py`).', '');
  out.push('The ocean picture keeps the settings it was built with on 15 Nov; its section shows where they differ from the procedure.', '');
  for (const p of a.pictures) out.push(...section(p, a, stillFiles));

  out.push('## The globe and the flat picture', '');
  out.push('The Globe tab draws the scan round the globe from the same pixels and the same rule as Play along. Each scan of each picture was');
  out.push(`read in both places in the running app; the globe was drawn by ${globe.renderer}. One table per picture.`, '');
  for (const g of globe.pictures) {
    out.push(`### ${g.label}`, '');
    out.push(
      table(
        ['Scan', 'Cells', 'Chimes', 'Same levels, means, chimes and left-out peaks on the globe'],
        g.checks.map((c) => [c.scan, c.cells, c.chimes, c.same ? 'yes, every number' : '**no**']),
      ),
      '',
    );
  }
  return out.join('\n');
}

test('measure the picture scan on the NASA pictures', async ({ page, browser }) => {
  const ocean = oceanPng();
  const jpg444 = ocean ? jpeg444() : null;
  const webp = ocean ? webpLossless() : null;
  const options = { files: files({ jpg444, webp }) };
  // What each JPEG is, from its header: colour resolution and quality setting.
  const jpegs = [STILL, ...(jpg444 ? [jpg444] : [])];
  const jpeg = jpegInfo(jpegs);
  const kind = (file: string) => {
    const info = jpeg?.files[jpegs.indexOf(file)];
    return info ? `JPEG ${info.sampling}, ${info.quality ? `quality ${info.quality} (libjpeg's standard tables)` : 'not libjpeg\'s standard tables'}` : 'JPEG';
  };
  const stillFiles: StillFiles = {
    jpeg,
    stills: {
      app: { label: `The app's still (\`${STILL}\`)`, describe: `${megabytes(STILL)}, ${kind(STILL)}` },
      q90_444: { label: 'JPEG 4:4:4, quality 90', describe: jpg444 ? `${megabytes(jpg444)}, ${kind(jpg444)}` : '' },
      webp: { label: 'WebP, lossless', describe: webp ? `${megabytes(webp)}, WebP lossless (method 6)` : '' },
      uncompressed: { label: 'Uncompressed frame', describe: ocean ? `${megabytes(ocean)}, PNG${existsSync(resolve(repo, OCEAN_TIF)) ? ` from the TIF (${megabytes(OCEAN_TIF)})` : ''}` : '' },
    },
  };
  await page.goto('/#play');
  await expect(page.getByRole('heading', { name: /Earth Sonata/ })).toBeVisible();
  // A string, so the import runs in the page exactly as written.
  const result = (await page.evaluate(`import('/measure/audit.ts').then((m) => m.runAudit(${JSON.stringify(options)}))`)) as Audit | { error: string };
  if ('error' in result) throw new Error(result.error);

  // The tool's copy of the cell rule must agree with the rule itself, or its extra numbers mean nothing.
  for (const p of result.pictures) expect(p.selfCheck, `${p.key}: the tool's cells differ from the rule's`).toBe(0);

  // The globe: every scan of each picture read on Play along and on the Globe tab, as a person would choose them.
  const score = () =>
    page.evaluate(() => {
      const s = (window as unknown as { __scanScore: { levels: Float32Array; means: Float32Array; chimes: unknown[]; dropped: unknown[] } }).__scanScore;
      return { levels: Array.from(s.levels), means: Array.from(s.means), chimes: s.chimes, dropped: s.dropped };
    });
  const readAll = async () => {
    await page.getByText('Scan settings', { exact: true }).click();
    const choice = page.locator('.scan select').first();
    const names = await choice.locator('option').allTextContents();
    const scores = [];
    for (let index = 0; index < names.length; index++) {
      await choice.selectOption({ index });
      await expect(page.getByRole('button', { name: 'Play the picture' })).toBeEnabled();
      scores.push({ name: names[index], ...(await score()) });
    }
    return scores;
  };
  const labels = await page.locator('.source-choice .source-label').allTextContents();
  let renderer = '';
  const globePictures: GlobeChecks['pictures'] = [];
  for (const label of labels.length ? labels : ['Ocean']) {
    await page.goto('/#play'); // the picture is chosen here, and kept when the view changes to Globe and back
    if (labels.length) {
      await page.getByRole('radio', { name: label }).check();
      await expect(page.getByText(/^Reading the /)).toContainText(label === 'Ocean' ? 'ocean' : label.toLowerCase());
    }
    const flat = await readAll();
    await page.goto('/#globe');
    await page.waitForFunction(() => !!(window as unknown as { __globe?: unknown }).__globe, undefined, { timeout: 15_000 });
    renderer = await page.evaluate(() => (window as unknown as { __globe: { renderer: () => string } }).__globe.renderer());
    const onGlobe = await readAll();
    const checks: GlobeCheck[] = flat.map((f, i) => {
      const g = onGlobe[i];
      const same = g?.name === f.name && JSON.stringify([g.levels, g.means, g.chimes, g.dropped]) === JSON.stringify([f.levels, f.means, f.chimes, f.dropped]);
      return { scan: f.name, cells: f.levels.length, chimes: f.chimes.length, same };
    });
    for (const c of checks) expect(c.same, `${label}, ${c.scan}: the globe's score differs from the flat picture's`).toBe(true);
    globePictures.push({ label, checks });
  }
  const globe: GlobeChecks = { renderer, pictures: globePictures };

  const meta = {
    date: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    browser: `Chromium ${browser.version()}`,
    commit: git('rev-parse', '--short', 'HEAD') || 'unknown',
    dirty: git('status', '--porcelain', '--', 'web/src', 'data') ? 'yes' : '',
  };
  const folder = resolve(repo, 'docs/measurements');
  mkdirSync(folder, { recursive: true });
  // A smooth bar's colours are long and only feed the palette check; the report gives what they show.
  const json = {
    meta,
    barLabelsC: BAR_LABELS_C,
    files: options.files,
    stillFiles,
    ...result,
    pictures: result.pictures.map((q) => ({ ...q, bars: q.bars.map((b) => ({ ...b, colours: b.colours ? `${b.colours.length} colours, x ${b.from} to ${b.to}` : null })) })),
    globe,
  };
  writeFileSync(resolve(folder, 'scan_pictures.json'), JSON.stringify(json, null, 1) + '\n');
  writeFileSync(resolve(folder, 'scan_pictures.md'), report(result, meta, stillFiles, globe));
  console.log(report(result, meta, stillFiles, globe));
});
