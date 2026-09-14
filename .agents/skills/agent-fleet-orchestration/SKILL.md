---
name: agent-fleet-orchestration
description: Paralel subagent şeritleriyle hızlı çalışma protokolü — bağlam hijyeni, disjoint alan ataması, tek kapı kuralı. Devin `run_subagent` ile uygulanır.
---

# Ajan Filosu Orkestrasyonu

Amaç hız VE bağlam hijyeni: ana oturum 100k+ token ham dosya okursa uzun görevde kalitesi düşer. Okumayı ve disjoint yazmayı delege et, kararı ana oturumda ver.

## Şerit tipleri (Devin eşlemesi)
| Şerit | Profil | Ne yapar |
|---|---|---|
| Mimar (ana oturum) | — | Plan, karar, entegrasyon, son onay, paylaşılan dosyalar |
| Okuma şeridi | `subagent_explore` | Dosya/doküman tarar, **özet** döner (asla yazmaz) |
| Yazma şeridi | `subagent_general` (background) | Tek bir alanda kod yazar |
| Doğrulama şeridi | `subagent_general`/`subagent_explore` temiz kontekst | Bağımsız DoD kontrolü |

Okuma şeritleri serbestçe paralelleşir. Yazma şeritleri **asla aynı dosya/alanda** paralel olmaz.

## Brief kuralı (en sık yapılan hata)
Her subagent brief'i **kendi kendine yeterli** olmalı: görev, ilgili dosya yolları, alan sınırı (hangi dosyalara DOKUNMAYACAĞI), kabul kriteri, çıktı formatı. Subagent senin bağlamını görmez. Çıktı formatını baştan sabitle (ör. "en fazla 30 satır, madde madde, dosya:satır referanslı").

## Alan ataması
Eşzamanlı yazma şeritlerine **kesişmeyen** alan ver (lib/r2 / lib/operations / lib/content / components). Paylaşılan dosyalar (nav, layout, globals.css, database.types.ts, package.json) tek şeride veya ana oturuma aittir — brief'te açıkça yaz.

## Tek kapı (single gate)
Subagent'ın "bitti" demesi kanıt değil, iddiadır. Birleştirme, typecheck/lint/build ve kabul **her zaman** ana oturumda ve tüm şeritler bittikten sonra yapılır. Üreten kendi işini onaylamaz (bkz. `verification-protocol`).

## Ölçek kuralları
- Pratik tavan ~5 eşzamanlı şerit (kullanıcı hedefi); başlatmaları aynı blokta paralel yap.
- **Sessiz şerit ölü şerittir:** ilerlemeyen şeridi aynı brief ile yeniden başlat, bekleme.
- Subagent'lara commit yaptırma — commit ana oturumda, şerit başına ayrı mesajla.
- Basit işte maksimum effort kullanma; effort'u işin ağırlığına göre seç.

## Yapma
- Tüm kod tabanını ana oturumda okutma (hedefli arama: grep + dosya adı).
- Ham komut çıktısını/HTML'i bağlama alma — özetini al.
- Aynı bug'da 3 başarısız denemeden sonra devam etme: geri al, temiz bağlamla yeniden başla.

## Definition of Done
Ana oturumun bağlamında sadece kararlar ve özetler var; ham dosya taramaları şeritlerde kaldı. Her şeridin çıktısı tek kapıdan geçti ve sonuç `backlog.md` + vault günlüğüne yazıldı.
