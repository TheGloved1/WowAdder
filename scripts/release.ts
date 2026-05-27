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

function generateChangelog(next: string): { changelogEntry: string; releaseEntry: string } {
  execSync('git fetch --tags --force', { stdio: 'ignore' });

  let lastTag = '';
  try {
    lastTag =
      execSync('git tag --list "v*" --sort=-creatordate', {
        encoding: 'utf-8',
      })
        .trim()
        .split('\n')[0] ?? '';
  } catch {
    // no prior tags
  }

  const range = lastTag ? `${lastTag}..HEAD` : 'HEAD';
  const today = new Date().toISOString().slice(0, 10);

  const log = execSync(`git log ${range} --pretty=format:"%s" --reverse`, {
    encoding: 'utf-8',
  });
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
      const parse = (v: string) => v.split('.').map(Number);
      const [am, an, ap] = parse(a.version);
      const [bm, bn, bp] = parse(b.version);
      return am - bm || an - bn || ap - bp;
    })
    .reverse();
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

  // Verify we're on the right branch
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

  // Clean up undo log after successful revert
  rmSync(selected.path);
  ok(`Cleaned up ${selected.path}`);

  console.log(`\n${GREEN}${'='.repeat(40)}${NC}`);
  console.log(`${GREEN}  Undid release v${log.version.to}${NC}`);
  console.log(`${GREEN}${'='.repeat(40)}${NC}\n`);
}

async function main() {
  // ---------------------------------------------------------------------------
  // Parse argument
  // ---------------------------------------------------------------------------

  const args = process.argv.slice(2);
  const isUndo = args.includes('--undo');
  const skipChangelog = args.includes('--no-changelog');
  const changelogOnly = args.includes('changelog');
  const arg = args.find((a) => a !== '--no-changelog' && a !== 'changelog' && a !== '--undo') ?? '';

  if (isUndo) {
    await undoRelease();
    rl.close();
    process.exit(0);
  }
  if (!arg && !changelogOnly) {
    console.log(`
Usage: ./scripts/release.ts [major|minor|patch|x.y.z|changelog|--undo]

Examples:
  ./scripts/release.ts patch       # 0.1.8 -> 0.1.9
  ./scripts/release.ts minor       # 0.1.8 -> 0.2.0
  ./scripts/release.ts major       # 0.1.8 -> 1.0.0
  ./scripts/release.ts 0.2.0       # explicit version
  ./scripts/release.ts changelog         # preview changelog for next release
  ./scripts/release.ts changelog patch   # preview changelog with a patch bump
  ./scripts/release.ts --undo            # revert the most recent release
`);
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // Check required tools
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Read current version
  // ---------------------------------------------------------------------------

  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
  const current = pkg.version as string;
  const [maj, min, pat] = current.split('.').map(Number);

  let next: string;
  if (arg === 'major') {
    next = `${maj + 1}.0.0`;
  } else if (arg === 'minor') {
    next = `${maj}.${min + 1}.0`;
  } else if (arg === 'patch') {
    next = `${maj}.${min}.${pat + 1}`;
  } else if (/^\d+\.\d+\.\d+$/.test(arg)) {
    next = arg;
  } else if (changelogOnly && !arg) {
    next = current;
  } else {
    fail('Invalid version format. Use x.y.z (e.g., 1.2.3)');
  }

  console.log(`${BLUE}Release${NC}`);
  console.log(`  current : ${DIM}${current}${NC}`);
  console.log(`  next    : ${GREEN}${next}${NC}\n`);

  // ---------------------------------------------------------------------------
  // Changelog-only mode — preview without making changes
  // ---------------------------------------------------------------------------

  if (changelogOnly) {
    step('Generating changelog preview');
    const { changelogEntry, releaseEntry } = generateChangelog(next);
    console.log(`\n${BLUE}=== CHANGELOG.md entry ===${NC}\n`);
    console.log(changelogEntry);
    console.log(`\n${BLUE}=== Release body (changelogs/v${next}.md) ===${NC}\n`);
    console.log(releaseEntry);
    rl.close();
    process.exit(0);
  }

  // ---------------------------------------------------------------------------
  // Pre-flight checks
  // ---------------------------------------------------------------------------

  step('Running pre-flight checks');

  const status = execSync('git status --porcelain', {
    encoding: 'utf-8',
  }).trim();
  if (status) fail('Uncommitted changes detected. Commit or stash them first.');
  ok('Working tree clean');

  const branch = execSync('git branch --show-current', {
    encoding: 'utf-8',
  }).trim();
  if (branch !== 'main') {
    console.log(`  ${YELLOW}warning${NC} You are on branch '${branch}', not 'main'.`);
    const reply = await ask('  Continue anyway? (y/N) ');
    if (reply.toLowerCase() !== 'y') {
      console.log('Aborted.');
      process.exit(0);
    }
  } // end else: changelog generation

  // ---------------------------------------------------------------------------
  // Confirm
  // ---------------------------------------------------------------------------

  const proceed = await ask(`Proceed with release v${next}? (Y/n) `);
  if (checkYesOrNo(proceed)) {
    console.log('Aborted.');
    process.exit(0);
  }

  // ---------------------------------------------------------------------------
  // Snapshot files before any changes (for undo log)
  // ---------------------------------------------------------------------------

  const snapshotFiles = [
    'package.json',
    'src-tauri/Cargo.toml',
    'src-tauri/Cargo.lock',
    'src-tauri/tauri.conf.json',
    ...(skipChangelog ? [] : ['CHANGELOG.md']),
  ];
  const fileSnapshot = captureFileSnapshot(snapshotFiles);

  // ---------------------------------------------------------------------------
  // Bump versions
  // ---------------------------------------------------------------------------

  step('Updating version numbers');

  // package.json
  pkg.version = next;
  writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  ok('package.json');
  try {
    execSync('bun run sync-version', { stdio: 'inherit' });
    ok('Synced version to Cargo.toml, Cargo.lock, and tauri.conf.json');
  } catch (error) {
    fail('Failed to sync version: ' + error);
  }

  // ---------------------------------------------------------------------------
  // Generate changelog
  // ---------------------------------------------------------------------------

  if (skipChangelog) {
    ok('SKIP — changelog generation disabled');
  } else {
    step('Generating changelog');
    const { changelogEntry, releaseEntry } = generateChangelog(next);

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

    // Write tag-specific changelog for GitHub release body
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
      console.log(`
Edit CHANGELOG.md manually, then run:
  git add package.json CHANGELOG.md
  git commit -m "chore: release v${next}"
  git tag -a v${next} -m "Release v${next}"
  git push origin main --tags
`);
      process.exit(0);
    }
  } // end else: changelog generation

  // ---------------------------------------------------------------------------
  // Git commit and tag
  // ---------------------------------------------------------------------------

  step('Creating release commit');

  const filesToAdd = [
    'package.json',
    'src-tauri/Cargo.toml',
    'src-tauri/Cargo.lock',
    'src-tauri/tauri.conf.json',
    ...(skipChangelog ? [] : ['CHANGELOG.md', `changelogs/v${next}.md`]),
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
  execSync(`git tag -a "v${next}" -m "Release v${next}"`, {
    encoding: 'utf-8',
  });
  ok('Tagged');

  // ---------------------------------------------------------------------------
  // Push to remote
  // ---------------------------------------------------------------------------

  step(`Pushing to origin/${branch}`);
  execSync(`git push origin ${branch} --tags`, { encoding: 'utf-8' });
  ok('Pushed');

  // ---------------------------------------------------------------------------
  // Done
  // ---------------------------------------------------------------------------

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
