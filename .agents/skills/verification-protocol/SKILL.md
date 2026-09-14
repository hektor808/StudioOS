---
name: verification-protocol
description: Herhangi bir görev/faz "bitti" ilan edilmeden önce uygulanması zorunlu bağımsız doğrulama protokolü.
---

# Verification Protocol

## Temel Kural
Üreten agent kendi işini asla onaylamaz. Onay her zaman `qa-verifier` rolünden, **sıfır/temiz kontekstte** gelir.

## Adımlar
1. Üretici, işi bitirdiğini `backlog.md`'ye "İnceleme Bekliyor" olarak işaretler.
2. `qa-verifier`, ilgili PRD bölümünü ve backlog notunu okur (üretici konuşmasını görmez).
3. Gerçek test senaryoları çalıştırılır: mutlu yol + en az 2 uç durum (hatalı girdi, bağlantı kopması vb.).
4. Boş/yüzeysel testler ("sadece geçsin diye" yazılmış assertion'lar) reddedilir — testin gerçekten o davranışı kanıtladığından emin olunur.
5. Sonuç `backlog.md`'ye yazılır: Onaylandı (commit edilebilir) veya Reddedildi (spesifik gerekçeyle, hangi kriterin karşılanmadığı açıkça belirtilerek).

## Definition of Done Şablonu (her görev için doldurulmalı)
- [ ] İlgili PRD maddesi karşılanıyor mu?
- [ ] Hata/uç durumlar ele alınmış mı?
- [ ] `decisions.md`'deki sabit kararlarla çelişki var mı?
- [ ] Gerçek bir test bunu kanıtlıyor mu (evet/hayır + test açıklaması)?
