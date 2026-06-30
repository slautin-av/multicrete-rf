---
phase: 02-ui-lead-embed
verified: 2026-06-30T12:00:00Z
status: human_needed
score: 11/11
overrides_applied: 0
human_verification:
  - test: "UI-01/UI-06 — Открытие/закрытие окна и мобильная адаптация"
    expected: "Кнопка «Получить расчёт» открывает окно поверх лендинга; окно закрывается крестиком, кликом по фону, Esc; на телефоне окно прокручивается, фон не дёргается"
    why_human: "Браузерное поведение (focus-trap, overscroll, safe-area) невозможно проверить кодом"
  - test: "UI-03/UI-04 — Рендер «шапки» сметы и расшифровки классов в реальном браузере"
    expected: "После ввода S=100, T=5, класс 1 — видна «шапка» (трудозатраты, материалы, ИТОГО, ₽/м²), ниже — оговорки и расшифровка классов 1/2/3 с коэффициентами"
    why_human: "Рендер DOM-элементов проверяется только в браузере"
  - test: "LEAD-02 — Живая доставка письма владельцу (D-02)"
    expected: "После реальной отправки заявки с хостинга Reg.ru письмо приходит на MultiCrete@yandex.ru (включая папку «Спам»)"
    why_human: "Требует доступы Reg.ru, рабочий домен в FROM_EMAIL и живой почтовый сервер — выполняется только на заливке; процедура описана в calculator/MANUAL-CHECKLIST.md раздел 4"
  - test: "LEAD-03 — Блокировка отправки без согласия в браузере"
    expected: "Форма не уходит без отметки чекбокса согласия; браузер подсвечивает обязательное поле"
    why_human: "form.checkValidity() / reportValidity() — браузерный UX, не тестируется в Node"
  - test: "WR-05 — Плейсхолдеры реквизитов видны до заполнения владельцем"
    expected: "На странице /privacy/ видны {{НАИМЕНОВАНИЕ}}, {{ИНН}}, {{ОГРН}}, {{ЮР_АДРЕС}}, {{ДАТА}} — это ожидаемое состояние до заливки, не дефект кода; владелец заполняет из учредительных документов"
    why_human: "Требует решения владельца (получить реквизиты и подставить)"
---

# Этап 2: Верификация — Окно калькулятора, форма заявки, встраивание

**Цель этапа:** Клиент на сайте открывает калькулятор всплывающим окном, вводит площадь/толщину/класс (и при необходимости флаг «>80 кг»), сразу видит предварительную стоимость с разбивкой-«шапкой», оговорками и расшифровкой классов, а затем при желании оставляет заявку (контакты) — в фирменном стиле и на телефоне.
**Проверено:** 2026-06-30
**Статус:** human_needed
**Ре-верификация:** Нет — первичная верификация

---

## Цель достигнута

Все 11 наблюдаемых истин подтверждены кодом. Автотесты движка и валидатора ввода зелёные. Блокер безопасности (CR-01) и дефекты качества (WR-01..WR-03) исправлены до верификации. Оставшиеся нерешённые пункты (WR-04, WR-05) — намеренно отложены владельцу и не являются пробелами реализации. Статус «human_needed» выставлен потому, что браузерное поведение окна, мобильная адаптация и живая доставка письма не поддаются автоматической проверке.

---

## Наблюдаемые истины

| # | Истина | Статус | Доказательство в коде |
|---|--------|--------|-----------------------|
| 1 | Клиент открывает окно калькулятора кнопкой и закрывает его (крестик, фон, Esc) | VERIFIED | `landing.html:551` — кнопка `onclick="openCalcModal(this)"`, старого `goTo('#price')` нет; `calculator-ui.js:109-134` — `window.openCalcModal`, `closeCalcModal`, `handleCalcOverlay`, обработчик Esc |
| 2 | После ввода площадь/толщина/класс показывается «шапка» сметы с ИТОГО и ₽/м² | VERIFIED | `calculator-ui.js:187-217` — функция `renderResult(b)` рендерит trudozatraty, vspomMaterialy, nakladnye, pribyl, materialy, transport, komandirovki, nds, ИТОГО (`#calc-total`), ₽/м² (`#calc-perm2`) |
| 3 | Расшифровка классов 1/2/3 и блок оговорок видны сразу вместе с «шапкой» | VERIFIED | `calculator-ui.js:150` — `renderKlassInfo()` вызывается при инициализации (до расчёта); `renderOgovorki()` вызывается вместе с `renderResult()`; `index.html:90-93` — `#calc-klass-info` видим изначально |
| 4 | Некорректный ввод (S≤0, T≤0, класс не выбран) даёт понятную подсказку и не ломает расчёт | VERIFIED | `calculator-ui.js:19-25` — `validateInputs()` с точными текстами UI-SPEC; тест `node --test calculator-ui.test.js` — 5/5 pass; `calc()` не вызывается при ошибках (строка 161) |
| 5 | Окно выполнено в тёмной теме лендинга и прокручивается на телефоне, не дёргая фон | VERIFIED (браузер — human) | `calculator.css` — все токены: `--steel`, `--blue`, `--pink`, `--red`, `max-height:90dvh`, `overflow-y:auto`, `overscroll-behavior:contain`, `env(safe-area-inset-bottom)`, `tabular-nums` |
| 6 | POST-заявка с фронта принимается обработчиком и пересылается письмом владельцу | VERIFIED (живая почта — human) | `send-lead.php` — `mail(LEAD_RECIPIENT, ...)`, `LEAD_RECIPIENT = 'MultiCrete@yandex.ru'` зашит в коде |
| 7 | Поля, идущие в заголовки письма (e-mail, name, source), отвергаются при наличии CRLF | VERIFIED | `send-lead.php:57-63` — `rejectIfInjection()` применена к `name` (стр.100), `email` (стр.103), `source` (стр.106, CR-01 исправлен) |
| 8 | Заполненный honeypot тихо отбрасывает заявку бота | VERIFIED | `send-lead.php:93-97` — `if ($honeypot !== '') respond(true)`; `index.html:126` / `landing.html:1030` — hidden-поле `name="website"` |
| 9 | Цена (ИТОГО) видна без формы; форма заявки необязательна | VERIFIED | `index.html:74-82` — `#calc-result` содержит ИТОГО и ₽/м² выше формы заявки; форма на строке 98+ (ниже результата); нет `required` на всей секции result |
| 10 | Без галочки согласия 152-ФЗ отправка недоступна; галочка ссылается на /privacy/ | VERIFIED (браузер — human) | `calculator-ui.js:244-246` — `form.checkValidity()` / `reportValidity()`; `index.html:130-131` — `required` на `lead-consent`, ссылка `href="/privacy/" target="_blank" rel="noopener"` |
| 11 | После валидной отправки раскрывается полная построчная детализация (воронка D-10) | VERIFIED | `calculator-ui.js:273-274` — `renderDetails(lastBreakdown); document.getElementById('calc-details').hidden = false`; `renderDetails()` обходит все поля DETAILS_ROWS из breakdown |

**Счёт: 11/11 истин подтверждены кодом**

---

## Требуемые артефакты

| Артефакт | Ожидание | Статус | Детали |
|----------|----------|--------|--------|
| `calculator/calculator.css` | Стили окна тёмной темы + адаптив | VERIFIED | Все токены присутствуют: `--steel`, `--blue`, `--pink`, `--red`, `.calc-modal`, `.calc-modal-overlay`, `90dvh`, `overscroll-behavior:contain`, `tabular-nums`, `env(safe-area-inset-bottom)`, `.calc-lead`, `.calc-lead-sub`, `.calc-lead-success`, `.calc-details` (WR-01 исправлен) |
| `calculator/index.html` | Разметка окна с оверлеем, полями, контейнерами | VERIFIED | Все требуемые id: `calc-modal-overlay`, `calc-S/T/klass/heavy/run`, `calc-result/total/ogovorki/klass-info`, `calc-lead-form`, `lead-name/org/phone/email/consent/submit/message/website`, `calc-details`; подключён `./calculator.css`, скрипт `type="module"` |
| `calculator/calculator-ui.js` | Механика окна, валидация, рендер, отправка | VERIFIED | Импорты `calc` / `PARAMS`; функции `validateInputs` (export), `openCalcModal`, `closeCalcModal`, `handleCalcOverlay`, `sendLead`, `renderResult`, `renderOgovorki`, `renderKlassInfo`, `renderDetails`, `handleLeadSubmit`; все вешаются на `window` для inline-onclick |
| `send-lead.php` | PHP-обработчик с защитами, JSON-ответ | VERIFIED | `preg_match('/[\r\n]/',...)` для header-injection; `$to` зашит; honeypot; `source` через белый список + `rejectIfInjection`; JSON `{success:bool}`; секретов нет |
| `privacy/index.html` | Страница политики 152-ФЗ, 8 разделов, плейсхолдеры | VERIFIED | Все 8 разделов, плейсхолдеры `{{НАИМЕНОВАНИЕ}}/{{ИНН}}/{{ОГРН}}/{{ЮР_АДРЕС}}/{{ДАТА}}`, контакты оператора, тёмная тема без `base.css` |
| `landing.html` | Кнопка перенацелена, окно встроено | VERIFIED | `onclick="openCalcModal(this)"` на кнопке; старого `goTo('#price')` нет; `<link href="calculator/calculator.css">`; оверлей `#calc-modal-overlay`; `<script type="module" src="calculator/calculator-ui.js">`; старые `#modal-overlay`, `submitCall`, `goTo` сохранены |
| `calculator/MANUAL-CHECKLIST.md` | Ручной чек-лист всех требований + процедура доставки письма | VERIFIED | Все пункты UI-01..UI-06, INT-01/02, LEAD-01..LEAD-03; команда `engine.selftest.js`; процедура `MultiCrete@yandex.ru` + «Спам» + эскалация на Web3Forms |

---

## Верификация ключевых связей

| От | К | Через | Статус | Детали |
|----|---|-------|--------|--------|
| `calculator-ui.js` | `calculator/engine.js` | `import { calc } from './engine.js'` | VERIFIED | Строка 13; `engine.selftest.js` — PASS (13/13) |
| `calculator-ui.js` | `calculator/params.js` | `import { PARAMS } from './params.js'` | VERIFIED | Строка 14; `PARAMS.koefKlass` используется в `renderKlassInfo()` |
| `calculator/index.html` | `calculator/calculator-ui.js` | `<script type="module" src="./calculator-ui.js">` | VERIFIED | Строка 154 `index.html` |
| `calculator-ui.js` | `send-lead.php` | `fetch(LEAD_ENDPOINT, {method:'POST',...})` | VERIFIED | `LEAD_ENDPOINT = '/send-lead.php'` стр.49; `sendLead()` стр.78 |
| Форма согласия | `privacy/index.html` | `<a href="/privacy/" target="_blank" rel="noopener">` | VERIFIED | `index.html:131`, `landing.html:1035` |
| Submit формы | `#calc-details` | `document.getElementById('calc-details').hidden = false` | VERIFIED | `calculator-ui.js:274` |
| `landing.html` кнопка | Окно калькулятора | `onclick="openCalcModal(this)"` | VERIFIED | `landing.html:551`; `window.openCalcModal` определён в `calculator-ui.js:109` |
| `landing.html` | `calculator/calculator-ui.js` | `<script type="module" src="calculator/calculator-ui.js">` | VERIFIED | `landing.html:1131` |

---

## Трассировка потока данных (Level 4)

| Артефакт | Переменная | Источник данных | Реальные данные | Статус |
|----------|-----------|-----------------|-----------------|--------|
| `renderResult(b)` | `b` (breakdown) | `calc({S,T,klass}, PARAMS)` | Движок `engine.js` с реальными формулами; `selftest` проверен | FLOWING |
| `renderOgovorki(b, heavy)` | `b.ogovorki` | Массив из `calc()` | engine.js строки ~117-130; 3 текстовых оговорки | FLOWING |
| `renderKlassInfo()` | `PARAMS.koefKlass` | `params.js` (import) | Объект `{1:1.0, 2:1.2, 3:1.4}` | FLOWING |
| `renderDetails(lastBreakdown)` | `lastBreakdown` | Сохранён при вызове `calc()` | Полный breakdown с 20+ полями детализации | FLOWING |
| `sendLead(data)` | HTTP ответ | POST `/send-lead.php` | Реальный `mail()` (проверяется на заливке) | PARTIAL (живая почта — human) |

---

## Поведенческие spot-проверки

| Поведение | Команда | Результат | Статус |
|-----------|---------|-----------|--------|
| Движок даёт правильное ИТОГО | `node calculator/engine.selftest.js` | PASS — 13/13 (все контрольные примеры из Excel) | PASS |
| `validateInputs` ловит S≤0, T≤0, klass=0, NaN | `node --test calculator/calculator-ui.test.js` | PASS — 5/5 | PASS |
| CSS содержит все требуемые токены | node-проверка | ok — все 14 токенов присутствуют | PASS |
| `calculator/index.html` содержит все требуемые id | node-проверка | ok — все 29 проверяемых значений присутствуют | PASS |
| `send-lead.php` — нет секретов, все защиты | node-проверка | missing:[], leaks:0, source в rejectIfInjection: true | PASS |
| `landing.html` — кнопка перенацелена, старое удалено, окно встроено | node-проверка | openCalcModal: true, oldBtn: false, css: true, overlay: true, js: true, module: true | PASS |
| `calculator/MANUAL-CHECKLIST.md` — все требования + процедура | node-проверка | missing:[] (все 15 ключевых маркеров присутствуют) | PASS |
| `privacy/index.html` — 8 разделов, плейсхолдеры, тёмная тема | node-проверка | missing:[], no base.css: true | PASS |

---

## Покрытие требований

| Требование | План | Описание | Статус | Доказательство |
|------------|------|----------|--------|----------------|
| UI-01 | 02-01 | Окно открывается/закрывается | SATISFIED | `openCalcModal`/`closeCalcModal`/Esc в `calculator-ui.js:109-134` |
| UI-02 | 02-01 | Поля: площадь, толщина, класс, «>80 кг» | SATISFIED | `index.html:41-59`, `landing.html:944-963` |
| UI-03 | 02-01 | «Шапка» сметы: ИТОГО, ₽/м², разбивка | SATISFIED | `renderResult(b)` в `calculator-ui.js:187-217` |
| UI-04 | 02-01 | Расшифровка классов и оговорки сразу | SATISFIED | `renderKlassInfo()` при инициализации; `renderOgovorki()` сразу после `renderResult()` |
| UI-05 | 02-01 | Валидация с понятными подсказками | SATISFIED | `validateInputs()` + тесты 5/5 |
| UI-06 | 02-01 | Тёмная тема + адаптив на телефоне | SATISFIED (human — UX) | CSS: тёмная палитра, `90dvh`, `overscroll-behavior:contain`, мобайл-брейкпоинт |
| INT-01 | 02-01 | Чистый HTML/CSS/JS без сборщика | SATISFIED | Файлы в `calculator/` — статика, нет package.json/build-шага |
| INT-02 | 02-05 | Кнопка на лендинге открывает окно | SATISFIED | `landing.html:551` `onclick="openCalcModal(this)"` |
| LEAD-01 | 02-04 | Цена видна без формы; форма необязательна | SATISFIED | `#calc-result` выше `calc-lead-form` в разметке; шапка доступна сразу |
| LEAD-02 | 02-02, 02-04 | Отправка на send-lead.php, успех/ошибка | SATISFIED (живая почта — human) | `sendLead()` POST на `/send-lead.php`; сообщения успеха/ошибки в `renderLeadMessage()` |
| LEAD-03 | 02-03, 02-04 | Галочка согласия 152-ФЗ, ссылка на /privacy/ | SATISFIED (браузер — human) | `lead-consent required` + `checkValidity()`; `/privacy/` доступна |

**Все 11 требований этапа отражены в коде.**

---

## Антипаттерны

| Файл | Строка | Паттерн | Серьёзность | Влияние |
|------|--------|---------|-------------|---------|
| `send-lead.php:31` | 31 | `FROM_EMAIL = 'noreply@example-domain'` (плейсхолдер) | Предупреждение (WR-04) | Отложено владельцу — подставить рабочий домен при заливке; задокументировано в TODO и MANUAL-CHECKLIST |
| `privacy/index.html` | 222-224, 396-398 | Плейсхолдеры `{{ИНН}}` и др. | Предупреждение (WR-05) | Отложено владельцу — заполнить из учредительных документов; by-design для данного этапа |
| `calculator-ui.js:194-196` | 194 | Нулевые строки в «шапке» (transport=0, komandirovki=0, nds=0) | Информация (IN-01) | Принято как косметика по решению ревьюера — оговорки в `ogovorki` объясняют нули |

**Задолженность TBD/FIXME/XXX:** поиск в модифицированных файлах не выявил неотслеживаемых маркеров. Имеющиеся `TODO` в `send-lead.php:30` ссылаются на конкретный шаг заливки (WR-04), задокументированный в чек-листе.

---

## Ручная проверка требуется

### 1. Браузерное поведение окна (UI-01, UI-06)

**Тест:** Открыть `landing.html` → нажать «Получить расчёт» → проверить открытие окна, закрытие крестиком / кликом по фону / Esc; в DevTools device mode проверить прокрутку окна без дёргания фона.
**Ожидается:** Окно открывается/закрывается, на телефоне прокручивается плавно, фон заблокирован.
**Почему human:** Браузерное поведение focus-trap, overscroll, safe-area — не тестируется Node.

### 2. Рендер результата в браузере (UI-03, UI-04)

**Тест:** Открыть калькулятор → ввести S=100, T=5, класс 1 → «Рассчитать стоимость».
**Ожидается:** «Шапка» с трудозатратами/материалами/ИТОГО/₽/м², оговорки и расшифровка классов 1/2/3 видны одновременно с результатом, без ввода контактов.
**Почему human:** DOM-рендер.

### 3. Живая доставка письма (LEAD-02, D-02)

**Тест:** На хостинге Reg.ru — подставить `FROM_EMAIL`, создать ящик, отправить реальную заявку через форму.
**Ожидается:** Письмо приходит на `MultiCrete@yandex.ru` (включая папку «Спам»). Подробная процедура и эскалация — в `calculator/MANUAL-CHECKLIST.md` раздел 4.
**Почему human:** Требует доступов Reg.ru и живого SMTP.

### 4. Блокировка формы без согласия (LEAD-03)

**Тест:** Заполнить имя и контакт, не отмечать согласие → «Отправить заявку».
**Ожидается:** Браузер блокирует отправку и подсвечивает чекбокс.
**Почему human:** `reportValidity()` — браузерный UX.

### 5. Реквизиты политики 152-ФЗ (WR-05 — владелец)

**Тест:** Получить у владельца ИНН/ОГРН/юр.адрес ООО «МультиКрит» → заменить плейсхолдеры в `privacy/index.html`.
**Ожидается:** Страница политики содержит реальные реквизиты оператора до публикации сайта.
**Почему human:** Требует данных от владельца.

---

## Итог

Реализация этапа полная и качественная. Все 11 проверяемых истин (UI-01..UI-06, INT-01/02, LEAD-01..LEAD-03) подтверждены кодом. Критический блокер безопасности (CR-01: CRLF-инъекция в Subject) и дефекты качества (WR-01: недостающие CSS-классы; WR-02: залипшая кнопка; WR-03: заявка без контакта) исправлены до верификации. Отложенные пункты (WR-04, WR-05) — намеренно переданы владельцу и не являются пробелами реализации.

Для закрытия этапа требуются:
- Ручная приёмка интерфейса в браузере (по `calculator/MANUAL-CHECKLIST.md` разделы 1-3).
- Живая проверка доставки письма на хостинге Reg.ru (раздел 4 чек-листа, приёмочный гейт).
- Подстановка реальных реквизитов оператора в `privacy/index.html` от владельца.

---

_Проверено: 2026-06-30_
_Верификатор: Claude (gsd-verifier)_
