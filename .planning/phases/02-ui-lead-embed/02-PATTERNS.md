# Phase 2: Интерфейс, заявка и встраивание — Карта паттернов

**Mapped:** 2026-06-30
**Файлов проанализировано:** 6 (5 новых + 1 правка)
**Аналогов найдено:** 4 / 6 (для 2 файлов прямого аналога в проекте нет — см. «Без аналога»)

> Что это значит: для большинства новых файлов в кодовой базе уже есть готовый рабочий образец,
> с которого исполнитель копирует паттерн дословно (стиль, механику окна, контракт движка).
> Для PHP-обработчика и страницы политики аналога в проекте нет — там опираемся на образцы
> из RESEARCH.md (заголовки письма, защита от инъекций, разделы 152-ФЗ).

---

## File Classification

| Новый/Изменяемый файл | Роль | Поток данных | Ближайший аналог | Качество совпадения |
|-----------------------|------|--------------|------------------|---------------------|
| `calculator/index.html` (НОВЫЙ) | view / page-module | request-response (рендер UI) | `materials/index.html` (структура) + `landing.html` (стиль/модалка) | role-match (структура) + exact (стиль) |
| `calculator/calculator.css` (НОВЫЙ) | config / стили | — | `landing.html` `:root` + `.modal`/`.pf-*`/`.btn` (строки 15-39, 104-124, 326-363) | exact (тёмная тема) |
| `calculator/calculator-ui.js` (НОВЫЙ) | controller (клиентский) | event-driven + transform | `landing.html` `<script>` (932-951) + контракт `calc()` из `engine.js` | role-match |
| `landing.html` (ПРАВКА) | view / точка интеграции | event-driven | сам себя — `openModal`/`goTo` (932-935), кнопка «Получить расчёт» | exact (in-place) |
| `send-lead.php` (НОВЫЙ) | controller / API endpoint | request-response (POST → mail) | **нет в проекте** → образец из RESEARCH «Скользкий участок 1» | no-analog |
| `privacy/index.html` (НОВЫЙ) | view / static page | — (статика) | `materials/index.html` (структура страницы) + тёмная тема `landing.html` | partial (только каркас) |

**Откуда список файлов:** RESEARCH «Recommended Project Structure» (строки 159-176) + CONTEXT D-04/D-07/D-08 + UI-SPEC «Interaction Contract».

---

## Pattern Assignments

### `calculator/index.html` (view / page-module, request-response)

**Аналог структуры:** `materials/index.html` — рабочий образец статического HTML-модуля проекта
(отдельная папка, свой `index.html`, без сборщика). **Аналог стиля и модалки:** `landing.html`.

**Каркас страницы-модуля** (`materials/index.html` строки 1-11, 53):
```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Калькулятор стоимости покрытия — МультиКрит</title>
  <meta name="description" content="...">
  <!-- стиль: НЕ base.css (светлая), а собственный calculator.css в тёмной теме -->
  <link rel="stylesheet" href="./calculator.css">
</head>
<body>
  <main> ... </main>
</body>
```
> ВНИМАНИЕ (тех. долг проекта): `materials/index.html` подключает `base.css`/`catalog.css` — это
> СВЕТЛАЯ палитра (`--color-*`). Для калькулятора так делать НЕЛЬЗЯ (D-08, UI-SPEC «Источник истины
> токенов»). Берём только структурный каркас, а цвета/шрифты — из `landing.html`.

**Подключение шрифтов бренда** (копировать из `landing.html` строки 9-12):
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Manrope:wght@400;500;600;700&family=Tektur:wght@500;600&display=swap" rel="stylesheet">
```

**Подключение движка как ES-модуля** (контракт из RESEARCH «Pattern 1», engine.js строка 35):
```html
<!-- engine.js/params.js — ES-модули этапа 1, НЕ менять -->
<script type="module" src="./calculator-ui.js"></script>
```
Внутри `calculator-ui.js`: `import { calc } from './engine.js'; import { PARAMS } from './params.js';`

**Иконки** (как в `landing.html` строки 928-930):
```html
<script src="https://unpkg.com/lucide@latest"></script>
<script>lucide.createIcons();</script>
```

**Разметка окна-оверлея** (по образцу `landing.html` строки 913-926, но ОТДЕЛЬНЫЙ id):
```html
<!-- свой оверлей #calc-modal-overlay (не пересекается с #modal-overlay лендинга) -->
<div class="modal-overlay" id="calc-modal-overlay" onclick="handleCalcOverlay(event)"
     role="dialog" aria-modal="true" aria-labelledby="calc-title">
  <div class="modal calc-modal">
    <button class="modal-close" onclick="closeCalcModal()" aria-label="Закрыть">×</button>
    <h2 id="calc-title">Калькулятор стоимости покрытия</h2>
    <!-- поля → результат «шапка» → оговорки/классы → форма → детализация(hidden) -->
  </div>
</div>
```

---

### `calculator/calculator.css` (config / стили, тёмная тема)

**Аналог:** `landing.html` инлайн-`<style>` — единственный источник истины тёмной темы «Стальной Vega».

**CSS-переменные бренда — КОПИРОВАТЬ дословно** (`landing.html` строки 15-39):
```css
:root {
  --blue:  #2F66A5;   /* синий — ИНФОРМАЦИЯ (ИТОГО, focus, числа «шапки») */
  --blue-d:#244F80;
  --pink:  #EB4D8C;   /* розовый — ДЕЙСТВИЕ (только CTA-кнопки) */
  --pink-d:#A52350;
  --ink:   #EAF0F7;   /* светлый текст */
  --steel: #212C3D;   /* фон окна .modal */
  --scale: #19222F;   /* фон полей .pf-input, утопленные шкалы */
  --line:  #34435A;   --muted: #93A1B5;   --bg: #1A2332;
  --red:   #D64550;   /* ТОЛЬКО ошибки валидации/отправки */
  --f-head:'Oswald', sans-serif; --f-body:'Manrope', sans-serif; --f-tech:'Tektur', sans-serif;
}
```

**Готовые классы для переиспользования** (`landing.html`):
- Кнопки — `.btn` / `.btn-primary` / `.btn-secondary` (строки 104-124). 700 вес кнопок — унаследован, не трогать (UI-SPEC).
- Поля формы — `.pf-row` / `.pf-label` / `.pf-input` / `.pf-input:focus` (строки 328-333):
```css
.pf-input { width:100%; font-family:var(--f-body); font-size:.95rem; padding:.7rem .85rem;
  border:none; border-radius:8px; background:var(--scale); color:var(--ink);
  box-shadow: inset 0 2px 4px rgba(26,35,50,.08); }
.pf-input:focus { outline: 2px solid var(--blue); }   /* синий focus — информация */
```
- Согласие/сабмит — `.pf-consent` / `.pf-submit` (строки 335-336):
```css
.pf-consent { display:flex; gap:.5rem; align-items:flex-start; margin:1rem 0; font-size:.78rem; color:var(--muted); }
.pf-submit { width:100%; margin-top:.5rem; justify-content:center; }
```
- Базовая модалка — `.modal-overlay` / `.modal` / `.modal-close` (строки 355-363) + тёмное переопределение `.modal { background:#212C3D }` (строка 410).

**Новый код CSS (нет в лендинге, писать с нуля по RESEARCH «Скользкий участок 3»):**
адаптив большого окна — `.calc-modal { max-height:90dvh; overflow-y:auto; overscroll-behavior:contain }`
и `@media(max-width:560px){ .calc-modal{height:100dvh; border-radius:0; padding-bottom:env(safe-area-inset-bottom)} }`.
`.pf-row` уже схлопывается в 1 столбец на `≤768px` (`landing.html` строка 378) — переиспользовать.
`tabular-nums` для чисел «шапки» — как `.spec-num` (строка 101).

---

### `calculator/calculator-ui.js` (controller-клиент, event-driven + transform)

**Аналог механики окна:** `landing.html` `<script>` (строки 932-951). **Аналог контракта данных:** `engine.js`.

**Механика открытия/закрытия — КОПИРОВАТЬ паттерн** (`landing.html` строки 932-934, 951),
переименовав под свой оверлей, чтобы не конфликтовать с окном «Заказать звонок»:
```js
function openCalcModal()  { document.getElementById('calc-modal-overlay').classList.add('open'); document.body.style.overflow='hidden'; }
function closeCalcModal() { document.getElementById('calc-modal-overlay').classList.remove('open'); document.body.style.overflow=''; }
function handleCalcOverlay(e){ if (e.target === document.getElementById('calc-modal-overlay')) closeCalcModal(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCalcModal(); });
```
> Источник: `landing.html` 932-934 (VERIFIED). Esc-обработчик — строка 951. Доп.: при открытии
> фокус на первое поле, при закрытии — возврат на кнопку-вызов (UI-SPEC «Фокус»).

**Контракт движка — UI ТОЛЬКО вызывает и рисует** (`engine.js` строки 35-36, 143-167):
```js
import { calc } from './engine.js';
import { PARAMS } from './params.js';
const b = calc({ S, T, klass }, PARAMS);   // S — м², T — мм, klass — 1|2|3

// «ШАПКА» (рендерить СРАЗУ, без контактов — D-09):
//   b.trudozatraty, b.vspomMaterialy, b.nakladnye, b.pribyl, b.nds,
//   b.transport (=0), b.komandirovki (=0)*, b.materialy, b.itogo, b.perM2
// Оговорки (СРАЗУ — D-11): b.ogovorki  // массив из 3 строк, НЕ переписывать
// Детализация (за контактами — D-10): b.stDrobestruika, b.stObespylivanie,
//   b.stNanesenie, b.stElastomer, b.stGruntPredv, b.stGruntOsn, b.stOchistitel,
//   b.sumWorks, b.stITR, b.esn, b.sklad, b.garantiya, b.rabotyItogo,
//   b.massElastomer, b.cenaElastomer, b.perM2mm ...
```
> *Примечание: `komandirovki` есть в возврате `engine.js` (строка 157), но в `return`-объекте
> присутствует как `komandirovki` — проверено по строкам 117-118, 157. `transport` и `komandirovki`
> оба = 0 (CALC-08). UI показывает их как «0 ₽» в «шапке» (D-09).

**Чекбокс «>80 кг» НЕ передаётся в `calc()`** (RESEARCH «Контракт движка», engine.js строки 134-141):
движок всегда считает деталь до 80 кг (CALC-07); чекбокс лишь меняет показываемый текст
оговорки. Текст «до 80 кг» уже в `b.ogovorki[0]` = `PARAMS.tekstOgovorki80kg` (params.js 101-103).

**Расшифровка классов — из PARAMS, не хардкодить** (params.js строки 63-67):
```js
// koefKlass: {1:1.0, 2:1.2, 3:1.4}; тексты — из UI-SPEC Copywriting:
// Класс 1 — «простое тело вращения» (×1.0)
// Класс 2 — «сложное тело вращения (импеллер/винт)» (×1.2)
// Класс 3 — «деталь с закрываемыми зонами (обклейка/маскировка)» (×1.4)
```

**Валидация ввода** (RESEARCH «Code Examples» 478-487, UI-SPEC «Валидация» → ошибки красным `--red`):
```js
function validateInputs(S, T, klass) {
  const errors = {};
  if (!(S > 0)) errors.S = 'Укажите площадь больше нуля, м²';
  if (!(T > 0)) errors.T = 'Укажите толщину больше нуля, мм';
  if (![1,2,3].includes(klass)) errors.klass = 'Выберите класс сложности';
  return errors; // пусто = валидно; иначе показать подсказки, calc() НЕ вызывать
}
```

**Воронка «детализация за контакты»** (RESEARCH «Pattern 3» 210-221, D-10):
```js
detailsBlock.hidden = true;                 // по умолчанию скрыто
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.checkValidity()) return;        // имя/тел/e-mail + согласие required
  await sendLead(formData);                 // POST → send-lead.php
  detailsBlock.hidden = false;              // награда: полная построчная раскладка
});
```

**Отправка заявки — один легко переключаемый endpoint** (RESEARCH «Code Examples» 462-475):
```js
const LEAD_ENDPOINT = '/send-lead.php';     // fallback: 'https://api.web3forms.com/submit'
async function sendLead(data) {
  const res = await fetch(LEAD_ENDPOINT, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ ...data, source: 'calculator' }),  // source — D-03
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'send failed');
  return json;
}
```
> Сообщения успеха/ошибки — из UI-SPEC Copywriting: успех «Спасибо, заявка отправлена...»,
> ошибка «Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.»

> Anti-pattern (RESEARCH 223-229): НЕ дублировать формулы/коэффициенты в UI; НЕ менять
> `engine.js`/`params.js`; НЕ прятать ИТОГО/оговорки за форму.

---

### `landing.html` (ПРАВКА — точка интеграции INT-02)

**Что меняем:** перенацелить существующую кнопку «Получить расчёт» с `goTo('#price')` на открытие
окна калькулятора + подключить разметку/скрипт калькулятора.

**Существующий механизм скролла** (`landing.html` строка 935) — кандидат на замену для одной кнопки:
```js
function goTo(s) { const el = document.querySelector(s); if (el) el.scrollIntoView({ behavior:'smooth' }); }
```
**Найти кнопку «Получить расчёт»** (по тексту в разметке) и заменить её обработчик на
`openCalcModal()` (INT-02, D-08). Класс кнопки — `.btn-primary` (розовый CTA, UI-SPEC Color).

> ВАЖНО (граница этапа): существующие формы лендинга `submitForm`/`submitCall` (строки 942-943)
> и их разметку (867-882, 913-926) НЕ ТРОГАТЬ — это Deferred (CONTEXT строки 19-20, 154-156).
> Чекбокс согласия лендинга `checked` (строка 879) НЕ менять; у нашей формы — свой, без `checked`+required.

**Способ встраивания** (Open Question 2 / Discretion планировщика): инлайн-разметка калькулятора
в `landing.html` ЛИБО подгрузка `calculator/index.html` (fetch/iframe). RESEARCH рекомендует инлайн
(проще, общие стили/JS, без CORS), при этом `calculator/index.html` остаётся самостоятельной страницей.

---

### `send-lead.php` (НОВЫЙ — controller / API endpoint, POST → mail)

**Аналога в проекте НЕТ** (PHP-файлов нет — проверено). Образец целиком из RESEARCH «Скользкий участок 1»
(строки 245-310) — VERIFIED по Reg.ru help / sonarsource / thesitewizard.

**Заголовки письма** (RESEARCH 260-274) — `From` на СВОЁМ домене, Яндекс в `Reply-To`, тема в base64:
```php
$to      = 'MultiCrete@yandex.ru';                         // фиксированный получатель (не из ввода!)
$subject = '=?UTF-8?B?'.base64_encode('Заявка с калькулятора — МультиКрит').'?=';
$headers   = [];
$headers[] = 'From: МультиКрит сайт <noreply@мультикрит.рф>';  // СВОЙ домен (не @yandex.ru — иначе спам)
$headers[] = 'Reply-To: '.$cleanEmail;
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-Type: text/plain; charset=UTF-8';
$headers[] = 'Content-Transfer-Encoding: 8bit';
mail($to, $subject, $body, implode("\r\n", $headers));
```

**Защита от header-injection** (RESEARCH 281-296, ASVS V5) — обязательна для полей в заголовках:
```php
function rejectIfInjection($v) {
  if (preg_match('/[\r\n]/', $v)) { http_response_code(400); exit('bad input'); }
  return $v;
}
$email = rejectIfInjection(trim($_POST['email'] ?? ''));
$name  = rejectIfInjection(trim($_POST['name']  ?? ''));
```

**Honeypot + параметр source (D-03)** (RESEARCH 297-308):
```php
if (!empty($_POST['website'])) { http_response_code(200); exit('{"success":true}'); } // тихо отбросить бота
$source = preg_replace('/[^a-z0-9_-]/i', '', $_POST['source'] ?? 'unknown');           // белый список
```

**Контракт ответа для фронта** (RESEARCH 310): JSON `{"success":true}` / `{"success":false,"error":"..."}`
с `Content-Type: application/json`.

> Секреты: PHP-обработчик НЕ должен содержать ключей/паролей в коде (CLAUDE.md, RESEARCH 229).
> Доступы Reg.ru и реальный домен `From` — даёт владелец при заливке (A4). `From` — одна константа.
> Fallback Web3Forms (D-02): тот же набор полей, меняется только URL + `access_key` (RESEARCH 312-328).

---

### `privacy/index.html` (НОВЫЙ — view / static page 152-ФЗ)

**Аналог каркаса страницы:** `materials/index.html` (структура отдельной статической страницы-модуля
в папке). **Аналог стиля:** тёмная тема `landing.html`. **Содержание:** RESEARCH «Скользкий участок 2».

**8 обязательных разделов** (RESEARCH 334-344) — текст из проверенного конструктора
(privacy-generator.ru / Tilda / els24), реквизиты — плейсхолдерами под владельца (D-05):
```
{{НАИМЕНОВАНИЕ}} ООО «МультиКрит», {{ИНН}}, {{ОГРН}}, {{ЮР_АДРЕС}},
{{EMAIL_ОПЕРАТОРА}} (MultiCrete@yandex.ru), {{ТЕЛЕФОН}}, {{САЙТ}} (мультикрит.рф), {{ДАТА}}
```
> Перед созданием страницы прочитать бриф (правило CLAUDE.md для новых страниц):
> `D:\ARHI-AI\ai-architect-potok-1\кабинет\конспекты\multicrete-сайт-бриф.md`.

**Контакты оператора уже есть в `landing.html`** (строки 893-896) — взять для раздела «Контакты оператора»:
телефоны `+7 (3412) 32-41-51` / `+7 (965) 842-41-51`, e-mail `MultiCrete@yandex.ru`,
адрес «г. Ижевск, ул. 40 лет Победы, д. 92».

---

## Shared Patterns

### Тёмная тема «Стальной Vega» (CSS-переменные)
**Source:** `landing.html` строки 15-39 (`:root`).
**Apply to:** `calculator/calculator.css`, `calculator/index.html`, `privacy/index.html`.
**Правило разделения цветов (UI-SPEC):** `--blue` = информация (ИТОГО, focus, числа); `--pink` = действие
(только CTA-кнопки); `--red` = только ошибки. Калькулятор НЕ использует светлый `assets/styles/base.css`.

### Готовые UI-классы лендинга
**Source:** `landing.html` — `.btn`/`.btn-primary`/`.btn-secondary` (104-124), `.pf-input`/`.pf-label`/`.pf-row`/`.pf-consent`/`.pf-submit` (328-336), `.modal-overlay`/`.modal`/`.modal-close` (355-363, 410-411).
**Apply to:** окно и форма калькулятора. Не изобретать заново (D-08).

### Механика модального окна
**Source:** `landing.html` строки 932-934, 951 (`openModal`/`closeModal`/`handleOverlay` + Esc).
**Apply to:** `calculator-ui.js` (свой `#calc-modal-overlay`, переименованные функции) + правка `landing.html`.

### Контракт движка (один источник чисел)
**Source:** `calculator/engine.js` `calc()` (35-167), `calculator/params.js` `PARAMS` (13-104).
**Apply to:** весь рендер результата в `calculator-ui.js`. UI только форматирует `breakdown`; формулы и
коэффициенты не дублировать; `engine.js`/`params.js` не менять (иначе сломается `engine.selftest.js`).

### Защита ввода PHP (ASVS V5)
**Source:** RESEARCH «Скользкий участок 1» (281-308) — нет аналога в коде.
**Apply to:** `send-lead.php` — `preg_match('/[\r\n]/')` на полях-заголовках, honeypot, белый список `source`,
фиксированный `$to`, `Content-Type: text/plain`.

### Согласие 152-ФЗ
**Source:** RESEARCH 356-362 (образец), UI-SPEC Copywriting (текст), `landing.html` `.pf-consent` (стиль).
**Apply to:** форма калькулятора — чекбокс БЕЗ `checked`, `required`, ссылка на `privacy/` `target="_blank"`.
Существующий чекбокс лендинга (`checked`, строка 879) НЕ трогать.

---

## No Analog Found

Файлы без прямого аналога в кодовой базе — планировщик опирается на RESEARCH.md:

| Файл | Роль | Поток данных | Причина |
|------|------|--------------|---------|
| `send-lead.php` | controller / API | request-response | В проекте нет ни одного PHP-файла; образец и защита — из RESEARCH «Скользкий участок 1» |
| `privacy/index.html` | static page | — | Нет страницы политики; каркас берём у `materials/index.html`, текст — из конструктора 152-ФЗ (RESEARCH «Скользкий участок 2») |

> Для `privacy/index.html` каркас (HTML-структура отдельной страницы) — частичный аналог
> `materials/index.html`; уникален только юр-контент и тёмный стиль из `landing.html`.

---

## Metadata

**Область поиска аналогов:** корень проекта, `calculator/`, `materials/`, `assets/`, поиск `*.php` / `*privacy*` / `index.html`.
**Файлов просканировано:** `landing.html` (1004 стр., целевые диапазоны), `materials/index.html` (355), `calculator/engine.js` (168), `calculator/params.js` (104) — прочитаны; `*.php` и privacy — отсутствуют (подтверждено).
**Дата извлечения паттернов:** 2026-06-30
