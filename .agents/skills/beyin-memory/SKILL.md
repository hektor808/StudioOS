---
name: beyin-memory
description: İkinci beyin vault'unu (Obsidian, C:/Users/pc/Desktop/Obsidian/beyin) hook'suz harness'ta (Devin, düz terminal) okuma/yazma protokolü — .beyin shim üzerinden.
---

# İkinci Beyin (beyin vault) Protokolü

## Katmanlar — hangi bilgi nereye
| Bilgi | Yer |
|---|---|
| Görev durumu, faz, aktif iş, blokaj | Repoda `backlog.md` / `notes.md` / `decisions.md` / `memory.json` |
| Kişi (pc kim, tercihleri) | `<vault>/Companion/{Core,pc,Kurallar}.md` |
| Projenin kalıcı beyni | `<vault>/projects/studioos/{Proje,Last-Session,Threads,Kurallar}.md` |
| Oturum kaydı | `<vault>/projects/studioos/daily/YYYY-MM-DD.md` |
| Derlenmiş kalıcı bilgi | `<vault>/projects/studioos/knowledge/` |

Vault kökü `.beyin/beyin.json` → `vault` alanı. Repo tarafında yalnızca `.beyin/` shim'i vardır; dosyalar vault'ta yaşar.

## Komutlar (hook olmayan ortam — ZORUNLU)
```
node .beyin/beyin.mjs start                       # oturum başı: bağlamı enjekte eder
node .beyin/beyin.mjs end --summary-file ozet.md  # oturum sonu: özet günlüğe (#### Bağlam / Önemli Konuşmalar / Alınan Kararlar / Öğrenilenler / Yapılacaklar)
node .beyin/beyin.mjs doctor                      # sağlık kontrolü
node .beyin/beyin.mjs sync                        # vault başka makinede/klonluysa: pull + commit + push
```
`end` çalıştırmadan bitirmek = hafıza kaybı. Özetleyici CLI (claude/gemini) yoksa ajan özeti kendisi `ozet.md` olarak yazar ve `end --summary-file` ile işler.

## Değişmez kurallar
- **pc seni düzelttiyse** ("bunu böyle yapma") kural + neden olarak yazılır — genelse `Companion/Kurallar.md`, projeye özelse `projects/studioos/Kurallar.md`.
- **Kararın gerekçesi** karara eşlik eder; "ne" değil "neden" kaydedilir (repo `decisions.md` + vault `Proje.md` › Sabit kararlar).
- **Diğer projelerin beynini okuma.** Bağlam bütçesi kişisel çekirdek + studioos'tur.
- **Sır yazma:** anahtar/token vault'a asla girmez (vault git'te ve senkronize).
- **Vault kullanıcının notlarıdır:** mevcut dosyaların üzerine yazma, ekle. `Last-Session.md` güncellenirken önceki oturum "Previous Sessions" altına indirilir.

## Definition of Done
Oturum kapanırken: `backlog.md`/`notes.md`/`decisions.md` güncellendi, `end --summary-file` ile vault günlüğüne giriş düştü, `Last-Session.md` güncellendi — ve sıfır bağlamlı yeni bir oturum yalnızca bu dosyalardan nerede kalındığını öğrenebiliyor.
