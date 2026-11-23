# NutriDesk — Android APK

Готовый установочный файл: [NutriDesk-1.0.4.apk](NutriDesk-1.0.4.apk) (~169 КБ).
Пакет `ru.nutridesk.app`, версия 1.0.4, Android 5.0+ (minSdk 21), targetSdk 34.
Подпись: v1 + v2 + v3 (совместимость со старыми и сторонними установщиками).

APK — WebView-обёртка той же офлайн-версии приложения. Данные хранятся локально (localStorage WebView),
резервная копия — через «Экспорт» в системный диалог сохранения JSON. Интернет для работы не нужен.

## Установка

1. Скачайте APK на телефон.
2. Откройте файл в файловом менеджере и разрешите установку из этого источника.
3. Play Protect может предупредить, так как APK не из Google Play — «Всё равно установить».
4. Для обновления устанавливайте новую версию поверх старой (та же подпись).

APK подписан debug-сертификатом — этого достаточно для личной установки. Для Google Play нужен
release-keystore; порядок сборки описан ниже.

## Сборка

Для пересборки нужен Android SDK (build-tools 34.0.0, platform android-35), JDK 17 и Node.js
(или встроенные runtime DSH). Используется WebView-обёртка + esbuild-бандл веб-приложения.

```powershell
cd android-build
.\tools\build-apk.ps1 -Clean
```

Скрипт собирает `app.bundle.js` → standalone `index.html`, затем aapt2 (ресурсы и assets),
javac + d8 (`classes.dex`), упаковку, zipalign и подпись apksigner (v2/v3).

- JDK: Microsoft OpenJDK 17
- build-tools: Android 34.0.0 (`aapt2`, `d8`, `zipalign`, `apksigner`)
- platform: android-35 (`android.jar`), targetSdk 34
- esbuild: 0.25.0

Подпись хранится в `android-build/signing/debug.keystore` — не удаляйте её, иначе обновление
поверх установленного приложения не встанет. Для публикации в магазине подпишите APK своим
release-keystore.

Эмулятор/устройство в среде сборки недоступно, поэтому APK проверен статически: подпись v2/v3,
zipalign, `classes.dex`, manifest/badging, SHA-256 `assets/www/index.html` совпадает со standalone-сборкой,
веб-интерфейс проверен в Chromium.


