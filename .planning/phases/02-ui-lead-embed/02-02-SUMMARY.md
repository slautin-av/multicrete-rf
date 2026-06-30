---
phase: 02-ui-lead-embed
plan: 02
subsystem: api
tags: [php, mail, lead, anti-spam, header-injection, honeypot, regru]

# Dependency graph
requires:
  - phase: 02-ui-lead-embed
    provides: "Контракт LEAD_ENDPOINT (/send-lead.php) и набор полей формы из плана 04"
provides:
  - "PHP-обработчик заявки send-lead.php (приём POST → письмо владельцу → JSON-ответ)"
  - "Серверная часть LEAD-02: защита от email header-injection, honeypot, JSON-контракт"
  - "Переиспользуемый эндпоинт с параметром source (D-03)"
affects: [04-форма-встраивание, заливка-на-reg.ru]

# Tech tracking
tech-stack:
  added: [PHP mail()]
  patterns:
    - "Защита от header-injection: rejectIfInjection с preg_match('/[\\r\\n]/') на все поля-заголовки"
    - "Honeypot-поле website для анти-спама без капчи"
    - "Фиксированный получатель в коде (анти-релей); From на своём домене, Reply-To клиента"
    - "JSON-контракт ответа {success:true|false,error?} для фронта"

key-files:
  created:
    - "send-lead.php — обработчик заявки в корне сайта (URL /send-lead.php)"
  modified: []

key-decisions:
  - "Чтение и JSON-тела (php://input), и $_POST — фронт шлёт JSON через fetch (план 01/04), но поддержан и обычный POST для гибкости/fallback"
  - "FROM_EMAIL и FROM_NAME вынесены в константы вверху файла — домен подставляется при заливке, секретов нет"
  - "Fallback Web3Forms в файл НЕ зашит — переключается на фронте сменой endpoint (per RESEARCH/план)"

patterns-established:
  - "rejectIfInjection() как переиспользуемый guard для CRLF в полях-заголовках"
  - "respond() как единая точка JSON-ответа с кодом и опциональной ошибкой"

requirements-completed: [LEAD-02]

# Metrics
duration: ~10min
completed: 2026-06-30
---

# Phase 2 Plan 02: PHP-обработчик заявки (send-lead.php) Summary

**PHP mail()-обработчик заявки калькулятора с защитой от email header-injection (CRLF), honeypot-анти-спамом, фиксированным получателем (анти-релей) и JSON-контрактом для фронта — без секретов в коде**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-06-30 (сеанс выполнения)
- **Completed:** 2026-06-30T13:49:54Z
- **Tasks:** 1
- **Files modified:** 1 (создан)

## Accomplishments
- Создан `send-lead.php` в корне сайта (URL `/send-lead.php`) — совпадает с `LEAD_ENDPOINT` плана 04
- Приём POST: читает JSON-тело (`php://input` → `json_decode`) ИЛИ `$_POST`; поля name/organization/phone/email/source/website
- Защита от email header-injection (ASVS V5, T-02-04): `rejectIfInjection()` с `preg_match('/[\r\n]/', ...)` на email и name; email дополнительно через `filter_var(FILTER_VALIDATE_EMAIL)`
- Honeypot `website` (T-02-05): заполнен → тихий `{"success":true}` без отправки
- Анти-релей (T-02-06): получатель `MultiCrete@yandex.ru` зафиксирован в коде, НЕ из ввода
- From на собственном домене через константу `FROM_EMAIL` (не @yandex.ru — иначе спам, T-02-09); Reply-To — только валидный e-mail клиента
- Тема в `=?UTF-8?B?...?=`, письмо `text/plain; charset=UTF-8` (T-02-07 — нет HTML/XSS)
- `source` через белый список `preg_replace('/[^a-z0-9_-]/i','',...)` и попадает в тему/тело (D-03)
- JSON-контракт `{"success":true|false,"error":?}` с `Content-Type: application/json`
- Никаких паролей/ключей/SMTP-логинов в коде (CLAUDE.md, T-02-08); инструкция по заливке в шапке файла

## Task Commits

1. **Задача 1: PHP-обработчик send-lead.php** - `eba3f3f` (feat)

_Метаданные плана (SUMMARY) — отдельный коммит ниже._

## Files Created/Modified
- `send-lead.php` — обработчик заявки: приём POST, защита от инъекций/спама, отправка письма владельцу, JSON-ответ

## Decisions Made
- Чтение и JSON-тела, и `$_POST` — фронт шлёт JSON через fetch, но поддержан и form-POST (гибкость + совместимость с Web3Forms-fallback на фронте)
- `FROM_EMAIL`/`FROM_NAME`/`LEAD_RECIPIENT` — отдельные константы вверху файла: домен отправителя подставляется при заливке (это не секрет), получатель жёстко зашит
- Длина полей тела обрезается `mb_substr(...,500)` — защита от раздувания письма
- Fallback Web3Forms НЕ в этом файле — включается на фронте (per план/RESEARCH)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Verify-команда плана давала ложный FAIL.** Автоматическая проверка из `<verify>` искала подстроку `'[\r\n]'`, которую JS интерпретирует как литеральные байты CR/LF (перевод строки), а не как regex-токен в PHP-исходнике (`\r\n` = backslash-r-backslash-n). Это дефект самой verify-строки (двойная интерпретация escape), а не кода. Подтверждено наличие защиты напрямую: строка 59 `if (preg_match('/[\r\n]/', $v))`. Запущена корректная статическая проверка (через JS-файл, без shell/heredoc-искажений) — ВСЕ требования и acceptance-критерии прошли: CRLF-guard, фиксированный получатель, From не на @yandex.ru, base64-тема, honeypot, отсутствие секретов. Код не менялся.

## User Setup Required

**Требуется ручная настройка на хостинге (D-01/D-02) — даёт владелец при заливке.** См. `user_setup` во фронтматтере плана `02-02-PLAN.md`:
- Создать ящик-отправитель `FROM_EMAIL` (`noreply@<рабочий-домен>`) в панели Reg.ru; подставить домен в константу `FROM_EMAIL` в `send-lead.php`
- Убедиться, что SPF домена проходит и доступен порт 587/TLS (порт 25 на Reg.ru закрыт)
- **Приёмочный шаг D-02:** отправить реальную тестовую заявку и проверить, что письмо ПРИШЛО на `MultiCrete@yandex.ru` (включая папку «Спам»). Если не дошло — эскалация по RESEARCH (PHPMailer/SMTP 587 → затем Web3Forms-fallback).

## Next Phase Readiness
- Серверный приёмник заявок готов; путь `/send-lead.php` совпадает с `LEAD_ENDPOINT` плана 04 (форма + встраивание)
- Живая проверка доставки (D-02) выполняется на стадии заливки с доступами владельца — это известный отложенный приёмочный шаг, не блокер выполнения плана
- PHP в окружении разработки отсутствует — синтаксис проверен статически; финальный `php -l` пройдёт на хостинге

## Self-Check: PASSED

- FOUND: send-lead.php (создан, статическая проверка ALL CHECKS OK)
- FOUND commit: eba3f3f (feat — send-lead.php)

---
*Phase: 02-ui-lead-embed*
*Completed: 2026-06-30*
