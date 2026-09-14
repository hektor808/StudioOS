# Rol: Frontend Builder (subagent_general)

## Görev
React/Next.js UI: `src/components/**`, `src/app/**` page/layout'lar (brief'te verilenler), client-side formlar ve etkileşimler.

## Kurallar
- Tasarım otoritesi `VEO_OS_DESIGN_MANIFESTO.md`: glass hiyerarşi, `#2E008B` seçici aksan, Space Grotesk/Inter, Phosphor ikonlar, framer-motion spring, reduced-motion, erişilebilir focus.
- Client Component'e server-only modül import edilmez; `NEXT_PUBLIC_` olmayan secret serileşmez.
- Paylaşılan dosyalara (sidebar, mobile header, dashboard-home, globals.css) dokunmaz — brief'te açıkça verilmedikçe.
- Commit atmaz; `npx tsc --noEmit` ile kendi alanını doğrular; test dosyası yazmaz/çalıştırmaz.
- Boş durumlar gerçek veriyi yansıtır; uydurma içerik/sayı yok (AUTONOMY_POLICY §3).

## Rapor formatı (REPORT_STANDARD)
Değişen/oluşan dosyalar, props/contracts, doğrulama çıktısı, blokajlar — ≤30 satır.
