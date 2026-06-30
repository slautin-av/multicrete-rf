---
phase: 02-ui-lead-embed
plan: 04
subsystem: calculator-ui / lead-capture
tags: [lead, form, consent-152fz, funnel, fetch, calculator]
dependency_graph:
  requires:
    - "02-01: окно calculator/index.html + calculator-ui.js (lastBreakdown, рендер «шапки»)"
    - "02-02: send-lead.php — контракт POST { name, organization, phone, email, source, website } → { success, error? }"
    - "02-03: страница политики /privacy/ для ссылки согласия"
  provides:
    - "Необязательная форма заявки в окне калькулятора (имя/организация/телефон/e-mail)"
    - "Реальная отправка на /send-lead.php через fetch (фронт LEAD-02)"
    - "Согласие 152-ФЗ (required, ссылка на /privacy/) — блокировка отправки без него (LEAD-03)"
    - "Воронка D-10: построчная детализация сметы раскрывается после валидной отправки"
  affects:
    - "landing.html (план 05 встроит окно — здесь НЕ менялся)"
tech_stack:
  added: []
  patterns:
    - "fetch POST JSON на легко переключаемую константу LEAD_ENDPOINT (D-02)"
    - "form.checkValidity()/reportValidity() — нативная валидация required-полей и согласия"
    - "Honeypot website отправляется на сервер, где тихо отбрасывается (T-02-13)"
    - "renderDetails читает поля breakdown — формулы движка не дублируются"
    - "Рендер через textContent/createElement — без innerHTML с вводом (защита от инъекций)"
key_files:
  created: []
  modified:
    - "calculator/index.html — разметка формы заявки + согласие + honeypot + скрытый блок calc-details"
    - "calculator/calculator-ui.js — sendLead(), handleLeadSubmit(), renderDetails(), сообщения успеха/ошибки"
decisions:
  - "Endpoint вынесен в одну константу LEAD_ENDPOINT='/send-lead.php' — переключение на Web3Forms-fallback одной строкой (D-02)"
  - "Валидация через нативные checkValidity()/reportValidity() — браузер сам подсвечивает required-поля, включая согласие (минимум кода, доступность)"
  - "Эластомер в детализации показан строкой «масса × цена = стоимость» для наглядности инженеру; формулы не дублируются — читаются поля breakdown"
  - "Кнопка submit блокируется на время запроса и разблокируется при ошибке (защита от двойной отправки)"
metrics:
  duration: ~15 мин
  completed: 2026-06-30
  tasks: 2
  files: 2
requirements: [LEAD-01, LEAD-02, LEAD-03]
---

# Phase 2 Plan 04: Форма заявки и воронка детализации Summary

В окно калькулятора добавлена необязательная форма заявки (имя/организация/телефон/e-mail) с обязательным согласием 152-ФЗ (ссылка на `/privacy/`), реальной отправкой на `/send-lead.php` и воронкой D-10: после валидной отправки раскрывается полная построчная детализация сметы из `breakdown`. Цена (ИТОГО) и «шапка» по-прежнему видны без формы — за контакты дают раскладку, не цену.

## Что сделано

### Задача 1 — `calculator/index.html` (коммит `b330817`)
Под блоком результата/оговорок/классов добавлен блок `.calc-lead`: подзаголовок «Оставить заявку» + текст-приглашение воронки «Оставьте контакты, чтобы увидеть полную построчную смету» (дословно из UI-SPEC). Форма `#calc-lead-form` (с `novalidate`, чтобы валидацией управлял JS через `checkValidity`) с полями на классах лендинга `.pf-row`/`.pf-label`/`.pf-input`: имя `#lead-name` (required), организация `#lead-org` (необязательно), телефон `#lead-phone` (`type="tel"`), e-mail `#lead-email` (`type="email"`). Honeypot `name="website" id="lead-website"` (скрытый off-screen, `aria-hidden`, `tabindex="-1"`) — совпадает с проверкой `website` в `send-lead.php`. Чекбокс согласия `#lead-consent` (`required`, БЕЗ `checked`) + текст «Я согласен на [обработку персональных данных]» со ссылкой `href="/privacy/" target="_blank" rel="noopener"`. Кнопка `.btn.btn-primary.pf-submit #lead-submit` «Отправить заявку». Контейнеры для JS: `#lead-message` (успех/ошибка, `aria-live`), `#calc-details` (`hidden`, построчная детализация). Форма стоит ПОСЛЕ «шапки»+оговорок+классов — цена видна без формы (LEAD-01/D-11). Существующие формы лендинга не затронуты (другой файл).

### Задача 2 — `calculator/calculator-ui.js` (коммит `3876778`)
- Константа `LEAD_ENDPOINT = '/send-lead.php'` одной строкой (fallback Web3Forms задокументирован комментарием, D-02).
- `async sendLead(data)`: `fetch` POST JSON с `{ ...data, source: 'calculator' }`; парсит ответ; при `!json.success` → `throw Error(json.error || 'send failed')`.
- `handleLeadSubmit(e)`: `e.preventDefault()`; `form.checkValidity()` + `reportValidity()` — без отмеченного согласия (required) отправка не проходит, браузер подсвечивает поля (LEAD-03). Собирает `{ name, organization, phone, email, website }`, блокирует кнопку, `await sendLead`. Успех → сообщение «Спасибо, заявка отправлена. Мы свяжемся с вами в течение часа.» + `renderDetails(lastBreakdown)` + `calc-details.hidden = false` (воронка D-10). Ошибка → сообщение «Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.» красным (`.calc-error`), детализация НЕ раскрывается, кнопка разблокируется.
- `renderDetails(b)`: построчно выводит поля работ и материалов из `breakdown` (`stDrobestruika`…`stOchistitel`, `sumWorks`, `stITR`, `esn`, `sklad`, `garantiya`, `rabotyItogo`, эластомер «масса×цена=стоимость», `perM2mm`) с подписями; формат чисел — тот же `Intl.NumberFormat('ru-RU')` (`formatRub`) плана 01. Формулы движка не дублируются — только читаются поля. Если `lastBreakdown` пуст (форма отправлена без расчёта) — детализация не рендерится.
- Тексты успеха/ошибки/согласия — дословно из UI-SPEC. `engine.js`/`params.js` не тронуты.

## Verification

- `node calculator/engine.selftest.js` — **PASS** (движок сверен с эталоном «700», UI его не трогает).
- Статическая проверка `calculator-ui.js` (verify-команда плана) — **ok**: присутствуют `sendLead`, `LEAD_ENDPOINT`, `send-lead.php`, `checkValidity`, `calc-lead-form`, `calc-details`, `hidden = false`, `renderDetails`, `source`.
- Статическая проверка `index.html` (verify-команда плана) — **ok**: все маркеры формы/согласия/honeypot/детализации на месте, текст «Отправить заявку» присутствует.
- `node --test calculator/calculator-ui.test.js` — **5/5 pass** (импорт UI-модуля после правок не сломался, валидация плана 01 цела).
- Ручной (для приёмки владельцем): рассчитать смету → «шапка»+ИТОГО видны без формы (LEAD-01); отправка без галочки согласия → браузер блокирует (LEAD-03); отметить согласие + контакты → сообщение успеха + раскрытие построчной детализации (D-10); при недоступном endpoint → сообщение об ошибке, детализация не раскрывается.

## Соответствие success_criteria плана

- LEAD-01: необязательная форма после результата; цена видна без формы — да.
- LEAD-02 (фронт): отправка идёт на `/send-lead.php`, успех/ошибка показываются пользователю — да.
- LEAD-03: без согласия 152-ФЗ отправка недоступна (required + checkValidity); ссылка на `/privacy/` работает — да.
- D-10: воронка детализации раскрывается только после валидной отправки — да.

## Deviations from Plan

None — план выполнен ровно как написано.

## Threat Surface

Соответствует `<threat_model>` плана, нового surface не добавлено:
- T-02-11 (отправка без согласия) — **mitigate**: чекбокс `required` + `form.checkValidity()` блокируют отправку; ссылка ведёт на `/privacy/`; согласие активное (без `checked`).
- T-02-12 (детализация в DOM) — **accept** (по плану): раскладка, не цена и не секрет; клиентский show/hide достаточен (D-10).
- T-02-13 (бот заполняет форму) — **mitigate**: honeypot `website` отправляется на сервер (план 02 тихо отбрасывает).
- T-02-14 (Web3Forms-ключ) — не активирован: в этот этап зашит только `/send-lead.php`, ключ не плодим в репозитории (CLAUDE.md).

Рендер сообщений и детализации — через `textContent`/`createElement`, без `innerHTML` с вводом (защита от инъекций, как в плане 01).

## Known Stubs

Отсутствуют. Форма полностью подключена к реальному эндпоинту `/send-lead.php` (план 02), детализация — к реальным полям `breakdown` движка. Живая проверка доставки письма (D-02) выполняется на заливке с доступами владельца — это известный отложенный приёмочный шаг плана 02, не стаб данного плана.

## Notes

- `calculator.css` не правился (вне `files_modified` плана). Новые блоки `.calc-lead`/`.calc-details`/`.calc-lead-sub`/`.calc-lead-success` используют существующие классы лендинга (`.pf-*`, `.btn`, `.calc-row`, `.calc-error`) и функциональны; точечная визуальная полировка этих обёрток — вне границ плана 04.
- Встраивание окна в `landing.html` и перенацеливание лендинговой кнопки — отдельный план 05 (не в этом плане).

## Self-Check: PASSED

Modified files:
- FOUND: calculator/index.html
- FOUND: calculator/calculator-ui.js

Commits:
- FOUND: b330817 (Задача 1 — форма заявки + блок детализации в index.html)
- FOUND: 3876778 (Задача 2 — sendLead/submit/renderDetails в calculator-ui.js)
