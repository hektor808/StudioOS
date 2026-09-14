#!/usr/bin/env node
// beyin shim: bu repo hafızasını merkezi vault'ta tutar. Ayarlar: .beyin/beyin.json
// Vault farklı makinelerde farklı yerde olabilir (Windows masaüstü / Devin VM / CI):
// aşağıdaki adaylar sırayla denenir, ilk bulunan kullanılır.
// Kullanım: node .beyin/beyin.mjs <start|end|hook ...|compile|doctor|repair>
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const cfg = JSON.parse(fs.readFileSync(path.join(here, "beyin.json"), "utf8"));
const home = os.homedir();
const repoName = cfg.vaultRepo ? cfg.vaultRepo.split("/").pop() : null;

function expand(p) {
  if (!p) return null;
  const s = p.startsWith("~") ? path.join(home, p.slice(1)) : p;
  return path.isAbsolute(s) ? path.normalize(s) : path.resolve(here, s);
}

const candidates = [
  process.env.BEYIN_VAULT,
  cfg.vault,
  ...(cfg.vaultAlt || []),
  ...(repoName
    ? [
        path.join(home, "repos", repoName, "beyin"),
        path.join(home, repoName, "beyin"),
        path.join(repoRoot, "..", repoName, "beyin"),
      ]
    : []),
  path.join(home, "repos", "beyin", "beyin"),
  path.join(home, "beyin", "beyin"),
  path.join(repoRoot, "..", "Obsidian", "beyin"),
]
  .map(expand)
  .filter(Boolean);

const vault = candidates.find((v) => fs.existsSync(path.join(v, "engine", "beyin.mjs")));

if (!vault) {
  const isHook = process.argv[2] === "hook";
  const clone = cfg.vaultRepo
    ? `\nBu makinede vault yok. Klonla:\n  git clone <remote>/${cfg.vaultRepo} ${path.join(home, "repos", repoName)}\n`
    : `\n.beyin/beyin.json içindeki "vault" yolunu kontrol et ya da "vaultRepo" ekle.\n`;
  process.stderr.write(
    `beyin: vault bulunamadı. Denenen yollar:\n${candidates.map((c) => "  - " + c).join("\n")}\n${clone}`
  );
  if (isHook) process.stdout.write("{}\n");
  process.exit(isHook ? 0 : 1);
}

process.env.BEYIN_VAULT = vault;
process.env.BEYIN_PROJECT = cfg.project;
process.env.BEYIN_ROOT = repoRoot;
await import(pathToFileURL(path.join(vault, "engine", "beyin.mjs")).href);
