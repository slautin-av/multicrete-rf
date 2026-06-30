---
phase: 02-ui-lead-embed
plan: 01
subsystem: calculator-ui
tags: [ui, modal, calculator, dark-theme, validation, tdd]
requires:
  - calculator/engine.js (calc — контракт breakdown, этап 1)
  - calculator/params.js (PARAMS — koefKlass, тексты оговорок, этап 1)
  - landing.html (источник тёмной темы «Стальной Vega» и механики модалки)
provides:
  - calculator/calculator.css (тёмная тема окна + адаптив)
  - calculator/index.html (разметка окна-оверлея + страница-модуль)
  - calculator/calculator-ui.js (механика окна, validateInputs, рендер «шапки»)
affects:
  - landing.html (план 05 встроит окно — здесь НЕ менялся)
tech-stack:
  added: []
  patterns:
    - "ES-модули в браузере без сборщика (import calc/PARAMS)"
    - "DOM-блок под guard typeof document — чистая validateInputs тестируется в Node"
    - "Intl.NumberFormat('ru-RU') для рублёвых сумм"
    - "node:test (встроенный) для TDD без внешних зависимостей"
key-files:
  created:
    - calculator/calculator.css
    - calculator/index.html
    - calculator/calculator-ui.js
    - calculator/calculator-ui.test.js
  modified: []
decisions:
  - "Класс сложности — radiogroup (radio), а не select: вся расшифровка видна сразу (UI-04)"
  - "validateInputs вынесена как export-функция и защищён DOM-блок — чистая логика тестируется в Node без браузера"
  - "Тесты на node:test (встроен в Node 22) — без добавления npm-зависимостей (INT-01)"
  - "Рендер через textContent/createElement, не innerHTML с вводом — защита от инъекций (T-02-01)"
metrics:
  duration: ~20 мин
  completed: 2026-06-30
  tasks: 3
  files: 4
---

# Phase 2 Plan 01: Окно калькулятора (интерфейс) Summary

Всплывающее окно калькулятора в тёмной теме лендинга: поля площадь/толщина/класс/«>80 кг», валидация с точными подсказками, вызов готового движка `calc()` и рендер «шапки» сметы с ИТОГО, ₽/м², оговорками и расшифровкой классов — всё видно сразу, без контактов. Собрано на чистом HTML/CSS/JS без сборщика (INT-01).

## Что сделано

### Задача 1 — `calculator/calculator.css` (commit 9b320dc)
Самодостаточный CSS тёмной темы «Стальной Vega». Переменные `:root` и базовые классы (`.modal`, `.btn`, `.pf-*`) скопированы дословно из `landing.html`, чтобы окно выглядело идентично лендингу (D-08). Новые классы окна: `.calc-modal` (большое окно с `max-height:90dvh`, `overflow-y:auto`, `overscroll-behavior:contain`), `.calc-row`/`.calc-total`/`.calc-perm2` («шапка», `tabular-nums`), `.calc-error` (красный). Адаптив: на `≤560px` окно во весь экран (`100dvh`, `border-radius:0`, `env(safe-area-inset-bottom)`); `.pf-row` → 1 столбец на `≤768px`. ИТОГО окрашено `--blue` (информация), CTA — `--pink` (действие). Уважает `prefers-reduced-motion`. Светлый `assets/styles` не подключается.

### Задача 2 — `calculator/index.html` (commit 4fe13ce)
Разметка окна и страница-модуль. Отдельный оверлей `#calc-modal-overlay` (не пересекается с `#modal-overlay` лендинга) с `role="dialog"`, `aria-modal="true"`, `aria-labelledby="calc-title"`. Поля: `calc-S`, `calc-T`, radiogroup класса 1/2/3, чекбокс `calc-heavy`. Контейнеры-приёмники: `calc-errors`, `calc-result`/`calc-total`/`calc-perm2`, `calc-ogovorki`, `calc-klass-info`. Empty state до расчёта. Подключены шрифты бренда, Lucide, `./calculator.css` и ES-модуль `./calculator-ui.js`. Тексты — дословно из UI-SPEC Copywriting.

### Задача 3 — `calculator/calculator-ui.js` (TDD: RED 7cc12dc → GREEN 02846f9)
ES-модуль. `validateInputs(S,T,klass)` — чистая export-функция с точными текстами UI-SPEC. Механика окна `openCalcModal`/`closeCalcModal`/`handleCalcOverlay` + Esc + фокус на первое поле + лёгкий фокус-трап (паттерн `landing.html` 932-951, переименован под свой оверлей). Кнопка «Рассчитать»: парсит поля, валидирует, при успехе вызывает `calc({S,T,klass}, PARAMS)` и рендерит «шапку» (`Intl.NumberFormat('ru-RU')`), ИТОГО синим/крупно, ₽/м². Оговорки `b.ogovorki` и расшифровка классов из `PARAMS.koefKlass` выводятся сразу. Чекбокс «>80 кг» меняет ТОЛЬКО текст оговорки про массу, число не трогает (CALC-07). Движок и `params.js` не изменены.

## TDD Gate Compliance

- RED gate: `test(этап-2): падающий тест validateInputs (RED)` — commit `7cc12dc` (падал: модуль ещё не существовал).
- GREEN gate: `feat(этап-2): логика окна калькулятора` — commit `02846f9` (5/5 тестов зелёные).
- REFACTOR: не требовался — код без дублирования формул, движок не тронут.

Тесты `node:test` покрывают только чистую `validateInputs` (без DOM). Механика окна и рендер «шапки» требуют браузерного DOM — проверяются ручным smoke-тестом (см. ниже), что соответствует `<behavior>` плана.

## Verification

- `node calculator/engine.selftest.js` — PASS (движок сверен с эталоном «700», UI его не трогает).
- `node --test calculator/calculator-ui.test.js` — 5/5 pass (S≤0, T≤0, класс не выбран, валидно, NaN).
- `import { validateInputs }` + `calc()` в Node — импорт UI-модуля без DOM не падает; `itogo` числовой (S=100,T=5,класс1 → ИТОГО 7 165 644 ₽, ₽/м² 71 656).
- Ручной smoke (для приёмки владельцем): открыть `calculator/index.html` → «Получить расчёт» → S=100/T=5/класс1 → видна «шапка», ИТОГО, ₽/м², оговорки и классы; S=0 → подсказка «Укажите площадь больше нуля, м²»; закрытие крестиком/фоном/Esc; на телефоне окно прокручивается, фон не дёргается.

## Соответствие success_criteria плана

- UI-01 окно открывается/закрывается (крестик, фон, Esc) — да.
- UI-02 поля площадь/толщина/класс/«>80 кг»; «>80 кг» меняет текст, не число — да.
- UI-03 «шапка» с ИТОГО и ₽/м² из breakdown — да.
- UI-04 расшифровка классов и оговорки видны сразу — да.
- UI-05 валидация ловит некорректный ввод с подсказкой — да.
- UI-06 фирменная тёмная тема + адаптив — да.
- INT-01 чистый HTML/CSS/JS без сборщика — да.

## Deviations from Plan

### Авто-добавления (Rule 3 — необходимо для TDD)

**1. [Rule 3] Создан тестовый файл `calculator/calculator-ui.test.js`**
- **Найдено при:** Задача 3 (`tdd="true"`) — для RED/GREEN-цикла нужен исполняемый тест.
- **Решение:** использован встроенный `node:test` (Node 22) — без добавления npm-зависимостей, чтобы не нарушать INT-01 (статика без сборщика).
- **Файлы:** `calculator/calculator-ui.test.js` (не входил в `files_modified`, но требуется TDD-гейтом плана).
- **Коммиты:** 7cc12dc (RED), 02846f9 (GREEN).

### Прочее

- В разметке заголовок «Получить расчёт» вынесен на страницу-модуль (`#calc-open`), чтобы модуль `calculator/index.html` работал автономно. Встраивание в `landing.html` и перенацеливание лендинговой кнопки — отдельный план 05 (не в этом плане).
- Форма заявки, воронка детализации и отправка — НЕ реализованы (план 04, граница плана соблюдена).

## Threat Surface

Соответствует `<threat_model>` плана, нового surface не добавлено:
- T-02-01 (Tampering ввода) — mitigate: `validateInputs` отвергает невалидный ввод до `calc()`; рендер через `textContent`/`createElement`, без `innerHTML` с сырым вводом и без `eval`.
- T-02-02 / T-02-03 — accept (по плану): коэффициенты публичны (решение владельца), DoS-риск низкий (конечная арифметика). Секретов/токенов в файлах окна нет.

## Self-Check: PASSED

Created files:
- FOUND: calculator/calculator.css
- FOUND: calculator/index.html
- FOUND: calculator/calculator-ui.js
- FOUND: calculator/calculator-ui.test.js

Commits:
- FOUND: 9b320dc (Задача 1 — calculator.css)
- FOUND: 4fe13ce (Задача 2 — index.html)
- FOUND: 7cc12dc (Задача 3 RED — test)
- FOUND: 02846f9 (Задача 3 GREEN — calculator-ui.js)
