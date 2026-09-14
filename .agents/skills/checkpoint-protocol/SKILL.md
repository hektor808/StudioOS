---
name: checkpoint-protocol
description: Uzun süreli/otonom (AFK) çalışma sırasında ilerlemenin kaybolmamasını sağlayan commit + log disiplini.
---

# Checkpoint Protocol

## Ne zaman uygulanır
30 dakikadan uzun süren her görevde, veya anlamlı bir iş birimi tamamlandığında.

## Kurallar
- Her anlamlı iş biriminden sonra git commit at (açıklayıcı mesajla — "ne yapıldı" + "neden").
- `backlog.md`'yi güncelle: "Tamamlanan" bölümüne taşı veya "Devam Eden"de ilerleme notu bırak.
- Bir görev tam bitmeden oturum/kontekst kapanacaksa, `notes.md`'ye kısa bir "kaldığın yer" özeti yaz.
- Aynı hata/bug'da art arda 3 başarısız düzeltme denemesinden sonra: `git checkout`/`git revert` ile geri al, temiz bir kontekstte yeniden başla, denenenlerin özetini `backlog.md`'den oku ve yeni kontekste ver.

## Definition of Done
- Herhangi bir noktada kesinti olsa (crash, oturum kapanması, AFK süresinin dolması) bir sonraki oturum `backlog.md` + `notes.md`'yi okuyarak kaldığı yerden devam edebiliyor mu? Cevap her zaman "evet" olmalı.
