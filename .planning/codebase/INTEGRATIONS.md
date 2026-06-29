---
last_mapped: 2026-06-29
---
# INTEGRATIONS — Внешние интеграции

## Внешние API / сервисы

На текущем этапе реальных API-вызовов нет. Сайт полностью статический.

Формы (`submitForm`, `submitCall` в `landing.html`) обрабатываются через `alert()` — данные никуда не уходят.

Зарезервированные (но не реализованные) интеграции — по `.env.example`:
- **Claude API** (Anthropic) — ключ `ANTHROPIC_API_KEY`
- **Telegram Bot API** — токены `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` для уведомлений с форм

## Аналитика / счётчики

Не обнаружено. В коде нет:
- Google Analytics / GA4
- Яндекс.Метрики
- Hotjar, Clarity или иных счётчиков

## Формы / отправка заявок

В `landing.html` есть две формы:

1. **Форма «Получить прайс-лист»** (`#price`) — поля: Имя, Организация, Телефон, E-mail, Описание задачи. Обработчик `submitForm(e)` вызывает `alert()`, реальной отправки нет.
2. **Модальная форма «Заказать звонок»** — поля: Имя, Телефон. Обработчик `submitCall(e)` вызывает `alert()`, реальной отправки нет.

Куда уходят данные — **не реализовано**. По `.env.example` планируется Telegram-бот или email.

## Шрифты / CDN

| Ресурс | URL | Где используется |
|---|---|---|
| **Google Fonts — Oswald** (500,600,700) | `https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&...` | `landing.html`, `index.html`, `do-posle-demo.html` |
| **Google Fonts — Manrope** (400,500,600,700) | То же font-request | `landing.html`, `index.html`, `do-posle-demo.html` |
| **Google Fonts — Tektur** (500,600) | То же font-request | `landing.html` |
| **Lucide Icons** | `https://unpkg.com/lucide@latest` (unpkg CDN) | `landing.html` |
| **WebGL Fluid** | `assets/js/webgl-fluid.umd.js` (локальный файл) | `landing.html`, `smoke-demo.html` |

`preconnect` к `https://fonts.googleapis.com` и `https://fonts.gstatic.com` прописан в `<head>` для ускорения загрузки шрифтов.

## Секреты и ключи

Файл `.env` **присутствует** в корне проекта. Он добавлен в `.gitignore` — в репозиторий не попадает.

По файлу `.env.example` ожидаются следующие ключи (значения не читались):

| Ключ | Назначение |
|---|---|
| `ANTHROPIC_API_KEY` | Доступ к Claude API |
| `TELEGRAM_BOT_TOKEN` | Telegram-бот для уведомлений |
| `TELEGRAM_CHAT_ID` | ID чата назначения |
| `CONTACT_EMAIL` | Контактный email (для будущего backend) |

В HTML-коде секретов и ключей **не обнаружено**.

## Итог

Сайт практически не имеет внешних интеграций. Единственные внешние зависимости — Google Fonts CDN и Lucide Icons CDN (оба — статические ресурсы, без API-ключей). Все формы — заглушки. Аналитики нет. Для появления реальных интеграций (отправка заявок в Telegram, аналитика) потребуется добавить backend-слой или serverless-функцию.
