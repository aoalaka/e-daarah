#!/usr/bin/env node
/**
 * Docs freshness checker.
 *
 * Reads every .md file under frontend/src/docs/articles/ and looks for a
 * trailing HTML comment block of the form:
 *
 *   <!-- docs-meta
 *   sources:
 *     - path/to/file.jsx
 *     - path/to/another.js#L100-L200
 *   last_audited: 2026-05-04
 *   -->
 *
 * For each listed source, compares its mtime to last_audited.
 * If any source has been modified since last_audited, flags the doc as stale.
 *
 * Usage:
 *   node scripts/check-docs-freshness.js          # human-readable report, exits 0
 *   node scripts/check-docs-freshness.js --strict # exits 1 if any doc is stale (CI gate)
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const articlesDir = path.join(repoRoot, 'frontend', 'src', 'docs', 'articles');

const strict = process.argv.includes('--strict');

function parseDocsMeta(markdown) {
  const match = markdown.match(/<!--\s*docs-meta\s*([\s\S]*?)\s*-->/);
  if (!match) return null;
  const block = match[1];
  const sources = [];
  let lastAudited = null;
  let inSources = false;
  for (const rawLine of block.split('\n')) {
    const line = rawLine.trim();
    if (line.startsWith('last_audited:')) {
      lastAudited = line.slice('last_audited:'.length).trim();
      inSources = false;
    } else if (line.startsWith('sources:')) {
      inSources = true;
      const inline = line.slice('sources:'.length).trim();
      if (inline === '[]') inSources = false;
    } else if (inSources && line.startsWith('-')) {
      const src = line.slice(1).trim();
      // Strip optional #Lxx-Lyy line ref — we only care about the file
      sources.push(src.split('#')[0]);
    } else if (line === '' || line === '[]') {
      // ignore
    } else if (inSources) {
      inSources = false;
    }
  }
  return { sources, lastAudited };
}

function checkArticle(file) {
  const md = fs.readFileSync(file, 'utf8');
  const meta = parseDocsMeta(md);
  if (!meta) {
    return { file, status: 'missing-meta' };
  }
  if (!meta.lastAudited) {
    return { file, status: 'missing-audit-date' };
  }

  const auditedAt = new Date(meta.lastAudited);
  if (isNaN(auditedAt.getTime())) {
    return { file, status: 'bad-audit-date', detail: meta.lastAudited };
  }

  const stale = [];
  const missing = [];
  for (const src of meta.sources) {
    const fullPath = path.join(repoRoot, src);
    if (!fs.existsSync(fullPath)) {
      missing.push(src);
      continue;
    }
    // Use git log for the file's last-commit date when available — survives clones,
    // ignores untracked-edit noise. Fall back to filesystem mtime.
    let srcDate;
    try {
      const out = execSync(`git log -1 --format=%cI -- "${src}"`, { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      srcDate = out ? new Date(out) : fs.statSync(fullPath).mtime;
    } catch {
      srcDate = fs.statSync(fullPath).mtime;
    }
    if (srcDate > auditedAt) {
      stale.push({ src, srcMtime: srcDate.toISOString().slice(0, 10) });
    }
  }

  return {
    file,
    status: stale.length || missing.length ? 'stale' : 'fresh',
    auditedAt: meta.lastAudited,
    stale,
    missing,
  };
}

const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.md')).map(f => path.join(articlesDir, f));

let staleCount = 0;
let problemsCount = 0;
const reports = [];

for (const file of files) {
  reports.push(checkArticle(file));
}

console.log('\n📚 Docs freshness check\n');

for (const r of reports) {
  const rel = path.relative(repoRoot, r.file);
  if (r.status === 'fresh') {
    console.log(`  ✅  ${rel}  (audited ${r.auditedAt})`);
  } else if (r.status === 'stale') {
    staleCount++;
    console.log(`  ⚠️  ${rel}  (audited ${r.auditedAt}) — sources changed:`);
    for (const s of r.stale) console.log(`        ${s.src}  (modified ${s.srcMtime})`);
    for (const m of r.missing) console.log(`        ${m}  (FILE NOT FOUND)`);
  } else if (r.status === 'missing-meta') {
    problemsCount++;
    console.log(`  ❌  ${rel} — missing <!-- docs-meta --> block`);
  } else if (r.status === 'missing-audit-date') {
    problemsCount++;
    console.log(`  ❌  ${rel} — docs-meta block missing last_audited`);
  } else if (r.status === 'bad-audit-date') {
    problemsCount++;
    console.log(`  ❌  ${rel} — invalid last_audited value: ${r.detail}`);
  }
}

const fresh = reports.length - staleCount - problemsCount;
console.log(`\nSummary: ${fresh} fresh · ${staleCount} stale · ${problemsCount} with errors\n`);

if (staleCount > 0) {
  console.log('To fix a stale doc:');
  console.log('  1. Open the article and re-read each linked source file');
  console.log('  2. Update the article wherever behaviour has changed');
  console.log('  3. Bump last_audited at the bottom to today');
  console.log('  4. Commit\n');
}

if (strict && (staleCount > 0 || problemsCount > 0)) {
  process.exit(1);
}
