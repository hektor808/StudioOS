# REPORT_STANDARD.md — Agent Raporları İçin Asgari Kalite Kriterleri

Herhangi bir agent (özellikle `research-scout`, `qa-verifier`, ama tüm roller dahil) bir bulgu/analiz/doğrulama raporu yazdığında, bu rapor aşağıdaki asgari kriterleri karşılamadan "tamamlandı" sayılmaz.

## 1. Her İddia Etiketlenir
Rapordaki her önemli iddia şu üçünden biriyle işaretlenir (açıkça veya bağlamdan kesin biçimde anlaşılır şekilde):
- **Kanıtlı:** Gerçek bir komut/test/gözlemle doğrulandı — kanıtın kendisi (komut çıktısı, dosya yolu, satır numarası) rapora eklenir.
- **Hipotez:** Mantıklı bir çıkarım ama doğrudan test edilmedi.
- **Varsayım:** Bilgi eksikliği nedeniyle en makul tahmin — neden varsayıldığı açıklanır.

Örnek: "agy sendMessage sonrası yanıt vermiyor **(Kanıtlı — `git stash` ile pre-existing olduğu doğrulandı, bkz. decisions.md Turu 10.5)**" vs. "Bu muhtemelen node-pty'nin PTY üzerinden NDJSON satır sonunu yanlış yorumlamasından kaynaklanıyor **(Hipotez — kök neden izole test edilmedi)**".

## 2. İsteyenin Çerçevesi Sorgusuz Kabul Edilmez
Kullanıcının/görevin kendi ön kabulü ("X çünkü Y" şeklinde bir gerekçeyle gelen bir istek) doğrudan doğru kabul edilip üzerine inşa edilmez — mümkünse bağımsız olarak doğrulanır. Doğrulanamıyorsa bu açıkça belirtilir ("kullanıcının X iddiası doğrulanmadı, olduğu gibi aktarılıyor").

## 3. Sınırlılıklar Açık Yazılır
Her rapor, ne test EDİLMEDİĞİNİ veya hangi koşullarda geçersiz olabileceğini en az bir cümleyle belirtir. "Her şeyi kapsadım" izlenimi veren ama örtük sınırlılıkları olan raporlar reddedilir.

## 4. İlham/Referans Şeffaflığı
Rapor hazırlanırken başka bir açık kaynak projeden/dokümandan yararlanıldıysa `INSPIRATIONS.md`'ye referans düşülür (bkz. `AGENTS.md`).

## 5. Kim Uygular
`qa-verifier`, incelediği her rapor için bu 4 kriteri kontrol eder; eksikse raporu üreten agent'a geri gönderir (kendi işini kendi onaylamama protokolüyle tutarlı — bkz. `skills/verification-protocol/SKILL.md`).

---
*Faz 6.2'de ("Rapor Kalite Rozeti", bkz. `ROADMAP.md`) bu kriterler her rapor sonuna görsel bir skor/rozet olarak otomatikleştirilecek — bu dosya şimdilik metin/kural seviyesindeki temel.*
