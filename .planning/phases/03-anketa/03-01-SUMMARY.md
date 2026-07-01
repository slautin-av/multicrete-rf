---
phase: 03-anketa
plan: 01
subsystem: infra
tags: [ooxml, docx, powershell, zip, anketa, opросный-лист]

# Dependency graph
requires:
  - phase: 03-anketa (research/context)
    provides: рецепт сборки DOCX через System.IO.Compression, содержание ANKETA-draft-v1.md, стили шаблона
provides:
  - Исходник тела опросника anketa/src/anketa-body.xml (OOXML-фрагмент, содержание 1:1)
  - Скрипт сборки anketa/build-anketa.ps1 (инъекция тела в фирменный шаблон)
  - Скрипт проверки anketa/verify-anketa.ps1 (структурные проверки готового .docx)
affects: [03-02-plan-сборка-приёмочного-docx, 03-блок-на-landing]

# Tech tracking
tech-stack:
  added: [System.IO.Compression.ZipArchive, Word COM smoke, unzip -t валидация]
  patterns:
    - "Инъекция OOXML: тело перед <w:sectPr>, неизменяемые части байт-в-байт"
    - "PowerShell-скрипты с кириллицей — UTF-8 с BOM (парсер PS 5.1), но document.xml — UTF-8 без BOM"

key-files:
  created:
    - anketa/src/anketa-body.xml
    - anketa/build-anketa.ps1
    - anketa/verify-anketa.ps1
  modified: []

key-decisions:
  - "Скрипты .ps1 хранятся в UTF-8 с BOM — иначе PowerShell 5.1 читает кириллицу как cp1251 и рвёт парсинг"
  - "Проверка e-mail в подвале — по плоскому тексту всех <w:t>, т.к. Word дробит MultiCrete@mail.ru на run'ы"
  - "Ширины колонок таблиц 6000/4675 twip (левая «Поле» шире под длинные подписи)"

patterns-established:
  - "Сборка DOCX без Python/Compress-Archive: чтение шаблона как ZipArchive Read, подмена только document.xml"
  - "verify-anketa: PASS/FAIL по каждому пункту, ненулевой exit при FAIL, WARN не считается FAIL"

requirements-completed: [D-01, D-02, D-03, D-04, D-05, D-06]

# Metrics
duration: 7min
completed: 2026-07-01
---

# Phase 03 Plan 01: Инфраструктура сборки DOCX-бланка опросного листа Summary

**Воспроизводимая сборка DOCX-бланка через System.IO.Compression.ZipArchive: OOXML-тело опросника (содержание 1:1), скрипт инъекции в фирменный шаблон с нетронутыми колонтитулами и скрипт структурных проверок с Word COM smoke.**

## Performance

- **Duration:** ~7 мин
- **Started:** 2026-07-01T13:02:49Z
- **Completed:** 2026-07-01T13:09:38Z
- **Tasks:** 3
- **Files modified:** 3 (созданы)

## Accomplishments
- `anketa/src/anketa-body.xml` — OOXML-фрагмент тела опросника: всё содержание ANKETA-draft-v1.md перенесено 1:1 (блоки 0-6, чекбоксы типа применения и характера воздействия, 12 таблиц «Поле|Значение», поле УТВЕРЖДАЮ, футер-инструкция). Well-formed, UTF-8 без BOM, ссылки на стили шаблона (heading 1/2 = styleId 1/2, Table Grid = ab).
- `anketa/build-anketa.ps1` — сборка инъекцией тела строго перед `<w:sectPr>` через ZipArchive; document.xml пишется UTF-8 без BOM, все прочие части (колонтитулы, логотип, стили, [Content_Types].xml, rels) копируются потоком байт. Без Compress-Archive.
- `anketa/verify-anketa.ps1` — 15 структурных проверок карты 03-VALIDATION.md: zip-целостность, well-formed, BOM-чек, content тела, байт-в-байт колонтитулы (5 частей), e-mail в подвале, Word COM smoke с graceful WARN.
- **Проверено фактической сборкой:** собранный `oprosnyj-list-multicrete.docx` — unzip -t «No errors detected», все 5 неизменяемых частей IDENTICAL шаблону, document.xml без BOM и well-formed, Word COM реально открыл файл (Paragraphs.Count > 0), verify завершился PASS / exit 0.

## Task Commits

Каждая задача закоммичена атомарно:

1. **Task 1: Исходник тела опросника anketa-body.xml** — `59c1e54` (feat)
2. **Task 2: Скрипт сборки build-anketa.ps1** — `f1b7b0a` (feat)
3. **Task 3: Скрипт проверки verify-anketa.ps1** — `4eb35df` (feat)

**Plan metadata:** см. финальный docs-коммит

## Files Created/Modified
- `anketa/src/anketa-body.xml` — OOXML-тело опросника (фрагмент для инъекции), содержание 1:1 из ANKETA-draft-v1.md
- `anketa/build-anketa.ps1` — воспроизводимая сборка .docx (ZipArchive, инъекция перед sectPr, document.xml без BOM)
- `anketa/verify-anketa.ps1` — структурные проверки готового .docx (D-04/D-05/D-07-smoke)

## Decisions Made
- **UTF-8 с BOM для .ps1-скриптов.** Windows PowerShell 5.1 без BOM читает файл как cp1251 и ломается на кириллице в строковых литералах (`throw '…'`). BOM в .ps1 штатен и обязателен здесь. При этом `document.xml` в собранном .docx остаётся строго UTF-8 без BOM (проверяется).
- **Ширины колонок 6000/4675 twip** — левая «Поле» шире под длинные подписи (Open Question RESOLVED в RESEARCH). Финальная визуальная приёмка — D-07 (Plan 02).
- **Готовый .docx не коммитится в этом плане** — это производный артефакт, его собирает и коммитит Plan 02 (Wave 0 = только инструменты).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Проверка e-mail в подвале ловила run-фрагментацию Word**
- **Found during:** Task 3 (verify-anketa.ps1)
- **Issue:** Первая версия проверки искала цельную подстроку `MultiCrete@mail.ru` в сыром footer1.xml. Word хранит e-mail разбитым на несколько `<w:t>` run'ов (`MultiCrete` + `@` + `mail` + `.ru`), поэтому цельная подстрока не находилась → ложный FAIL, хотя e-mail в подвале присутствует.
- **Fix:** Проверка теперь склеивает содержимое всех `<w:t>…</w:t>` в «плоский» текст и ищет e-mail по нему (regex `MultiCrete@mail\.ru`).
- **Files modified:** anketa/verify-anketa.ps1
- **Verification:** verify-anketa.ps1 → PASS по пункту D-04, общий exit 0.
- **Committed in:** `4eb35df` (Task 3 commit)

**2. [Rule 3 - Blocking] Кодировка .ps1 (UTF-8 с BOM) для корректного парсинга кириллицы**
- **Found during:** Task 2 (build-anketa.ps1), затем Task 3
- **Issue:** Первый запуск build-anketa.ps1 упал с ParserError — PS 5.1 читал UTF-8-без-BOM как cp1251, кириллица в комментариях и `throw`-строках рвала синтаксис.
- **Fix:** Оба скрипта сконвертированы в UTF-8 с BOM (`UTF8Encoding($true)`). Это НЕ противоречит требованию «document.xml без BOM» — там речь про часть внутри .docx, которую пишет уже сам скрипт без BOM.
- **Files modified:** anketa/build-anketa.ps1, anketa/verify-anketa.ps1
- **Verification:** Оба скрипта исполняются без ParserError; сборка и проверка проходят.
- **Committed in:** `f1b7b0a` (Task 2), `4eb35df` (Task 3)

**3. [Rule 3 - Blocking] Уточнение формулировки про Compress-Archive в комментарии**
- **Found during:** Task 2 (build-anketa.ps1)
- **Issue:** Acceptance-критерий и автопроверка требуют, чтобы скрипт НЕ содержал строки `Compress-Archive` (`! grep -q`). Первая версия упоминала её в поясняющем комментарии («НЕ Compress-Archive») — grep находил → критерий формально не выполнялся.
- **Fix:** Комментарий переформулирован без слова `Compress-Archive` (описан как «штатный zip-упаковщик PowerShell»).
- **Files modified:** anketa/build-anketa.ps1
- **Verification:** `! grep -q 'Compress-Archive'` → true, shape-проверка OK.
- **Committed in:** `f1b7b0a` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** Все правки — по факту исполнения на реальной машине (кодировка PS 5.1, run-фрагментация Word, дословность автопроверки). Scope не расширен: три файла плана созданы ровно как задумано, рецепт D-05/D-06 реализован и подтверждён фактической сборкой.

## Issues Encountered
- Ложные ошибки при верификации через Git Bash: Windows-Python не видит MSYS-путь `/tmp/...`, а консоль Git Bash показывает вывод PowerShell в неверной кодовой странице (кракозябры). На результат не влияет — проверки прогнаны заново через Windows-пути и подтверждены (unzip -t OK, колонтитулы IDENTICAL, well-formed OK, verify exit 0).

## Threat Surface / Secrets
- Проверено: ни в одном из трёх файлов нет паролей/ключей/токенов (правило CLAUDE.md, T-03-01). Только публичный e-mail `MultiCrete@mail.ru`.
- T-03-02 (битый DOCX из-за экранирования) закрыт: текст `<w:t>` well-formed, verify-anketa проверяет well-formed автоматически.

## Next Phase Readiness
- Инфраструктура готова: Plan 02 может собрать приёмочный `.docx` (`build-anketa.ps1`) и проверить его (`verify-anketa.ps1`), затем — ручная приёмка владельца в Word (D-07).
- Известное: готовый `oprosnyj-list-multicrete.docx` пока untracked в рабочем дереве (собран при верификации). Его официальная сборка и коммит — задача Plan 02.

---
*Phase: 03-anketa*
*Completed: 2026-07-01*

## Self-Check: PASSED

Все созданные файлы существуют, все три task-коммита (59c1e54, f1b7b0a, 4eb35df) в истории.
