---
name: beyin-doktor
description: İkinci beyin (beyin/) sağlık kontrolü ve onarımı. Hook çalışmıyor, günlük oluşmuyor, reflection eksik veya işlenmemiş transkript uyarısı görüldüğünde kullan.
---
# beyin-doktor

## Ne zaman
- Bağlamda `⚠️ REFLECTION EKSİK` veya `⚠️ İŞLENMEMİŞ TRANSKRİPT` görünce.
- pc "hafıza çalışmıyor / hatırlamadın" dediğinde.
- Haftada bir rutin.

## Adımlar
1. `node .beyin/beyin.mjs doctor` çalıştır; tabloyu oku.
2. `<vault>/projects/<proje>/.state/health.json` içinde hata varsa kaynağını bul (özetleyici CLI yok mu, timeout mu, transcript yolu mu).
3. `<vault>/projects/<proje>/.state/pending-flush.md` varsa: içeriği kendin özetle (Bağlam / Önemli Konuşmalar / Alınan Kararlar / Öğrenilenler / Yapılacaklar), `beyin/daily/YYYY-MM-DD.md` dosyasına ekle, dosyayı sil.
4. `<vault>/projects/<proje>/.state/needs_reflection` varsa: son günlüğe bak, neyin eksik kaldığını yaz, `Last-Session.md`'yi güncelle, dosyayı sil.
5. Derleme gecikmişse: `node .beyin/beyin.mjs compile --force` (CLI varsa) ya da `--print-prompt` → JSON üret → `--apply`.
6. Yapısal bir sorun bulduysan (hook satırı silinmiş, dosya taşınmış) düzelt ve `Kurallar.md`'ye neden olduğunu yaz.
7. pc'e 3 satırlık rapor: ne bozuktu, ne yaptın, tekrar etmesin diye ne değişti.
