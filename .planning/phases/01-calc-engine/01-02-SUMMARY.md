---
phase: 01-calc-engine
plan: 02
subsystem: calc-engine
tags: [vanilla-js, es-modules, pure-function, calculator, node-selftest]

# Dependency graph
requires:
  - phase: 01-calc-engine (план 01 PARAMS)
    provides: calculator/params.js — замороженный объект PARAMS (один источник истины)
provides:
  - "calculator/engine.js — чистая функция calc(inputs, PARAMS) -> breakdown (ядро движка)"
  - "Полная разбивка стоимости покрытия (труд построчно, ЕСН, склад, накладные, прибыль, материалы, гарантия, ИТОГО, ₽/м², ₽/(м²·мм))"
  - "Список текстовых оговорок (деталь до 80 кг + фикс-допущения) для UI этапа 2"
  - "calculator/engine.selftest.js — самопроверка на 3 контрольных примерах эталона"
affects: [phase-02-ui, calculator-ui, форма-заявки]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Чистая функция расчёта calc(inputs, P) — без DOM/глобалей/даты, детерминирована"
    - "Все числа через P.xxx — никаких магических чисел в формулах (CALC-09)"
    - "Самопроверка без тест-фреймворка (голый JS + console, node-совместима)"

key-files:
  created:
    - calculator/engine.js
    - calculator/engine.selftest.js
  modified: []

key-decisions:
  - "G62 = F19 (множитель комплектов E59=1) — вспомогательные считаются движком по нормативам, цены из PARAMS"
  - "Количество расходников и делители геометрии — часть алгоритма движка, не PARAMS (per решение владельца)"
  - "Гарантия 5% (как эталон «700»), порядок накруток строго по Excel, гарантия после прибыли"

patterns-established:
  - "Пара engine.js + engine.selftest.js: ядро и его самопроверка лежат рядом в модуле"
  - "ROUNDUP Excel = Math.ceil(x*10^n)/10^n (все величины ≥0); промежуточные — полный double"

requirements-completed: [CALC-01, CALC-02, CALC-03, CALC-04, CALC-05, CALC-06, CALC-07]

# Metrics
duration: ~15min
completed: 2026-06-30
---

# Phase 1 Plan 02: Ядро движка расчёта Summary

**Чистая функция `calc(inputs, PARAMS)` воспроизводит эталон «Калькуляция МультиКрит 700» число-в-число (137 600,16 ₽) на 3 контрольных примерах, плюс самопроверка на Node с кодом выхода 0.**

## Performance

- **Duration:** ~15 мин
- **Started:** 2026-06-30 (см. коммит 403ab56)
- **Completed:** 2026-06-30
- **Tasks:** 3
- **Files modified:** 2 (созданы)

## Accomplishments
- Ядро `calc()` переносит всю цепочку эталона «700» в порядке Excel (геометрия → материал → труд → накрутки → итог) и совпадает с эталоном до копейки.
- Вспомогательные материалы (G62 = 2933,58 ₽) посчитаны внутри движка по нормативам гибрид «масса/площадь», цены — из PARAMS.
- Список текстовых оговорок: деталь до 80 кг (CALC-07) + фикс-допущения (1 день, 1 спец, без транспорта/командировок/оснастки, CALC-08).
- Самопроверка на 3 примерах (класс 1/2/3) + проверки нелинейности нанесения и кратности класса; `node calculator/engine.selftest.js` → код 0.

## Task Commits

Каждая задача — атомарный коммит:

1. **Задача 1: Ядро calc()** — `403ab56` (feat)
2. **Задача 2: Текстовые оговорки (CALC-07/08)** — `cbf0bb9` (feat)
3. **Задача 3: Самопроверка engine.selftest.js** — `8b4dda9` (test)

## Files Created/Modified
- `calculator/engine.js` — чистая функция `calc(inputs, P) -> breakdown`, ядро движка (165 строк).
- `calculator/engine.selftest.js` — самопроверка на 3 контрольных примерах + доп. проверки (81 строка).

## Decisions Made
- **G62 = F19 напрямую:** при сверке F19 = 2933,58 ₽ воспроизводится из нормативов точно, а `G62 = SUM(G59:G61)` с множителем комплектов E59 = 1 равен F19. Движок считает вспомогательные материалы построчно, не хардкодит итог.
- **Делители нормативов (S/10, E80/10 и т.п.) — в коде, не в PARAMS:** по решению владельца количество расходников зависит от площади и массы и вычисляется движком; в PARAMS только цены за единицу. Это не нарушает CALC-09 (магических ставок/цен/процентов в формулах нет — они все через P.xxx).
- **Гарантия 5%, порядок накруток строго по эталону** (склад от материалов, гарантия после прибыли) — per CONTEXT.

## Deviations from Plan

None - plan executed exactly as written.

Реальные имена полей PARAMS из плана 01 совпали с ожиданиями плана 02; цепочка расчёта сошлась с первого прогона.

## Issues Encountered
None. Перед написанием движка прототип цепочки был сверен с эталоном в скратчпаде — все три ИТОГО (137600.16 / 143931.08 / 150262.00) совпали сразу.

## User Setup Required
None - внешних сервисов нет, движок — чистый JS без зависимостей.

## Next Phase Readiness
- Ядро готово: этап 2 (UI) вызовет `calc({S,T,klass}, PARAMS)` и отрисует `breakdown` + `ogovorki`.
- Форма `breakdown` стабильна (построчные поля + итоги + массив оговорок).
- Блокеров нет. Параметры «на будущее» (гарантия 3%, вспом. по площади, скотч до целого) переключаются одним числом в PARAMS.

## Self-Check: PASSED

- FOUND: calculator/engine.js
- FOUND: calculator/engine.selftest.js
- FOUND: .planning/phases/01-calc-engine/01-02-SUMMARY.md
- FOUND commits: 403ab56, cbf0bb9, 8b4dda9

---
*Phase: 01-calc-engine*
*Completed: 2026-06-30*
