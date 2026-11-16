// Measures the picture scan on the real NASA pictures and writes docs/measurements/scan_pictures.*.
// The numbers come from the app's own rule running in Chromium (audit.ts); this file only starts
// it and writes the report. Run: npm run measure   (from web/)
//
// The report has one section per picture. No table in it holds two pictures: each picture is drawn
// and measured with its own settings, and its numbers are never compared with another's.
import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Audit, BarFile, FrameFile, PictureAudit, PictureFiles, ScanSummary } from './audit';

const repo = fileURLToPath(new URL('../..', import.meta.url));
const have = (file: string) => existsSync(resolve(repo, file));
const url = (file: string) => `/${file}`; // the dev server serves assets/frames/ (vite.config.ts)

// ---------- NASA's files, which are downloaded and git-ignored (bash tools/download_frames.sh) ----------

const OCEAN_TIF = 'assets/frames/svs3912/flat_global_ecco2_2028x1024.23000.tif';
const OCEAN_PNG = 'assets/frames/svs3912/flat_global_ecco2_2028x1024.23000.png';

/** Chromium cannot open a TIFF, so the uncompressed ocean frame is copied to a PNG once (same pixels). */
function oceanPng(): string | null {
  if (have(OCEAN_PNG)) return OCEAN_PNG;
  if (!have(OCEAN_TIF)) return null;
  for (const python of ['python', 'python3']) {
    try {
      execFileSync(python, ['-I', '-c', 'import sys; from PIL import Image; Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2])', resolve(repo, OCEAN_TIF), resolve(repo, OCEAN_PNG)]);
      return OCEAN_PNG;
    } catch {
      // try the next name
    }
  }
  return null;
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
 * What each picture's files are. Read by eye on 15 Nov, and typed here: the ocean bar's end labels
 * (0 and 32 °C), and the names of the aerosol bar's four swatches, left to right.
 */
function files(): Record<string, PictureFiles> {
  const ocean = oceanPng();
  const aerosolFrame = 'assets/frames/svs5669/Aerosols_2025-08-19T20_00_00_3840x2160.png';
  return {
    ocean: {
      frames: ocean ? [{ file: ocean, url: url(ocean), frame: 'frame 23000', time: '2007-03-25T12:00Z' }] : [],
      bars: bar({ file: 'assets/frames/svs3912/sst_ecco2_cbar.png', name: 'sea surface temperature', coloured: 100, stepped: false, ends: [0, 32], unit: '°C' }),
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

function section(p: PictureAudit, a: Audit): string[] {
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

function report(a: Audit, meta: Record<string, string>, globe: GlobeChecks): string {
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
  for (const p of a.pictures) out.push(...section(p, a));

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
  const options = { files: files() };
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
  writeFileSync(resolve(folder, 'scan_pictures.json'), JSON.stringify({ meta, files: options.files, ...result, globe }, null, 1) + '\n');
  writeFileSync(resolve(folder, 'scan_pictures.md'), report(result, meta, globe));
  console.log(report(result, meta, globe));
});
