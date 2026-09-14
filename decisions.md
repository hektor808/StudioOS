# decisions.md — StudioOS Sabit Kararlar

## Mimari (otorite: VEO_OS_MASTER_PLAN.md)
- Next.js 14.2 App Router + React 18 + TS 5; `(auth)` / `(dashboard)` route group'ları.
- Supabase (Postgres + Auth + Storage) veri katmanı; browser istekleri request-scoped client + RLS üzerinden.
- Service-role yalnız `src/lib/supabase/admin.ts` (`server-only`); doğrudan `track_versions`/`files` INSERT'i browser'a kapalı — kayıt RPC'leri üzerinden.
- Ağır dosyalar (1GB+) tarayıcıdan doğrudan Cloudflare R2'ye presigned PUT; Next.js sadece metadata JSON taşır. Tek PUT, 5 GiB tavan; multipart ertelendi.
- Presigned PUT 600 sn; completion grant 1800 sn HMAC-SHA256 (versioned, user/track/key/kind/MIME/size/file-type bağlı).
- `storage_url` her zaman private object key; asla HTTP URL değil. İmzalı URL'ler kısa ömürlü (download 5 dk).
- GlobalPlayer `(dashboard)/layout.tsx`'te kalıcı; state Zustand `useAudioStore`; sayfa geçişinde müzik durmaz.
- `VEO_TIME_ZONE` server-only, geçerli IANA, default `UTC`; geçersizde stabil hata durumu.

## Faz Durumu Sabitleri
- Faz 0-3 tamam ve `main`'de (son merge `c9bc9ca`). DB'de users/tracks/track_versions/comments/files/actions/content_ideas + RLS aktif.
- Faz 4 = uploads (R2+Uppy) + operations + content. Faz 5 = external listening + VEO AI (pgvector + OpenAI, streaming yok, tool yok, LangChain YOK — direct SDK).
- Faz planları: test dosyası oluşturma/değiştirme/çalıştırma YASAK. Doğrulama: `npx tsc --noEmit`, `npm run lint`, `npm run build`, tarayıcı/ağ/güvenlik incelemesi.
- Phase 5: raw listening token 32 byte base64url; sadece SHA-256 hex digest saklanır; ham token yalnız create-response'ta bir kez döner.
- Phase 5: `veo_documents` embedding `text-embedding-3-small` 1536-dim, HNSW `vector_cosine_ops`, `<=>` sıralama.

## Beyin/Hafıza Kararları (2026-09-15)
- Proje resmi `setup.mjs link` ile vault'a bağlandı: `C:/Users/pc/Desktop/Obsidian/beyin` → `projects/studioos/`.
- Görev durumu repoda (`backlog.md`/`notes.md`/`decisions.md`/`memory.json`); kalıcı beyin vault'ta (`projects/studioos/`). voe-ai ile aynı ikili model.
- Yeni protokol skill'leri `.agents/skills/` altında (repo'nun mevcut skill konumu; harness-nötr — `.devin/` yerine bilinçli seçim).
- Commit trailer: plan dosyaları `Co-Authored-By: Claude` diyor ama harness Devin → `Generated with Devin` + `Co-Authored-By: Devin` kullanılır.

## Otomatik Alınan Kararlar (AUTONOMY_POLICY §4)

### [Faz 4 / 2026-09-15] — Beyin kurulum mimarisi
- Seçenekler: A) voe-ai'nin `.claude/hooks` PowerShell sistemini birebir kopyala B) Resmi `setup.mjs link` + repo hafıza dosyaları C) Sadece repo dosyaları, vault'suz
- Trade-off: A Devin'de hook çalışmaz (Claude-Code'a özgü) ve vault bağlantısı kopuk kalır; C kalıcı hafızayı kaybeder; B resmi mekanizma + voe-ai çalışma dosyaları, hook'lu harness'larda da çalışır.
- Seçilen: B
- Neden: Resmi mekanizma zaten vault yapısını ve shim'i üretiyor; `.claude/settings.json` hook'ları Claude Code'a geçilirse de çalışır. voe-ai'nin repo-seviyesi notes/backlog/decisions disiplini üstüne eklendi.

### [Faz 4 / 2026-09-15] — Paralel şerit modeli (5 agent)
- Seçenekler: A) Sıralı tek-oturum implementasyon B) 4 yazma şeridi + 1 okuma şeridi, ana oturum entegrasyon C) Her şerit kendi branch'inde
- Trade-off: A yavaş; C merge çakışması riski yüksek (paylaşılan lock/types dosyaları); B aynı çalışma ağacında disjoint alanlar — çakışmasız, tek kapı review.
- Seçilen: B
- Neden: `agent-fleet-orchestration` skill'i: yazma şeritleri kesişmeyen alanlarda paralel, birleştirme/kabul tek kapıda (ana oturum).
