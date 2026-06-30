---
phase: 01-calc-engine
verified: 2026-06-30T12:15:00Z
status: passed
score: 9/9 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: null
  note: "Первичная верификация — предыдущей VERIFICATION.md не было"
---

# Phase 1: Движок расчёта — Verification Report

**Phase Goal:** Готовый проверяемый движок на JavaScript, который по входам (площадь детали, толщина покрытия, класс сложности 1/2/3) выдаёт полную разбивку предварительной стоимости, совпадающую с утверждённым Excel-калькулятором; в конце расчёта — текстовая оговорка про деталь массой до 80 кг.
**Verified:** 2026-06-30T12:15:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | На контрольных примерах ИТОГО и ₽/м² совпадают с эталоном «700» | ✓ VERIFIED | `node engine.selftest.js`: класс 1 = 137600.16, класс 2 = 143931.08, класс 3 = 150262.00 — все PASS, код выхода 0 |
| 2   | Класс 1→2→3 множит трудозатраты ×1.0/×1.2/×1.4 только к труду, не к материалам | ✓ VERIFIED | engine.js:87-88 `(sumWorks*coef + stITR)`; selftest подтверждает работы×коэф 12144/14168; материалы 80792 неизменны при всех классах |
| 3   | Стоимость нанесения нелинейна по толщине (первые 3 мм 900, далее 500) | ✓ VERIFIED | engine.js:75-77 `T<=3 ? T*900 : (T-3)*500 + 3*900`; selftest: T=2→1800, T=3→2700, T=5→3700 PASS |
| 4   | Материал по S и T с ценовыми порогами по массе эластомера | ✓ VERIFIED | engine.js:49-51; независимая проверка: масса 1кг→6800, 35кг→6650, 826кг→6400 |
| 5   | Вспомогательные материалы воспроизводят итог эталона | ✓ VERIFIED | engine.js:94-108; независимая проверка vspomMaterialy = 2933.58 (= F19 эталона) |
| 6   | Порядок накруток как в эталоне, гарантия после прибыли, НДС=0 | ✓ VERIFIED | engine.js:111-125; гарантия = (rabotyItogo+materialy)*5% = 6552.39 подтверждено; nds=0 |
| 7   | Результат содержит текстовую оговорку про деталь до 80 кг | ✓ VERIFIED | engine.js:133-137 массив ogovorki содержит P.tekstOgovorki80kg (params.js:101-103), регэксп /80 кг/ совпадает |
| 8   | Фиксированные допущения зашиты по умолчанию (1 день, 1 спец, без транспорта/командировок/оснастки) | ✓ VERIFIED | params.js:91-97 (dni=1, specChel=1, флаги транспорт/командировки/оснастка=0); ogovorki содержат эти допущения |
| 9   | Все числа эталона в одном замороженном PARAMS (один источник истины) | ✓ VERIFIED | params.js:13 `Object.freeze`; Object.isFrozen=true; в формулах engine.js нет магических ставок/цен — всё через P.xxx |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `calculator/params.js` | Замороженный PARAMS, все числа эталона | ✓ VERIFIED | 104 строки, единственный экспорт `Object.freeze(PARAMS)`, все ключевые поля присутствуют, koefKlass тоже заморожен |
| `calculator/engine.js` | Чистая функция calc(inputs, P) -> breakdown | ✓ VERIFIED | 165 строк, `export function calc`, детерминирована, без DOM/глобалей; полная разбивка + ogovorki |
| `calculator/engine.selftest.js` | Самопроверка на 3 примерах + assert | ✓ VERIFIED | 82 строки, содержит «137600», 3 примера + нелинейность + кратность класса; код выхода 0 |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| engine.js | params.js | PARAMS передаётся аргументом calc(inputs, P) | ✓ WIRED | Сознательное решение «чистой функции»; selftest связывает их через import обоих модулей |
| engine.selftest.js | engine.js | `import { calc }` | ✓ WIRED | engine.selftest.js:11 |
| engine.selftest.js | params.js | `import { PARAMS }` | ✓ WIRED | engine.selftest.js:12 |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Самопроверка движка | `node calculator/engine.selftest.js` | Все 6 проверок PASS, EXIT_CODE=0 | ✓ PASS |
| Ценовые пороги массы (CALC-04) | прямой вызов calc на S=0.1/5/60 | 6800 / 6650 / 6400 | ✓ PASS |
| Вспом. материалы G62 (CALC-05) | прямой вызов calc | 2933.58 | ✓ PASS |
| Гарантия после прибыли (CALC-06) | сверка formula | (rabotyItogo+materialy)*5%=6552.39 | ✓ PASS |
| Класс меняет ИТОГО, не материалы (CALC-02) | calc класс 1 vs 3 | ИТОГО 137600.16 vs 150262.00; материалы 80792 неизменны | ✓ PASS |
| Устойчивость к мусорному вводу | calc({S:-1,T:0,klass:9}) | не вешает процесс, klass 9 → coef 1.0 fallback | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| CALC-01 | 01-02 | Воспроизводит Excel в пределах округления | ✓ SATISFIED | selftest 3 примера PASS |
| CALC-02 | 01-02 | Класс ×1.0/×1.2/×1.4 только к труду | ✓ SATISFIED | engine.js:87-88, selftest |
| CALC-03 | 01-02 | Нелинейное нанесение | ✓ SATISFIED | engine.js:75-77, selftest |
| CALC-04 | 01-02 | Материал по S/T + ценовые пороги | ✓ SATISFIED | прямая проверка порогов |
| CALC-05 | 01-02 | Вспом. материалы кол-во×цена | ✓ SATISFIED | vspomMaterialy=2933.58 |
| CALC-06 | 01-02 | Порядок накруток, НДС=0 | ✓ SATISFIED | engine.js:111-125 |
| CALC-07 | 01-02 | Текстовая оговорка про 80 кг | ✓ SATISFIED | engine.js:133-137, params.js:101 |
| CALC-08 | 01-01 | Фикс-допущения по умолчанию | ✓ SATISFIED | params.js:91-97 |
| CALC-09 | 01-01 | Единый блок параметров | ✓ SATISFIED | params.js Object.freeze, нет магических чисел |

Все 9 ID из frontmatter планов (01-01: CALC-08, CALC-09; 01-02: CALC-01..07) учтены в REQUIREMENTS.md и помечены там Complete. Orphaned-требований нет — REQUIREMENTS.md привязывает к Phase 1 ровно CALC-01..09, и все они заявлены в планах.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | Отладочных маркеров (TODO/FIXME/XXX/заглушек) не найдено | — | Единственное совпадение grep — слово «Исключение» в комментарии engine.js:13, ложная тревога |

### Gaps Summary

Гэпов нет. Цель этапа достигнута и подтверждена реальным кодом, а не только отчётами:
движок число-в-число воспроизводит эталон «700» на трёх контрольных примерах (классы 1/2/3),
самопроверка `node calculator/engine.selftest.js` завершается с кодом 0, все 9 требований CALC-01..09
покрыты и прослеживаются в REQUIREMENTS.md. PARAMS заморожен и является единым источником истины,
формулы движка не содержат магических чисел. Текстовая оговорка про деталь до 80 кг присутствует
в результате расчёта.

Этап — чистый вычислительный модуль без UI/визуала/внешних сервисов, поэтому всё проверяемо
программно; пунктов для человеческой верификации нет.

---

_Verified: 2026-06-30T12:15:00Z_
_Verifier: Claude (gsd-verifier)_
