---
phase: 02-ui-lead-embed
plan: 05
subsystem: landing-embed / acceptance
tags: [landing, embed, modal, calculator, lead, manual-checklist, d-02]
dependency_graph:
  requires:
    - "02-01: окно calculator/index.html (#calc-modal-overlay) + calculator-ui.js (openCalcModal/closeCalcModal/handleCalcOverlay на window)"
    - "02-04: финальное состояние окна — форма заявки + воронка детализации в той же разметке оверлея"
    - "02-02: контракт send-lead.php (письмо на MultiCrete@yandex.ru, From на своём домене, порт 587/TLS) — для гейта D-02 в чек-листе"
  provides:
    - "Точка входа клиента: кнопка «Получить расчёт» на лендинге открывает окно калькулятора (INT-02)"
    - "Окно калькулятора встроено в landing.html (отдельный оверлей #calc-modal-overlay, стиль + ES-модуль подключены)"
    - "Ручной чек-лист приёмки этапа 2 с обязательным гейтом живой доставки письма (D-02)"
  affects:
    - "landing.html — единая точка входа в калькулятор"
    - "приёмка этапа 2 — MANUAL-CHECKLIST.md перед /gsd-verify-work"
tech_stack:
  added: []
  patterns:
    - "Инлайн-встраивание окна: отдельный оверлей #calc-modal-overlay рядом с #modal-overlay лендинга, общие :root/классы, без CORS"
    - "ES-модуль type=module отложен по умолчанию → DOM готов, window.openCalcModal доступен для инлайн-onclick"
    - "Граница плана: формы лендинга и окно «Заказать звонок» не трогаются (Deferred)"
key_files:
  created:
    - "calculator/MANUAL-CHECKLIST.md — ручной чек-лист приёмки этапа + гейт доставки письма (D-02)"
  modified:
    - "landing.html — перенацелена кнопка «Получить расчёт» на openCalcModal(this); подключён calculator.css + calculator-ui.js; вставлена разметка оверлея #calc-modal-overlay"
decisions:
  - "Встраивание ИНЛАЙН (RESEARCH Open Question 2): разметка оверлея скопирована в landing.html, calculator/index.html остаётся самостоятельной страницей (D-07) — общие стили/JS, без iframe/CORS"
  - "Кнопка зовёт openCalcModal(this) (а не openCalcModal()) — передаём триггер, чтобы при закрытии окна фокус вернулся на кнопку (сигнатура openCalcModal(trigger) из плана 01)"
  - "goTo НЕ удалена — якорь #price ещё используется в навигации (строка 524)"
  - "calculator.css подключён в <head> ДО инлайн <style> лендинга — переменные :root совпадают, классы .calc-* собственные, конфликта нет"
metrics:
  duration: ~12 мин
  completed: 2026-06-30
  tasks: 2
  files: 2
requirements: [INT-02]
---

# Phase 2 Plan 05: Встраивание калькулятора в лендинг + приёмочный чек-лист Summary

Заметная кнопка «Получить расчёт» в первом экране лендинга теперь открывает всплывающее окно калькулятора (раньше прокручивала к блоку цен): окно встроено в `landing.html` отдельным оверлеем `#calc-modal-overlay` со своим стилем и ES-модулем, существующая механика лендинга не тронута. Создан ручной чек-лист приёмки всего этапа с обязательным гейтом проверки живой доставки письма (D-02).

## Что сделано

### Задача 1 — `landing.html` (commit `73873c0`)
- **Перенацелена кнопка** «Получить расчёт» в hero (строка 548): `onclick="goTo('#price')"` → `onclick="openCalcModal(this)"` (INT-02, D-08). Текст и иконка `data-lucide="calculator"` сохранены. Функция `goTo` НЕ удалена — якорь `#price` ещё используется в навигации.
- **Подключён стиль окна** `<link rel="stylesheet" href="calculator/calculator.css">` в `<head>` (после шрифтов, до инлайн `<style>` лендинга — переменные `:root` совпадают, классы `.calc-*` собственные).
- **Вставлена разметка оверлея** `#calc-modal-overlay` (со всеми полями, «шапкой», оговорками, классами, формой заявки, детализацией) перед `</body>`, рядом с существующим `#modal-overlay`, НЕ заменяя его. Разметка скопирована из `calculator/index.html` (финальное состояние после планов 01+04).
- **Подключён ES-модуль** `<script type="module" src="calculator/calculator-ui.js"></script>` перед `</body>`. Модуль вешает `openCalcModal/closeCalcModal/handleCalcOverlay` на `window` (план 01) — доступны для инлайн-onclick; `type="module"` отложен, поэтому DOM (включая оверлей) уже готов к моменту инициализации.
- **Граница (Deferred) соблюдена:** окно «Заказать звонок» `#modal-overlay`, функции `openModal/closeModal/handleOverlay/submitForm/submitCall`, форма прайса и чекбокс согласия лендинга (строка 879, `checked`) — без изменений.

### Задача 2 — `calculator/MANUAL-CHECKLIST.md` (commit `a364fb3`)
Ручной чек-лист приёмки этапа 2 (UI/почту автотестами не покрыть). Структура:
- Раздел 0: авто-проверка движка `node calculator/engine.selftest.js` (+ опционально `node --test calculator/calculator-ui.test.js`).
- Разделы 1–3: чек-лист «действие → ожидаемый результат» по всем требованиям этапа — UI-01..UI-06, INT-01/02, LEAD-01..LEAD-03 (открытие/закрытие окна, поля, «шапка», расшифровка классов, валидация, адаптив на телефоне, кнопка на лендинге, цена без формы, блокировка без согласия, ссылка `/privacy/`, успех/ошибка отправки, воронка детализации).
- Раздел 4: **ОБЯЗАТЕЛЬНЫЙ гейт живой доставки письма (D-02)** — реальная заявка на заливке → письмо ПРИШЛО на `MultiCrete@yandex.ru` (с обязательной проверкой папки «Спам»); эскалация: From на своём домене / порт 587 TLS / SPF / существование ящика-отправителя → fallback на **Web3Forms**. Помечен как приёмочный гейт перед `/gsd-verify-work`, требует доступов Reg.ru от владельца.
- Каждый пункт — чекбокс `[ ]`, текст на русском.

## Verification

- **Задача 1 verify** (node-проверка плана) — **ok**: кнопка перенацелена (`openCalcModal(this)`), старого `goTo('#price')` на кнопке нет, присутствуют `calc-modal-overlay`, `calculator/calculator.css`, `calculator/calculator-ui.js`, `type="module"`; окно лендинга (`submitCall`, `id="modal-overlay"`) цело.
- **Дополнительно**: `goTo` сохранена, `openModal/submitForm` целы, `calculator.css` подключён до `<style>` лендинга — подтверждено.
- **Задача 2 verify** (node-проверка плана) — **ok**: присутствуют все маркеры UI-01..UI-06, INT-01/02, LEAD-01..LEAD-03, `MultiCrete@yandex.ru`, `Спам`, `engine.selftest.js`, `Web3Forms`.
- **Ручная приёмка** (по `MANUAL-CHECKLIST.md`): клик «Получить расчёт» → окно калькулятора; закрытие крестиком/фоном/Esc; окно «Заказать звонок» и форма прайса работают как раньше. Живая доставка письма — приёмочный гейт на заливке (доступы владельца).

## Соответствие success_criteria плана

- Заметная кнопка на лендинге открывает окно калькулятора (INT-02) — да.
- Окно встроено, существующая механика лендинга не сломана — да.
- Ручной чек-лист приёмки покрывает все требования этапа и обязательную проверку доставки письма (D-02) — да.

## Deviations from Plan

### Авто-улучшения (Rule 1 — корректность поведения)

**1. [Rule 1 — Поведение] Кнопка зовёт `openCalcModal(this)` вместо `openCalcModal()`**
- **Найдено при:** Задача 1.
- **Причина:** сигнатура функции из плана 01 — `openCalcModal(trigger)`; trigger используется для возврата фокуса на кнопку при закрытии окна (доступность). Без аргумента возврат фокуса опирался бы на `document.activeElement` — менее надёжно.
- **Решение:** передан `this` (кнопка). Условие плана `contains: "openCalcModal"` выполнено; verify-проверка скорректирована, чтобы принимать оба варианта (`openCalcModal()` / `openCalcModal(this)`).
- **Файлы:** `landing.html`. **Коммит:** `73873c0`.

## Threat Surface

Соответствует `<threat_model>` плана, нового surface не добавлено:
- T-02-15 (конфликт окна калькулятора с окном лендинга) — **mitigate**: калькулятор использует ОТДЕЛЬНЫЙ оверлей `#calc-modal-overlay` и переименованные функции `openCalcModal/closeCalcModal/handleCalcOverlay`; окно лендинга `#modal-overlay` и `submitForm/submitCall` не изменены (verify подтверждает их наличие).
- T-02-16 (подключение скриптов/секретов в лендинг) — **accept**: подключены только локальные файлы окна (`calculator.css`, ES-модуль); секретов/ключей нет, Web3Forms-ключ в этап не зашивается.

## Known Stubs

Отсутствуют. Кнопка реально перенацелена на встроенное окно; окно подключено к реальному движку (план 01) и эндпоинту `/send-lead.php` (план 02/04). Живая доставка письма (D-02) — известный отложенный приёмочный шаг на заливке с доступами владельца (зафиксирован в `MANUAL-CHECKLIST.md`), а не стаб данного плана.

## Self-Check: PASSED

Created files:
- FOUND: calculator/MANUAL-CHECKLIST.md

Modified files:
- FOUND: landing.html (кнопка перенацелена, оверлей + стиль + модуль подключены)

Commits:
- FOUND: 73873c0 (Задача 1 — встраивание окна в landing.html)
- FOUND: a364fb3 (Задача 2 — MANUAL-CHECKLIST.md)
