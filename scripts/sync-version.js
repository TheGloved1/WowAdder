import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf-8"));
const version = pkg.version;
console.log(`Syncing version: ${version}`);

const cargoPath = resolve(root, "src-tauri", "Cargo.toml");
let cargo = readFileSync(cargoPath, "utf-8");
cargo = cargo.replace(/^(version\s*=\s*")[^"]*(")\s*$/m, `$1${version}$2`);
writeFileSync(cargoPath, cargo);
console.log(`  Updated ${cargoPath}`);

const tauriConfPath = resolve(root, "src-tauri", "tauri.conf.json");
const tauriConf = JSON.parse(readFileSync(tauriConfPath, "utf-8"));
tauriConf.version = version;
writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + "\n");
console.log(`  Updated ${tauriConfPath}`);