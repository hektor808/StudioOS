# backlog.md — StudioOS Aktif Hedefler & Daylog

## Aktif Hedefler
- **Tüm planlı fazlar tamamlandı** (Faz 0-5). Kalan iş: Supabase projesi yeniden ayağa kaldırılınca migration apply + types regen + canlı E2E.

## Devam Eden
| İş | Şerit | Durum |
|---|---|---|
| Faz 5 Task 1-2 (migration + service + actions) | Agent df46c80e | ✅ commit'li (`2508680`, `7a4d7cc`) |
| Faz 5 Task 3 (ListeningLinkManager + studio wiring) | Agent f231e33b | ✅ commit'li (`71a2eb5`) |
| Faz 5 Task 4 (public /listen/[token] room + headers) | Agent 8d91d74c | ✅ commit'li (`4346822` + lint fix `15d2313`) |
| Faz 5 Task 5 (session/refresh API) | Agent df46c80e | ✅ commit'li (`af453dd`) |
| Faz 5 Task 6 (lib/ai + chat API) | Agent 9ccd9eac | ✅ commit'li (`d92e498`) |
| Faz 5 Task 7 (veo-ai page + chat + nav + dashboard) | Ana oturum + 9ccd9eac | ✅ commit'li (`15d2313`) |
| Faz 5 Task 8 gates (tsc/lint/build/secrets/public-E2E) | Ana oturum | ✅ geçti — merge/push kaldı |

## Blokaj / Onay Bekleyen
- **🔴 Supabase projesi silinmiş (KRİTİK):** `zjofmuevrvprbenjylht.supabase.co` DNS çözünmüyor (NXDOMAIN → pause değil, silinmiş). `SUPABASE_DB_URL` pooler da `tenant not found` dönüyor. Etki: auth, tüm DB sorguları, migration apply, `gen types`, her E2E. **Kullanıcı aksiyonu gerekli:** (a) yeni Supabase projesi + yeni env değerleri, veya (b) local `npx supabase start` (Docker gerekir) ile lokal geliştirme. Kod yazımı/typecheck/build etkilenmez — devam ediliyor.
- **R2 credential'ları eksik** (`.env.local`'de yok): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`. Kod lazy-validated yazılacak; **canlı upload E2E'si credential gelmeden yapılamaz** (Task 9 Step 4 kısmen blokeli). `UPLOAD_GRANT_SECRET` üretilip `.env.local`'e eklendi (her iki kopya).
- **Özetleyici CLI yok** (claude/gemini CLI kurulu değil): beyin `end` için ajanın kendi yazdığı `--summary-file` kullanılır (degraded ama çalışır).
- Phase 5 `OPENAI_API_KEY` mevcut; `OPENAI_CHAT_MODEL` opsiyonel (default `gpt-4.1-mini`).

## Tamamlanan (daylog)
### 2026-09-15 (devam)
- **Faz 4 merged + pushed:** `b76bba7` → `origin/main`. Gate'ler: tsc ✅ lint ✅ build ✅ secret-scan ✅. Content modülü, nav aktivasyonu, phosphor SSR fix (`/dist/ssr` server-component konvansiyonu).
- **Faz 5 tamamlandı (7 task, 7 commit):** listening_links (hash-only token, 32B base64url, SHA-256 hex persist; revoke/expiry; service-role-only tablo + security-definer RPC'ler + can_manage_track), `/listen/[token]` public room (dashboard dışı, guest gate 2-60, memory-only isim, watermark, bağımsız audio, 300s signed URL + race-safe refresh), `/api/listen/{session,refresh}` (full revalidation, 400/410/503, sensitive headers), VEO AI (incremental hash-diff index, fail-closed `pending`, 10/dk rate limit RPC, grounded answer + text-only source chips, ID yok), `/veo-ai` route + 5-destinasyon nav + dashboard canlı sayımlar.
- **Faz 5 gate'leri:** tsc 0 hata ✅ lint 0 warning ✅ build ✅ (14/14 route; `/veo-ai`+`/listen/[token]`+3 API). Live check (dev server): public token sayfası unavailable-state render + noindex/no-referrer header ✅; session 503/400 edge'ler ✅; guestName strict-reject 400 ✅; veo-ai chat unauth → 401 ✅; `/veo-ai` → 307→/login ✅. Client bundle secret taraması temiz; rawToken yalnız boundary dosyalarda; `.env.local` ignored.
- **Bilinen kozmetik sapmalar:** session route `refreshListeningSchema`'yı paylaşıyor (body `{token}` strict — plan adı `sessionRequestSchema`, davranış aynı); stale `dashboard-home.test.tsx`/nav testleri Faz-2 placeholder'ını assert ediyor (plan: test dosyasına dokunma → `summaryResult` opsiyonel prop ile tip uyumu sağlandı).
- **Merge'e hazır:** `phase-5-listening-ai` branch'i temiz → main'e `--no-ff` merge + push.

### 2026-09-15
- Beyin kurulumu: `setup.mjs link` → vault `projects/studioos/` + repo `.beyin/` shim + `.claude`/`.gemini` hook ayarları + `AGENTS.md` router'ı; doctor ✅ (tek kırmızı: özetleyici CLI).
- voe-ai standing-rules port edildi: `AGENTS.md` genişletildi, `decisions.md`/`backlog.md`/`notes.md`/`memory.json`/`AUTONOMY_POLICY.md`/`REPORT_STANDARD.md` oluşturuldu, `agents/` rolleri + `.agents/skills/` protokol skill'leri eklendi.
- Faz 0-3 önceden tamamlanmıştı (git log: `c9bc9ca merge: integrate VEO OS phase 3`).
