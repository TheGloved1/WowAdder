#!/usr/bin/env bun

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const rl = readline.createInterface({ input, output });
const ask = (q: string) => rl.question(q);
const checkYesOrNo = (ans: string) => ans.toLowerCase() === "n";

const RED = "\x1b[0;31m";
const GREEN = "\x1b[0;32m";
const YELLOW = "\x1b[1;33m";
const BLUE = "\x1b[0;34m";
const DIM = "\x1b[2m";
const NC = "\x1b[0m";

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

async function main() {
  // ---------------------------------------------------------------------------
  // Parse argument
  // ---------------------------------------------------------------------------

  const args = process.argv.slice(2);
  const skipChangelog = args.includes("--no-changelog");
  const arg = args.find((a) => a !== "--no-changelog") ?? "";
  if (!arg) {
    console.log(`
Usage: ./scripts/release.ts [major|minor|patch|x.y.z]

Examples:
  ./scripts/release.ts patch   # 0.1.8 -> 0.1.9
  ./scripts/release.ts minor   # 0.1.8 -> 0.2.0
  ./scripts/release.ts major   # 0.1.8 -> 1.0.0
  ./scripts/release.ts 0.2.0   # explicit version
`);
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // Check required tools
  // ---------------------------------------------------------------------------

  for (const cmd of ["git"]) {
    try {
      execSync(`where ${cmd}`, { stdio: "ignore" });
    } catch {
      try {
        execSync(`command -v ${cmd}`, { stdio: "ignore" });
      } catch {
        fail(`Required tool not found: ${cmd}`);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Read current version
  // ---------------------------------------------------------------------------

  const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
  const current = pkg.version as string;
  const [maj, min, pat] = current.split(".").map(Number);

  let next: string;
  if (arg === "major") {
    next = `${maj + 1}.0.0`;
  } else if (arg === "minor") {
    next = `${maj}.${min + 1}.0`;
  } else if (arg === "patch") {
    next = `${maj}.${min}.${pat + 1}`;
  } else if (/^\d+\.\d+\.\d+$/.test(arg)) {
    next = arg;
  } else {
    fail("Invalid version format. Use x.y.z (e.g., 1.2.3)");
  }

  console.log(`${BLUE}Release${NC}`);
  console.log(`  current : ${DIM}${current}${NC}`);
  console.log(`  next    : ${GREEN}${next}${NC}\n`);

  // ---------------------------------------------------------------------------
  // Pre-flight checks
  // ---------------------------------------------------------------------------

  step("Running pre-flight checks");

  const status = execSync("git status --porcelain", {
    encoding: "utf-8",
  }).trim();
  if (status) fail("Uncommitted changes detected. Commit or stash them first.");
  ok("Working tree clean");

  const branch = execSync("git branch --show-current", {
    encoding: "utf-8",
  }).trim();
  if (branch !== "main") {
    console.log(
      `  ${YELLOW}warning${NC} You are on branch '${branch}', not 'main'.`,
    );
    const reply = await ask("  Continue anyway? (y/N) ");
    if (reply.toLowerCase() !== "y") {
      console.log("Aborted.");
      process.exit(0);
    }
  } // end else: changelog generation

  // ---------------------------------------------------------------------------
  // Confirm
  // ---------------------------------------------------------------------------

  const proceed = await ask(`Proceed with release v${next}? (Y/n) `);
  if (checkYesOrNo(proceed)) {
    console.log("Aborted.");
    process.exit(0);
  }

  // ---------------------------------------------------------------------------
  // Bump versions
  // ---------------------------------------------------------------------------

  step("Updating version numbers");

  // package.json
  pkg.version = next;
  writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
  ok("package.json");
  try {
    execSync("bun run sync-version", { stdio: "inherit" });
    ok("Synced version to Cargo.toml and tauri.conf.json");
  } catch (error) {
    fail("Failed to sync version: " + error);
  }

  // ---------------------------------------------------------------------------
  // Generate changelog
  // ---------------------------------------------------------------------------

  if (skipChangelog) {
    ok("SKIP — changelog generation disabled");
  } else {
    step("Generating changelog");

    // Fetch all tags from remote so we can find the last release tag
    execSync("git fetch --tags --force", { stdio: "ignore" });

    let lastTag = "";
    try {
      lastTag =
        execSync('git tag --list "v*" --sort=-creatordate', {
          encoding: "utf-8",
        })
          .trim()
          .split("\n")[0] ?? "";
    } catch {
      // no prior tags
    }

    const range = lastTag ? `${lastTag}..HEAD` : "HEAD";
    const today = new Date().toISOString().slice(0, 10);

    const log = execSync(`git log ${range} --pretty=format:"%s" --reverse`, {
      encoding: "utf-8",
    });
    const lines = log.split("\n").filter(Boolean);

    const added: string[] = [];
    const fixed: string[] = [];
    const changed: string[] = [];
    const other: string[] = [];

    const pattern =
      /^(feat|fix|refactor|perf|build|style|docs|test|chore)(\(.*?\))?!?:\s(.+)$/;

    for (const line of lines) {
      const m = line.match(pattern);
      if (!m) continue;
      const [, type, scope, msg] = m;
      const entry = scope ? `**${scope.slice(1, -1)}**: ${msg}` : msg;
      switch (type) {
        case "feat":
          added.push(entry);
          break;
        case "fix":
          fixed.push(entry);
          break;
        case "refactor":
        case "perf":
        case "style":
          changed.push(entry);
          break;
        default:
          other.push(entry);
          break;
      }
    }

    let entry = `## ${today}`;
    let hasContent = false;

    if (added.length) {
      entry += "\n\n### Added\n\n" + added.map((e) => `- ${e}`).join("\n");
      hasContent = true;
    }
    if (fixed.length) {
      entry += "\n\n### Fixed\n\n" + fixed.map((e) => `- ${e}`).join("\n");
      hasContent = true;
    }
    if (changed.length) {
      entry += "\n\n### Changed\n\n" + changed.map((e) => `- ${e}`).join("\n");
      hasContent = true;
    }
    if (other.length) {
      entry += "\n\n### Other\n\n" + other.map((e) => `- ${e}`).join("\n");
      hasContent = true;
    }
    if (!hasContent) {
      entry += "\n\nMaintenance release.";
    }

    // Insert into CHANGELOG.md
    const changelogPath = "CHANGELOG.md";
    if (existsSync(changelogPath)) {
      const changelog = readFileSync(changelogPath, "utf-8");
      const marker = "\n## [";
      const idx = changelog.indexOf(marker);
      if (idx !== -1) {
        const before = changelog.slice(0, idx);
        const after = changelog.slice(idx);
        writeFileSync(changelogPath, before + "\n\n" + entry + "\n" + after);
      } else {
        writeFileSync(
          changelogPath,
          changelog.trimEnd() + "\n\n" + entry + "\n",
        );
      }
    } else {
      // Create CHANGELOG.md if it doesn't exist
      writeFileSync(changelogPath, "# Changelog\n\n" + entry + "\n");
    }
    ok("CHANGELOG.md");

    // Write tag-specific changelog for GitHub release body
    const changelogsDir = "changelogs";
    if (!existsSync(changelogsDir)) {
      mkdirSync(changelogsDir, { recursive: true });
    }
    writeFileSync(`${changelogsDir}/v${next}.md`, entry);
    ok(`${changelogsDir}/v${next}.md`);

    // Preview
    console.log(`\n${DIM}--- changelog preview ---${NC}`);
    console.log(entry);
    console.log(`${DIM}--- end preview ---${NC}\n`);

    const looksGood = await ask("Does the changelog look good? (Y/n) ");
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

  step("Creating release commit");

  const filesToAdd = [
    "package.json",
    "src-tauri/Cargo.toml",
    "src-tauri/Cargo.lock",
    "src-tauri/tauri.conf.json",
    ...(skipChangelog ? [] : ["CHANGELOG.md", `changelogs/v${next}.md`]),
  ];
  execSync(`git add ${filesToAdd.join(" ")}`, { encoding: "utf-8" });
  execSync(`git commit -m "chore: release v${next}"`, { encoding: "utf-8" });
  ok("Committed");

  step(`Creating tag v${next}`);
  execSync(`git tag -a "v${next}" -m "Release v${next}"`, {
    encoding: "utf-8",
  });
  ok("Tagged");

  // ---------------------------------------------------------------------------
  // Push to remote
  // ---------------------------------------------------------------------------

  step(`Pushing to origin/${branch}`);
  execSync(`git push origin ${branch} --tags`, { encoding: "utf-8" });
  ok("Pushed");

  // ---------------------------------------------------------------------------
  // Done
  // ---------------------------------------------------------------------------

  console.log(`\n${GREEN}========================================${NC}`);
  console.log(`${GREEN}  Released v${next}${NC}`);
  console.log(`${GREEN}========================================${NC}\n`);
  console.log("Next step:");
  console.log("  CI will build and create a GitHub release.\n");
  console.log(`To undo this release:`);
  console.log(`  git tag -d v${next} && git reset --soft HEAD~1`);
  console.log(`  git push origin :refs/tags/v${next}`);
}

main()
  .catch((err) => {
    console.error("Release script failed:", err);
    process.exit(1);
  })
  .finally(() => rl.close());
