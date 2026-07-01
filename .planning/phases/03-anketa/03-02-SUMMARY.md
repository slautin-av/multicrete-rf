---
phase: 03-anketa
plan: 02
subsystem: anketa
tags: [ooxml, docx, powershell, приёмка, опросный-лист]

# Dependency graph
requires:
  - phase: 03-anketa (plan 01)
    provides: скрипты build-anketa.ps1 / verify-anketa.ps1 и тело anketa-body.xml
provides:
  - Готовый приёмочный DOCX-бланк anketa/oprosnyj-list-multicrete.docx (2 страницы, static asset)
affects: [03-блок-на-landing (кнопка скачивания ссылается на этот файл)]

# Tech tracking
tech-stack:
  added: [Word COM ComputeStatistics (счётчик страниц)]
  patterns:
    - "Правки бланка — только через исходник + пересборку (D-06), не руками в Word"
    - "Размер заголовков — inline-форматирование (w:sz), т.к. styles.xml байт-в-байт заблокирован (D-05)"

key-files:
  created:
    - anketa/oprosnyj-list-multicrete.docx
  modified:
    - anketa/src/anketa-body.xml

key-decisions:
  - "Заголовки уменьшены inline (heading1 11pt / heading2 10pt) вместо правки styles.xml — фирменные колонтитулы остаются нетронутыми"
  - "Разделительные пустые абзацы после таблиц поджаты до 8pt — высвободило основной объём для 2-страничной вёрстки"

patterns-established:
  - "Уместить DOCX в N страниц без правки защищённого styles.xml — inline w:sz + w:spacing в теле, контроль через Word COM ComputeStatistics(2)"

requirements-completed: [D-04, D-05, D-06, D-07]

# Metrics
duration: ~8min (сборка + правка на 2 страницы)
completed: 2026-07-01
---

# Phase 03 Plan 02: Сборка приёмочного DOCX-бланка опросного листа Summary

**Финальный бланк `anketa/oprosnyj-list-multicrete.docx` собран скриптом из фирменного шаблона + тела опросника, прошёл все 15 структурных проверок (колонтитулы байт-в-байт, без BOM, e-mail в подвале), ужат до 2 страниц inline-форматированием заголовков и принят владельцем визуально в Word (D-07).**

## Performance

- **Tasks:** 2 (Task 1 — сборка+проверка авто; Task 2 — ручная приёмка владельца)
- **Files:** 1 создан (.docx), 1 изменён (anketa-body.xml — поджатие заголовков)

## Accomplishments
- **Сборка (Task 1):** `anketa/oprosnyj-list-multicrete.docx` собран `build-anketa.ps1` из шаблона `Входящие/Бланк на опросной лист.docx` + тела `anketa/src/anketa-body.xml`. Без ручных правок .docx (D-06).
- **Полная проверка `verify-anketa.ps1` — 15/15 PASS:** zip-целостность (unzip -t «No errors detected»), document.xml без BOM (`3C 3F 78`) и well-formed, тело содержит «Блок 0» / «Характер воздействия» / «УТВЕРЖДАЮ», все 5 неизменяемых частей (header1.xml, footer1.xml, media/image1.jpg, styles.xml, [Content_Types].xml) байт-в-байт идентичны шаблону (D-05), подвал содержит `MultiCrete@mail.ru` (D-04), Word COM реально открыл файл (D-07-smoke — PASS).
- **Правка по итогам приёмки — бланк на 2 страницы:** владелец при первичном осмотре увидел, что документ уходил на 3 страницы (крупные заголовки 16pt, подпись уезжала на третий лист). Заголовки уменьшены inline-форматированием (heading1 → 11pt, heading2 → 10pt), отступы вокруг заголовков и пустые абзацы-разделители поджаты. Пересобран, число страниц = **2** (подтверждено Word COM `ComputeStatistics(2)` после `Repaginate()`), verify остался 15/15 PASS. Содержание не изменено (D-03).
- **Ручная приёмка владельца (Task 2, D-07):** владелец открыл файл в Word — шапка (логотип + «Опросной лист»), подвал (реквизиты, MultiCrete@mail.ru, телефоны), тело (блоки 0-6, кириллица, таблицы, чекбоксы, УТВЕРЖДАЮ) корректны, вёрстка на 2 страницах. Подтверждено словом «всё работает».

## Task Commits
1. **Task 1: Сборка приёмочного .docx** — `dc5df72` (feat)
2. **Правка на 2 страницы (по итогам приёмки)** — `07f9863` (fix: исходник + пересобранный .docx)
3. **Task 2: Ручная приёмка владельца в Word** — подтверждена (D-07)

## Files Created/Modified
- `anketa/oprosnyj-list-multicrete.docx` — готовый к заполнению бланк на фирменном шаблоне, 2 страницы (static asset для кнопки скачивания)
- `anketa/src/anketa-body.xml` — inline-размеры заголовков для 2-страничной вёрстки (содержание 1:1 без изменений)

## Decisions Made
- **styles.xml не трогаем — размер заголовков задан inline.** Требование D-05 (колонтитулы и styles.xml байт-в-байт) запрещает менять стиль заголовка в самом стиле. Размер уменьшён прямым форматированием (`w:sz`) в теле — фирменное оформление сохранено.
- **Правки только через пересборку (D-06).** 2-страничная подгонка сделана правкой исходника `anketa-body.xml` + `build-anketa.ps1`, не ручным редактированием .docx в Word.

## Deviations from Plan

### Правка по итогам приёмки (ожидаемый checkpoint-цикл)
**Бланк уходил на 3 страницы вместо 2**
- **Found during:** Task 2 (ручная приёмка владельца)
- **Issue:** Заголовки блоков 16pt (из styles.xml шаблона) раздували документ до 3 страниц, подпись уезжала на третий лист.
- **Fix:** inline-уменьшение заголовков (heading1 11pt / heading2 10pt) + поджатие отступов и разделительных абзацев. styles.xml не тронут. Первая итерация (12/11pt) дала 3 страницы — потребовалась вторая с более сильным поджатием.
- **Verification:** Word COM ComputeStatistics(2) = 2 страницы; verify-anketa.ps1 = 15/15 PASS.
- **Committed in:** `07f9863` (fix)

## Threat Surface / Secrets
- T-03-03 закрыт: файл — публичный бланк, содержит только публичный e-mail MultiCrete@mail.ru (из подвала шаблона). Секретов нет по построению (тело из проверенного anketa-body.xml).

## Next Phase Readiness
- Готовый 2-страничный бланк лежит в репозитории (static asset) и раздаётся кнопкой «Скачать опросной лист» (Plan 03) прямой ссылкой `anketa/oprosnyj-list-multicrete.docx`.

---
*Phase: 03-anketa*
*Completed: 2026-07-01*

## Self-Check: PASSED

Готовый .docx существует и в git (dc5df72, 07f9863); verify-anketa.ps1 15/15 PASS; 2 страницы подтверждены Word COM; владелец принял визуально (D-07).
