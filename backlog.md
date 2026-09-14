# backlog.md — StudioOS Aktif Hedefler & Daylog

## Aktif Hedefler
- **Faz 4** (uploads + operations + content): plan `docs/superpowers/plans/2026-08-11-veo-os-phase-4-uploads-operations-content.md`, branch `phase-4-uploads-operations-content`.
- **Faz 5** (external listening + VEO AI): plan `docs/superpowers/plans/2026-08-11-veo-os-phase-5-listening-ai.md` — Faz 4 entegre olmadan başlamaz.

## Devam Eden
| İş | Şerit | Durum |
|---|---|---|
| Faz 4 Task 1-4: R2 boundary, presign, completion, download, migration, types | Agent-1 (backend) | başlatılıyor |
| Faz 4 Task 5: R2Uploader + Studio files/download UI | Agent-2 (studio-ui) | başlatılıyor |
| Faz 4 Task 6: Operations modülü | Agent-3 | başlatılıyor |
| Faz 4 Task 7: Content modülü | Agent-4 | başlatılıyor |
| Faz 5 recon + entegrasyon yüzeyi raporu | Agent-5 (scout, read-only) | başlatılıyor |
| Faz 4 Task 8-9: nav/shared presentation + final gates + merge | Ana oturum | şeritler sonrası |

## Blokaj / Onay Bekleyen
- **R2 credential'ları eksik** (`.env.local`'de yok): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`. Kod lazy-validated yazılacak; **canlı upload E2E'si credential gelmeden yapılamaz** (Task 9 Step 4 kısmen blokeli).
- **Özetleyici CLI yok** (claude/gemini CLI kurulu değil): beyin `end` için ajanın kendi yazdığı `--summary-file` kullanılır (degraded ama çalışır).
- Phase 5 `OPENAI_API_KEY` mevcut; `OPENAI_CHAT_MODEL` opsiyonel (default `gpt-4.1-mini`).

## Tamamlanan (daylog)
### 2026-09-15
- Beyin kurulumu: `setup.mjs link` → vault `projects/studioos/` + repo `.beyin/` shim + `.claude`/`.gemini` hook ayarları + `AGENTS.md` router'ı; doctor ✅ (tek kırmızı: özetleyici CLI).
- voe-ai standing-rules port edildi: `AGENTS.md` genişletildi, `decisions.md`/`backlog.md`/`notes.md`/`memory.json`/`AUTONOMY_POLICY.md`/`REPORT_STANDARD.md` oluşturuldu, `agents/` rolleri + `.agents/skills/` protokol skill'leri eklendi.
- Faz 0-3 önceden tamamlanmıştı (git log: `c9bc9ca merge: integrate VEO OS phase 3`).
