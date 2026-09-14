# Otonom Çalışma Politikası (AFK Modu)

Bu proje, kullanıcı ekran başında değilken (AFK) uzun süreli ve kesintisiz çalışacak şekilde tasarlanmıştır. Bu dosya, insan onayı beklemeden ilerlerken izlenecek karar verme kurallarını tanımlar.

## 1. İzin/Onay İstemleri
Rutin araç kullanımı onayları (dosya oluşturma/düzenleme, komut çalıştırma, lint/typecheck/build, bağımlılık kurma gibi **geri döndürülebilir** işlemler) otomatik olarak onaylanır — kullanıcı bunları tek tek onaylamak için beklemez.

**İstisna:** Bölüm 3'teki gerçek blokaj kategorileri otomatik onaylanmaz.

## 2. "Hangisini seçmeliyim?" Tipi Kararlar
Bir görev sırasında birden fazla makul yaklaşım arasında seçim yapman gerektiğinde (örn. hangi kütüphane, hangi tasarım deseni, hangi klasör yapısı):

1. Aracın/ekosistemin **önerilen (recommended/default)** seçeneğini seç — `VEO_OS_MASTER_PLAN.md`, `VEO_OS_DESIGN_MANIFESTO.md`, `decisions.md` ve ilgili skill dosyalarındaki yönlendirmelerle çelişmediği sürece.
2. Net bir "resmi öneri" yoksa, planın genel prensipleriyle (basitlik, bakımı kolay, mevcut kararlarla tutarlılık) en uyumlu olanı seç.
3. **Bu seçimi mutlaka kaydet** — bkz. Bölüm 4. Kayıt atlanmadan hiçbir "recommended" seçim yapılmış sayılmaz.

## 3. Gerçek Blokajlar (otomatik karar VERİLMEZ)
Şu durumlarda otomatik ilerleme — dur, `backlog.md`'nin "Blokaj / Onay Bekleyen" bölümüne yaz, o daldan çıkıp başka bağımsız işe geç:

- Bir API key, kimlik bilgisi veya harici hesap gerekiyor ve elinde yok (örn. R2 credential'ları).
- Geri döndürülemez bir veri kaybına yol açabilecek işlem (ör. bir dizini/veritabanını tamamen silme, migration'ı prod DB'ye uygulama).
- Projeyi herkese açık bir yere deploy etmek veya gerçek para harcamak.
- İki yaklaşım arasındaki fark küçük bir teknik tercih değil, **projenin yönünü kökten değiştiren** bir karar.
- **Halüsinasyon Yerine Boş Bırakma:** Hafızada/vault'ta/kodda bulunmayan bir bilgi gerekiyorsa tahmin/uydurma yapılmaz — ilgili alan boş bırakılır veya kullanıcıya açıkça sorulur; asla var olmayan bir veri (track, dosya, sayı, tarih, upload sonucu) uydurulmaz.

## 4. Karar Günlüğü (zorunlu)
"Recommended" bir seçenek otomatik seçildiğinde, bunu `decisions.md`'nin "Otomatik Alınan Kararlar" bölümüne şu formatta ekle:

```
### [Faz/Tarih] — [Konu başlığı]
- Seçenekler: A) ... B) ... C) ...
- Her seçeneğin kısa açıklaması/trade-off'u: ...
- Seçilen: B
- Neden: [önerilen seçenek olduğu için / plandaki X prensibiyle en uyumlu olduğu için / vb.]
```

Bu kayıt, kullanıcı geri döndüğünde "neden böyle yapıldı" sorusuna dakikalar içinde cevap bulabilmesi içindir — asla atlanmaz.

## 5. Bu Politika Nerede Kullanılır
- `AGENTS.md` → Değişmez Protokoller bu dosyaya referans verir.
- Her agent rolü (`agents/*.md`) ve her subagent brief'i bu politikaya uymakla yükümlüdür.
- `qa-verifier`, bir onayın gerçekten Bölüm 3 kapsamına girip girmediğini de denetler.

## 6. Onay Mekanizması Erişilemez Olduğunda ("Kapı Düştüğünde")
Onay/izin akışı teknik bir arızayla geçici olarak erişilemez hale gelirse — sorgusuz otomatik onay VEYA sorgusuz tam dur, ikisi de yanlış cevap. İşlemin risk profiline bak:

1. **Geri döndürülebilir / zararsız** (dosya oluşturma-düzenleme, salt-okunur komut, yerel typecheck/lint/build): devam et, kapının düştüğünü `backlog.md`'ye not düş.
2. **Riskli** (silme, kimlik bilgisi/sır erişimi, dışa veri akışı, geri dönüşü olmayan işlem, remote DB'ye migration push): dur, `backlog.md`'nin "Blokaj / Onay Bekleyen" bölümüne yaz, bağımsız başka bir işe geç.
3. **Risk profili hakkında hiçbir bilgi toplanamıyorsa:** **varsayılan olarak DUR**. Şüphede olan taraf güvenli olan taraftır.
