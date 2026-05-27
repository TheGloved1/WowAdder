#!/usr/bin/env bun

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import * as readline from 'node:readline/promises';

const rl = readline.createInterface({ input, output });
const ask = (q: string) => rl.question(q);
const checkYesOrNo = (ans: string) => ans.toLowerCase() === 'n';

const RED = '\x1b[0;31m';
const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[1;33m';
const BLUE = '\x1b[0;34m';
const DIM = '\x1b[2m';
const NC = '\x1b[0m';

function step(msg: string) {
  console.log(`\n${BLUE}==>${NC} ${msg}`);
}
function ok(msg: string) {
  console.log(`  ${GREEN}ok${NC} ${msg}`);
}
function fail(msg: string): never {
  console.error(`  ${RED}error${NC} ${msg}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Version parsing
// ---------------------------------------------------------------------------

interface VersionParsed {
  major: number;
  minor: number;
  patch: number;
  prerelease: string | null;
  prereleaseNum: number;
}

function parseVersion(v: string): VersionParsed {
  const match = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+?)\.(\d+))?$/);
  if (!match) fail(`Invalid version: "${v}"`);
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] ?? null,
    prereleaseNum: match[5] ? parseInt(match[5], 10) : 0,
  };
}

function getLastNonBetaTag(): string {
  execSync('git fetch --tags --force', { stdio: 'ignore' });
  try {
    const tags = execSync('git tag --list "v*" --sort=-creatordate', { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean);
    for (const tag of tags) {
      const ver = tag.replace(/^v/, '');
      if (!/-/.test(ver)) return tag;
    }
    return '';
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Version resolution
// ---------------------------------------------------------------------------

function resolveNextVersion(current: string, bump: string, betaModifier: boolean): string {
  const parsed = parseVersion(current);

  switch (bump) {
    case 'major':
      return betaModifier ? `${parsed.major + 1}.0.0-beta.1` : `${parsed.major + 1}.0.0`;
    case 'minor':
      return betaModifier ? `${parsed.major}.${parsed.minor + 1}.0-beta.1` : `${parsed.major}.${parsed.minor + 1}.0`;
    case 'patch':
      return betaModifier ?
          `${parsed.major}.${parsed.minor}.${parsed.patch + 1}-beta.1`
        : `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
    case 'beta':
      if (parsed.prerelease === null)
        fail('Not a beta version. Use "patch beta", "minor beta", or "major beta" to start a beta series.');
      return `${parsed.major}.${parsed.minor}.${parsed.patch}-beta.${parsed.prereleaseNum + 1}`;
    default:
      return bump;
  }
}

// ---------------------------------------------------------------------------
// Changelog generation
// ---------------------------------------------------------------------------

function generateChangelog(next: string, baseTag?: string): { changelogEntry: string; releaseEntry: string } {
  let rangeStart = baseTag;
  if (rangeStart === undefined) {
    try {
      rangeStart = execSync('git tag --list "v*" --sort=-creatordate', { encoding: 'utf-8' }).trim().split('\n')[0] ?? '';
    } catch {
      rangeStart = '';
    }
  }

  const range = rangeStart ? `${rangeStart}..HEAD` : 'HEAD';
  const today = new Date().toISOString().slice(0, 10);

  const log = execSync(`git log ${range} --pretty=format:"%s" --reverse`, { encoding: 'utf-8' });
  const lines = log.split('\n').filter(Boolean);

  const added: string[] = [];
  const fixed: string[] = [];
  const changed: string[] = [];
  const other: string[] = [];

  const pattern = /^(feat|fix|refactor|perf|build|style|docs|test|chore)(\(.*?\))?!?:\s(.+)$/;

  for (const line of lines) {
    const m = line.match(pattern);
    if (!m) continue;
    const [, type, scope, msg] = m;
    const entry = scope ? `**${scope.slice(1, -1)}**: ${msg}` : msg;
    switch (type) {
      case 'feat':
        added.push(entry);
        break;
      case 'fix':
        fixed.push(entry);
        break;
      case 'refactor':
      case 'perf':
      case 'style':
        changed.push(entry);
        break;
      default:
        other.push(entry);
        break;
    }
  }

  let body = '';
  if (added.length) body += '\n\n### Added\n\n' + added.map((e) => `- ${e}`).join('\n');
  if (fixed.length) body += '\n\n### Fixed\n\n' + fixed.map((e) => `- ${e}`).join('\n');
  if (changed.length) body += '\n\n### Changed\n\n' + changed.map((e) => `- ${e}`).join('\n');
  if (other.length) body += '\n\n### Other\n\n' + other.map((e) => `- ${e}`).join('\n');
  if (!body) body = '\n\nMaintenance release.';

  const changelogEntry = `## [${next}] - ${today}${body}`;
  const releaseEntry = `## ${today}${body}`;

  return { changelogEntry, releaseEntry };
}

// ---------------------------------------------------------------------------
// Undo log types and helpers
// ---------------------------------------------------------------------------

interface UndoLog {
  version: { from: string; to: string };
  timestamp: string;
  branch: string;
  commit: string;
  tag: string;
  files: Record<string, string | null>;
  created: string[];
}

const UNDO_DIR = '.release-undo';

function captureFileSnapshot(files: string[]): Record<string, string | null> {
  const snapshot: Record<string, string | null> = {};
  for (const file of files) {
    snapshot[file] = existsSync(file) ? readFileSync(file, 'utf-8') : null;
  }
  return snapshot;
}

function saveUndoLog(log: UndoLog) {
  if (!existsSync(UNDO_DIR)) mkdirSync(UNDO_DIR, { recursive: true });
  writeFileSync(join(UNDO_DIR, `v${log.version.to}.json`), JSON.stringify(log, null, 2) + '\n');
}

function listUndoLogs(): { version: string; path: string }[] {
  if (!existsSync(UNDO_DIR)) return [];
  return readdirSync(UNDO_DIR)
    .filter((f: string) => f.endsWith('.json'))
    .map((f: string) => ({ version: f.replace(/^v/, '').replace(/\.json$/, ''), path: join(UNDO_DIR, f) }))
    .sort((a: { version: string }, b: { version: string }) => {
      const pa = parseVersion(a.version);
      const pb = parseVersion(b.version);
      const base = pb.major - pa.major || pb.minor - pa.minor || pb.patch - pa.patch;
      if (base !== 0) return base;
      if (pa.prerelease && !pb.prerelease) return 1;
      if (!pa.prerelease && pb.prerelease) return -1;
      if (pa.prerelease && pb.prerelease) {
        if (pa.prerelease !== pb.prerelease) return pa.prerelease.localeCompare(pb.prerelease);
        return pb.prereleaseNum - pa.prereleaseNum;
      }
      return 0;
    });
}

function restoreFiles(log: UndoLog) {
  const changed: string[] = [];
  for (const [file, content] of Object.entries(log.files)) {
    if (content === null) {
      if (existsSync(file)) {
        rmSync(file);
        changed.push(file);
      }
    } else {
      writeFileSync(file, content);
      changed.push(file);
    }
  }
  for (const file of log.created) {
    if (existsSync(file)) {
      rmSync(file);
    }
  }
  return changed;
}

async function undoRelease() {
  const logs = listUndoLogs();
  if (logs.length === 0) fail('No undo logs found.');

  console.log(`${BLUE}Available undo logs:${NC}`);
  logs.forEach((log, i) => console.log(`  ${i + 1}. v${log.version}`));

  const choice = (await ask(`\nSelect version to undo (1-${logs.length}) [1]: `)) || '1';
  const idx = Math.max(0, Math.min(logs.length - 1, parseInt(choice, 10) - 1)) || 0;
  const selected = logs[idx];

  const log: UndoLog = JSON.parse(readFileSync(selected.path, 'utf-8'));
  console.log(`\nWill undo release v${log.version.to}:`);
  console.log(`  commit : ${log.commit.substring(0, 7)}`);
  console.log(`  tag    : ${log.tag}`);
  console.log(`  branch : ${log.branch}`);
  console.log(`  files  : ${Object.keys(log.files).join(', ')}`);

  const proceed = await ask(`\nProceed? This will hard-reset and force-push. (y/N) `);
  if (proceed.toLowerCase() !== 'y') {
    console.log('Aborted.');
    process.exit(0);
  }

  const branch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
  if (branch !== log.branch) {
    const sw = await ask(`  Not on '${log.branch}' (on '${branch}'). Switch? (y/N) `);
    if (sw.toLowerCase() !== 'y') {
      console.log('Aborted.');
      process.exit(0);
    }
    execSync(`git checkout ${log.branch}`, { encoding: 'utf-8' });
  }

  step('Checking out release commit');
  execSync(`git checkout ${log.commit}`, { encoding: 'utf-8' });

  step('Restoring file snapshots');
  const changed = restoreFiles(log);
  changed.forEach((f) => ok(`Restored ${f}`));

  step('Creating revert commit');
  execSync(`git add ${changed.join(' ')}`, { encoding: 'utf-8' });
  const changedList = changed.map((f) => `  Revert ${f}`).join('\n');
  execSync(`git commit -m "revert: undo release v${log.version.to}\n\n${changedList}"`, { encoding: 'utf-8' });

  step(`Deleting tag ${log.tag}`);
  execSync(`git tag -d "${log.tag}"`, { encoding: 'utf-8' });

  step(`Pushing revert to origin/${log.branch}`);
  execSync(`git push origin ${log.branch}`, { encoding: 'utf-8' });
  execSync(`git push origin :refs/tags/${log.tag}`, { encoding: 'utf-8' });
  ok('Pushed');

  rmSync(selected.path);
  ok(`Cleaned up ${selected.path}`);

  console.log(`\n${GREEN}${'='.repeat(40)}${NC}`);
  console.log(`${GREEN}  Undid release v${log.version.to}${NC}`);
  console.log(`${GREEN}${'='.repeat(40)}${NC}\n`);
}

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

function showUsage() {
  console.log(`
Usage: ./scripts/release.ts [<bump> [beta]] [flags]

Bump commands:
  major [beta]       Bump major version. (e.g. 0.3.25 -> 1.0.0 or 1.0.0-beta.1)
  minor [beta]       Bump minor version. (e.g. 0.3.25 -> 0.4.0 or 0.4.0-beta.1)
  patch [beta]       Bump patch version. (e.g. 0.3.25 -> 0.3.26 or 0.3.26-beta.1)  
  beta               Increment beta number (must already be beta)
  x.y.z              Explicit version
  x.y.z-beta.N       Explicit beta version

  Append "beta" to start a beta:  patch beta, minor beta, major beta
  No arguments on a beta version strips it to stable.

Flags:
  --no-changelog     Skip changelog generation
  --no-push          Commit and tag locally, skip git push
  --undo             Revert the most recent release
  --help, -h, help   Show this help

Changelog preview:
  changelog                      Preview changelog for current version
  changelog patch beta           Preview changelog for next version

Examples:
  ./scripts/release.ts patch              # 0.3.25 -> 0.3.26
  ./scripts/release.ts patch beta         # 0.3.25 -> 0.3.26-beta.1
  ./scripts/release.ts beta               # 0.3.26-beta.1 -> 0.3.26-beta.2
  ./scripts/release.ts                    # 0.3.26-beta.2 -> 0.3.26 (stable)
  ./scripts/release.ts minor              # 0.3.25 -> 0.4.0
  ./scripts/release.ts 0.4.0              # exact version
  ./scripts/release.ts changelog patch    # preview changelog for next patch
  ./scripts/release.ts --undo             # revert the most recent release
  ./scripts/release.ts patch --no-push    # bump locally without pushing
`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);

  // Help
  if (args.includes('--help') || args.includes('-h') || args.includes('help')) {
    showUsage();
    rl.close();
    process.exit(0);
  }

  // Undo
  if (args.includes('--undo')) {
    await undoRelease();
    rl.close();
    process.exit(0);
  }

  // Extract flags
  const skipChangelog = args.includes('--no-changelog');
  const noPush = args.includes('--no-push');
  const flags = new Set(['--undo', '--no-changelog', '--no-push', '--help', '-h']);
  const positional = args.filter((a) => !flags.has(a));

  const isChangelogMode = positional[0] === 'changelog';
  const releaseArgs = isChangelogMode ? positional.slice(1) : positional;

  const betaModifier = releaseArgs.includes('beta');
  const nonBeta = releaseArgs.filter((a) => a !== 'beta');
  const hasNoBump = nonBeta.length === 0;
  const bumpArg = nonBeta[0] ?? '';

  let bump: string;
  if (hasNoBump && !betaModifier) bump = '';
  else if (hasNoBump && betaModifier) bump = 'beta';
  else bump = bumpArg;

  // Validate tools
  for (const cmd of ['git']) {
    try {
      execSync(`where ${cmd}`, { stdio: 'ignore' });
    } catch {
      try {
        execSync(`command -v ${cmd}`, { stdio: 'ignore' });
      } catch {
        fail(`Required tool not found: ${cmd}`);
      }
    }
  }

  // Read current version
  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
  const current = pkg.version as string;
  const parsed = parseVersion(current);

  // Resolve next version
  let next: string;
  if (bump === '') {
    if (parsed.prerelease === null)
      fail('Already a stable release. Use major/minor/patch to bump, or specify an explicit version.');
    next = `${parsed.major}.${parsed.minor}.${parsed.patch}`;
  } else if (['major', 'minor', 'patch', 'beta'].includes(bump)) {
    next = resolveNextVersion(current, bump, betaModifier);
  } else if (/^\d+\.\d+\.\d+(-beta\.\d+)?$/.test(bump)) {
    if (betaModifier) fail('Cannot combine "beta" modifier with an explicit version. Specify the full version instead.');
    next = bump;
  } else {
    fail(`Invalid version or bump type: "${bump}"`);
  }

  console.log(`${BLUE}Release${NC}`);
  console.log(`  current : ${DIM}${current}${NC}`);
  console.log(`  next    : ${GREEN}${next}${NC}\n`);

  // Changelog-only mode
  if (isChangelogMode) {
    step('Generating changelog preview');

    execSync('git fetch --tags --force', { stdio: 'ignore' });

    const isStableFromBeta = parsed.prerelease !== null && !next.includes('-');
    const baseTag = isStableFromBeta ? getLastNonBetaTag() : undefined;
    const { changelogEntry, releaseEntry } = generateChangelog(next, baseTag);

    console.log(`\n${BLUE}=== CHANGELOG.md entry ===${NC}\n`);
    console.log(changelogEntry);
    console.log(`\n${BLUE}=== Release body (changelogs/v${next}.md) ===${NC}\n`);
    console.log(releaseEntry);
    rl.close();
    process.exit(0);
  }

  // Pre-flight checks
  step('Running pre-flight checks');

  const status = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
  if (status) fail('Uncommitted changes detected. Commit or stash them first.');
  ok('Working tree clean');

  const branch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
  if (branch !== 'main') {
    console.log(`  ${YELLOW}warning${NC} You are on branch '${branch}', not 'main'.`);
    const reply = await ask('  Continue anyway? (y/N) ');
    if (reply.toLowerCase() !== 'y') {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  // Confirm
  const proceed = await ask(`Proceed with release v${next}? (Y/n) `);
  if (checkYesOrNo(proceed)) {
    console.log('Aborted.');
    process.exit(0);
  }

  const isBetaRelease = next.includes('-');
  const isStableFromBeta = parsed.prerelease !== null && !next.includes('-');

  // Snapshot files before any changes (for undo log)
  const snapshotFiles = [
    'package.json',
    'src-tauri/Cargo.toml',
    'src-tauri/Cargo.lock',
    'src-tauri/tauri.conf.json',
    ...(skipChangelog || isBetaRelease ? [] : ['CHANGELOG.md']),
  ];
  const fileSnapshot = captureFileSnapshot(snapshotFiles);

  // Bump versions
  step('Updating version numbers');

  pkg.version = next;
  writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  ok('package.json');
  try {
    execSync('bun run sync-version', { stdio: 'inherit' });
    ok('Synced version to Cargo.toml, Cargo.lock, and tauri.conf.json');
  } catch (error) {
    fail('Failed to sync version: ' + error);
  }

  // Changelog
  if (skipChangelog) {
    ok('SKIP — changelog generation disabled');
  } else {
    step('Generating changelog');

    // For stable releases from beta, aggregate all commits since last non-beta tag
    const baseTag = isStableFromBeta ? getLastNonBetaTag() : undefined;
    const { changelogEntry, releaseEntry } = generateChangelog(next, baseTag);

    if (isBetaRelease) {
      ok('SKIP — CHANGELOG.md not updated for beta releases');
    } else {
      // Insert into CHANGELOG.md
      const changelogPath = 'CHANGELOG.md';
      if (existsSync(changelogPath)) {
        const changelog = readFileSync(changelogPath, 'utf-8');
        if (changelog.startsWith('## [')) {
          writeFileSync(changelogPath, changelogEntry + '\n\n' + changelog);
        } else {
          const marker = '\n## [';
          const idx = changelog.indexOf(marker);
          if (idx !== -1) {
            const before = changelog.slice(0, idx);
            const after = changelog.slice(idx);
            writeFileSync(changelogPath, before + '\n\n' + changelogEntry + '\n' + after);
          } else {
            writeFileSync(changelogPath, changelog.trimEnd() + '\n\n' + changelogEntry + '\n');
          }
        }
      } else {
        writeFileSync(changelogPath, changelogEntry + '\n');
      }
      ok('CHANGELOG.md');
    }

    // Write tag-specific changelog
    const changelogsDir = 'changelogs';
    if (!existsSync(changelogsDir)) {
      mkdirSync(changelogsDir, { recursive: true });
    }
    writeFileSync(`${changelogsDir}/v${next}.md`, releaseEntry);
    ok(`${changelogsDir}/v${next}.md`);

    // Preview
    console.log(`\n${DIM}--- changelog preview ---${NC}`);
    console.log(changelogEntry);
    console.log(`${DIM}--- end preview ---${NC}\n`);

    const looksGood = await ask('Does the changelog look good? (Y/n) ');
    if (checkYesOrNo(looksGood)) {
      const fileList = ['package.json', ...(isBetaRelease ? [] : ['CHANGELOG.md']), `changelogs/v${next}.md`];
      console.log(`
Edit files manually, then run:
  git add ${fileList.join(' ')}
  git commit -m "chore: release v${next}"
  git tag -a v${next} -m "Release v${next}"
  ${noPush ? '# (--no-push enabled)' : `git push origin ${branch} --tags`}
`);
      process.exit(0);
    }
  }

  // Git commit and tag
  step('Creating release commit');

  const filesToAdd = [
    'package.json',
    'src-tauri/Cargo.toml',
    'src-tauri/Cargo.lock',
    'src-tauri/tauri.conf.json',
    ...(skipChangelog ? [] : [`changelogs/v${next}.md`]),
    ...(skipChangelog || isBetaRelease ? [] : ['CHANGELOG.md']),
  ];
  execSync(`git add ${filesToAdd.join(' ')}`, { encoding: 'utf-8' });
  execSync(`git commit -m "chore: release v${next}"`, { encoding: 'utf-8' });
  ok('Committed');

  step('Saving undo log');
  const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  const createdFiles: string[] = skipChangelog ? [] : [`changelogs/v${next}.md`];
  saveUndoLog({
    version: { from: current, to: next },
    timestamp: new Date().toISOString(),
    branch,
    commit: commitHash,
    tag: `v${next}`,
    files: fileSnapshot,
    created: createdFiles,
  });
  ok(`.release-undo/v${next}.json`);

  step(`Creating tag v${next}`);
  execSync(`git tag -a "v${next}" -m "Release v${next}"`, { encoding: 'utf-8' });
  ok('Tagged');

  // Push to remote
  if (noPush) {
    console.log(`\n${YELLOW}SKIP — push disabled by --no-push${NC}`);
    console.log(`${DIM}To push manually:${NC}`);
    console.log(`  git push origin ${branch} --tags`);
  } else {
    step(`Pushing to origin/${branch}`);
    execSync(`git push origin ${branch} --tags`, { encoding: 'utf-8' });
    ok('Pushed');
  }

  // Done
  console.log(`\n${GREEN}========================================${NC}`);
  console.log(`${GREEN}  Released v${next}${NC}`);
  console.log(`${GREEN}========================================${NC}\n`);
  console.log('Next step:');
  console.log('  CI will build and create a GitHub release.\n');
  console.log(`To undo this release:`);
  console.log(`  ./scripts/release.ts --undo`);
}

main()
  .catch((err) => {
    console.error('Release script failed:', err);
    process.exit(1);
  })
  .finally(() => rl.close());
