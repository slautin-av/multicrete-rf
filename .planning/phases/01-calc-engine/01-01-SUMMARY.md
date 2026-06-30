---
phase: 01-calc-engine
plan: 01
subsystem: calculator
tags: [vanilla-js, es-modules, params, single-source-of-truth, object-freeze]

# Dependency graph
requires: []
provides:
  - "calculator/params.js — замороженный PARAMS: все ставки/цены/нормы/проценты/коэффициенты эталона «700» в одном блоке"
  - "Готовые цены вспомогательных материалов и флаги вкл/выкл для движка"
  - "Текстовая оговорка про деталь до 80 кг (готовая строка для UI/движка)"
affects: [calc-engine, engine.js, selftest.js, ui-calculator]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Единый источник истины: Object.freeze(PARAMS) — числа не разбросаны по формулам (CALC-09)"
    - "Кэш-значения внешнего прайса вшиты числами-константами, без ссылок на путь к файлу"

key-files:
  created:
    - calculator/params.js
  modified: []

key-decisions:
  - "Гарантийный резерв по умолчанию = 5% (как эталон «700», переключаемо одним числом на 3%)"
  - "Коэффициенты класса (1.0/1.2/1.4) вложены в PARAMS.koefKlass и тоже заморожены"
  - "Нормативы количества вспом. материалов в PARAMS НЕ зашиты — только цены и флаги; количество считает engine.js"
  - "Оговорка про 80 кг вынесена в PARAMS как готовая строка tekstOgovorki80kg, без расчётной строки"

patterns-established:
  - "PARAMS — единственный экспорт модуля params.js; движок ссылается на P.xxx"
  - "Группировка полей русскими комментариями по разделам RESEARCH (нормы, цены, ставки, проценты, классы, вспом., допущения)"

requirements-completed: [CALC-08, CALC-09]

# Metrics
duration: ~6min
completed: 2026-06-30
---

# Phase 1 Plan 01: Единый блок параметров PARAMS Summary

**Заморожённый Object.freeze(PARAMS) — один источник истины: все числа эталона «Калькуляция МультиКрит 700.xlsx» (нормы материала, цены, ставки работ, проценты-накрутки, коэффициенты класса, цены вспом. материалов, фикс. допущения и оговорка про 80 кг) в одном ES-модуле.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-06-30T09:50:56Z (приблизительно — старт выполнения плана)
- **Completed:** 2026-06-30
- **Tasks:** 1
- **Files modified:** 1 (создан)

## Accomplishments
- Создан `calculator/params.js` — единственный экспорт `PARAMS` через `Object.freeze` (CALC-09).
- Перенесены ВСЕ числа эталона «700» одним блоком: нормы/физика материала (РП), цены материалов (кэш прайса 2 кв. 2024), ставки работ, проценты-накрутки, коэффициенты класса, цены вспом. материалов с флагами вкл/выкл, фиксированные допущения (CALC-08).
- Гарантийный резерв = 5% по умолчанию (per CONTEXT), с комментарием о лёгком переключении на 3%.
- Текстовая оговорка про деталь до 80 кг вынесена готовой строкой `tekstOgovorki80kg` (CALC-07 — без расчётной строки).
- Verify-команда плана печатает `PARAMS OK` и завершается без ошибки.

## Task Commits

Каждая задача закоммичена атомарно:

1. **Задача 1: Создать calculator/params.js — единый блок PARAMS** — `fc2024c` (feat)

**Plan metadata:** (отдельный docs-коммит ниже)

## Files Created/Modified
- `calculator/params.js` — замороженный словарь чисел эталона «700»; единственный экспорт `PARAMS`. Группировка по разделам: нормы материала, цены материалов, ставки работ, проценты-накрутки, коэффициенты класса (вложенный замороженный `koefKlass`), цены вспом. материалов + флаги, фиксированные допущения, текст оговорки про 80 кг.

## Decisions Made
- **Гарантия 5% по умолчанию** (как эталон «700»), а не 3% из ранних РЕШЕНИЙ — per CONTEXT; переключается одним числом.
- **Коэффициенты класса** вынесены во вложенный `koefKlass` и тоже заморожены, чтобы движок брал `P.koefKlass[klass]`.
- **Нормативы количества вспом. материалов** НЕ в PARAMS — они зависят от S и массы и вычисляются в engine.js (план 02). В PARAMS только цены за единицу + флаги вкл/выкл (`flagAlfaDisk`, `flagAlmaznyDisk`, `cenaOsnastka=0`).
- **Цены прайса** вшиты числами-константами (без ссылок на внешний путь `D:\001\...Прайс 2кв.2024.xlsx`), дата прайса помечена комментарием.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. Verify-команда прошла с первого раза (`PARAMS OK`). Предупреждение git про LF→CRLF — нормальное для Windows, на работу не влияет.

## Threat Surface
- `PARAMS` заморожен `Object.freeze` — защита от случайной мутации значений в коде движка (T-01-02, mitigate).
- Числа цен/ставок публичны намеренно (T-01-01, accept — решение владельца). Паролей/ключей/токенов в файле нет (правило CLAUDE.md соблюдено).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Готов фундамент для плана 01-02: ядро `calc(inputs, PARAMS) -> breakdown` + самопроверка на контрольных примерах. Движок будет ссылаться на `P.xxx` (`import { PARAMS } from "./params.js"`).
- Связь `params.js → engine.js` (key_link плана) реализуется в следующем плане.

## Self-Check: PASSED
- FOUND: calculator/params.js
- FOUND: commit fc2024c
- verify: `PARAMS OK`

---
*Phase: 01-calc-engine*
*Completed: 2026-06-30*
