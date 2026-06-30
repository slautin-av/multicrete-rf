// calculator-ui.js — клиентская логика окна калькулятора покрытий «МультиКрит».
//
// Роль: контроллер интерфейса. UI ТОЛЬКО вызывает готовый движок calc() и
// форматирует breakdown — формулы и коэффициенты НЕ дублируются (anti-pattern
// RESEARCH 219-220). engine.js/params.js не меняются (иначе сломается
// engine.selftest.js).
//
// Состав:
//   1. validateInputs — чистая функция (экспортируется, тестируется в Node без DOM).
//   2. Механика окна openCalcModal/closeCalcModal/handleCalcOverlay + Esc + фокус-трап.
//   3. Рендер «шапки» сметы, оговорок и расшифровки классов из breakdown/PARAMS.

import { calc } from './engine.js';
import { PARAMS } from './params.js';

// ── 1. Валидация ввода (чистая, без DOM) ───────────────────────────────────
// Тексты ДОСЛОВНО из UI-SPEC Copywriting. Пустой объект = валидно.
// Экспортируется отдельно, чтобы прогонять в node --test без браузера.
export function validateInputs(S, T, klass) {
  const errors = {};
  if (!(S > 0)) errors.S = 'Укажите площадь больше нуля, м²';
  if (!(T > 0)) errors.T = 'Укажите толщину больше нуля, мм';
  if (![1, 2, 3].includes(klass)) errors.klass = 'Выберите класс сложности';
  return errors;
}

// ── 2. Форматирование чисел (рубли, разряды, без копеек) ───────────────────
const rub = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});
function formatRub(n) {
  return rub.format(Math.round(n));
}

// ── 3. Тексты расшифровки классов (из UI-SPEC; коэффициенты — из PARAMS) ───
// Коэффициенты НЕ хардкодим: читаем PARAMS.koefKlass (один источник чисел).
const KLASS_TEXTS = {
  1: 'простое тело вращения',
  2: 'сложное тело вращения (импеллер/винт)',
  3: 'деталь с закрываемыми зонами (обклейка/маскировка)',
};

// ── 4. Эндпоинт отправки заявки (D-02) ─────────────────────────────────────
// Одна легко переключаемая константа. Серверный приёмник — план 02 (/send-lead.php).
// Fallback Web3Forms (если PHP-почта на хостинге не заработает): заменить строку на
// 'https://api.web3forms.com/submit' и добавить access_key в data (per RESEARCH/D-02).
const LEAD_ENDPOINT = '/send-lead.php';

// Тексты успеха/ошибки — ДОСЛОВНО из UI-SPEC Copywriting.
const LEAD_SUCCESS_TEXT = 'Спасибо, заявка отправлена. Мы свяжемся с вами в течение часа.';
const LEAD_ERROR_TEXT = 'Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.';

// Подписи строк построчной детализации (D-10). Порядок — как в breakdown/эталоне.
// Ключи берутся из breakdown движка; формулы НЕ дублируются — только читаем поля.
const DETAILS_ROWS = [
  ['Дробеструйная обработка', 'stDrobestruika'],
  ['Обеспыливание', 'stObespylivanie'],
  ['Подготовка поверхности (до)', 'stPodgotovkaDo'],
  ['Обезжиривание', 'stObezzhirivanie'],
  ['Предварительное грунтование (работа)', 'stGruntPredvWork'],
  ['Основное грунтование (работа)', 'stGruntOsnWork'],
  ['Нанесение покрытия', 'stNanesenie'],
  ['Подготовка поверхности (после)', 'stPodgotovkaPosle'],
  ['— Сумма работ', 'sumWorks'],
  ['ИТР', 'stITR'],
  ['Страховые взносы (ЕСН)', 'esn'],
  ['Складские расходы', 'sklad'],
  ['Гарантийный резерв', 'garantiya'],
  ['— Работы итого', 'rabotyItogo'],
  ['Грунт предварительный (материал)', 'stGruntPredv'],
  ['Грунт основной (материал)', 'stGruntOsn'],
  ['Очиститель', 'stOchistitel'],
];

// async sendLead — реальная отправка на бэкенд (план 02). Контракт ответа: {success, error?}.
async function sendLead(data) {
  const res = await fetch(LEAD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, source: 'calculator' }),
  });
  let json = {};
  try { json = await res.json(); } catch { json = {}; }
  if (!json.success) throw new Error(json.error || 'send failed');
  return json;
}

// Дальше — только браузерный код. В Node (тест) document отсутствует, поэтому
// весь DOM-блок защищён проверкой и не мешает импорту validateInputs.
if (typeof document !== 'undefined') {
  initCalculatorUI();
}

function initCalculatorUI() {
  const overlay = document.getElementById('calc-modal-overlay');
  const openBtn = document.getElementById('calc-open');
  const runBtn = document.getElementById('calc-run');

  // Элемент, на который вернуть фокус при закрытии окна.
  let lastTrigger = null;
  // Последний рассчитанный breakdown (для воронки детализации).
  let lastBreakdown = null;

  // ── Механика окна (паттерн landing.html 932-934/951, переименован) ───────
  window.openCalcModal = function openCalcModal(trigger) {
    lastTrigger = trigger || document.activeElement;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    const first = document.getElementById('calc-S');
    if (first) first.focus();
  };

  window.closeCalcModal = function closeCalcModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
  };

  window.handleCalcOverlay = function handleCalcOverlay(e) {
    if (e.target === overlay) window.closeCalcModal();
  };

  // Кнопка-вызов на странице-модуле.
  if (openBtn) openBtn.addEventListener('click', () => window.openCalcModal(openBtn));

  // Esc — закрыть; Tab — лёгкий фокус-трап в пределах окна.
  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'Escape') { window.closeCalcModal(); return; }
    if (e.key === 'Tab') trapFocus(e, overlay);
  });

  // ── Расчёт по кнопке «Рассчитать стоимость» ──────────────────────────────
  if (runBtn) runBtn.addEventListener('click', runCalculation);

  // ── Форма заявки + воронка детализации (LEAD-01/LEAD-03/D-10) ────────────
  const leadForm = document.getElementById('calc-lead-form');
  if (leadForm) leadForm.addEventListener('submit', handleLeadSubmit);

  // Расшифровка классов видна сразу (D-11/UI-04).
  renderKlassInfo();

  function runCalculation() {
    const S = parseFloat(document.getElementById('calc-S').value);
    const T = parseFloat(document.getElementById('calc-T').value);
    const checked = document.querySelector('input[name="calc-klass"]:checked');
    const klass = checked ? parseInt(checked.value, 10) : 0;

    const errors = validateInputs(S, T, klass);
    if (Object.keys(errors).length > 0) {
      renderErrors(errors);
      return; // calc() НЕ вызывается при невалидном вводе (UI-05)
    }
    renderErrors({});

    // UI только вызывает движок и рисует breakdown (один источник чисел).
    const b = calc({ S, T, klass }, PARAMS);
    lastBreakdown = b;
    renderResult(b);
    renderOgovorki(b);
  }

  // ── Рендеры ──────────────────────────────────────────────────────────────
  function renderErrors(errors) {
    const box = document.getElementById('calc-errors');
    box.innerHTML = '';
    for (const key of ['S', 'T', 'klass']) {
      if (errors[key]) {
        const p = document.createElement('p');
        p.className = 'calc-error';
        p.textContent = errors[key]; // текст, не HTML — без инъекций (T-02-01)
        box.appendChild(p);
      }
    }
  }

  // «Шапка» сметы (D-09): рендерим СРАЗУ, без контактов.
  function renderResult(b) {
    const rows = [
      ['Трудозатраты', b.trudozatraty],
      ['Вспомогательные материалы', b.vspomMaterialy],
      ['Накладные расходы', b.nakladnye],
      ['Плановые накопления', b.pribyl],
      ['Материалы', b.materialy],
      ['Транспорт', b.transport],
      ['Командировки', b.komandirovki],
      ['НДС', b.nds],
    ];
    const rowsBox = document.getElementById('calc-rows');
    rowsBox.innerHTML = '';
    for (const [label, value] of rows) {
      const row = document.createElement('div');
      row.className = 'calc-row';
      const l = document.createElement('span');
      l.className = 'calc-row-label';
      l.textContent = label;
      const v = document.createElement('span');
      v.className = 'calc-row-value';
      v.textContent = formatRub(value);
      row.append(l, v);
      rowsBox.appendChild(row);
    }
    document.getElementById('calc-total').textContent = formatRub(b.itogo);
    document.getElementById('calc-perm2').textContent = formatRub(b.perM2) + '/м²';

    document.getElementById('calc-empty').hidden = true;
    document.getElementById('calc-result').hidden = false;
  }

  // Оговорки (D-11): берём breakdown.ogovorki как есть (текст про массу — из движка).
  function renderOgovorki(b) {
    const list = document.getElementById('calc-ogovorki-list');
    list.innerHTML = '';
    const items = b.ogovorki.slice();
    for (const text of items) {
      const li = document.createElement('li');
      li.textContent = text;
      list.appendChild(li);
    }
    document.getElementById('calc-ogovorki').hidden = false;
  }

  // ── Отправка заявки (LEAD-02 фронт) + воронка детализации (D-10) ──────────
  async function handleLeadSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;

    // Без отмеченного согласия (required) браузер сам блокирует и подсветит поля.
    // checkValidity покрывает required-имя и required-согласие 152-ФЗ (LEAD-03).
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = {
      name: document.getElementById('lead-name').value.trim(),
      organization: document.getElementById('lead-org').value.trim(),
      phone: document.getElementById('lead-phone').value.trim(),
      email: document.getElementById('lead-email').value.trim(),
      website: document.getElementById('lead-website').value, // honeypot
    };

    // Все поля обязательны (имя, организация, телефон, e-mail) — это ловит
    // form.checkValidity() выше через required-атрибуты, отдельной проверки не нужно.
    const submitBtn = document.getElementById('lead-submit');
    if (submitBtn) submitBtn.disabled = true;
    try {
      await sendLead(data);
      renderLeadMessage(LEAD_SUCCESS_TEXT, false);
      // Кнопка остаётся disabled (повторная отправка не нужна) — поясняем это
      // пользователю сменой подписи, иначе серая кнопка выглядит как баг (WR-02).
      if (submitBtn) submitBtn.textContent = 'Заявка отправлена';
      // Воронка D-10: раскрываем построчную детализацию из последнего расчёта.
      renderDetails(lastBreakdown);
      document.getElementById('calc-details').hidden = false;
    } catch {
      // Ошибка — сообщение красным, детализацию НЕ раскрываем.
      renderLeadMessage(LEAD_ERROR_TEXT, true);
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  // Сообщение успеха/ошибки под формой. Текст, не HTML — без инъекций.
  function renderLeadMessage(text, isError) {
    const box = document.getElementById('lead-message');
    if (!box) return;
    box.innerHTML = '';
    const p = document.createElement('p');
    p.className = isError ? 'calc-error' : 'calc-lead-success';
    p.textContent = text;
    box.appendChild(p);
  }

  // Построчная детализация (D-10): рендерим из breakdown. Формулы НЕ дублируем —
  // только читаем готовые поля. Если расчёта ещё не было — детализации нет.
  function renderDetails(b) {
    const body = document.getElementById('calc-details-body');
    if (!body) return;
    body.innerHTML = '';
    if (!b) return; // lastBreakdown пуст (форма отправлена без расчёта) — нечего рисовать

    const rows = DETAILS_ROWS.slice();
    // Эластомер показываем строкой «масса × цена = стоимость» (наглядно для инженера).
    rows.push([
      `Эластомер (${b.massElastomer} кг × ${formatRub(b.cenaElastomer)})`,
      'stElastomer',
    ]);

    for (const [label, key] of rows) {
      const value = b[key];
      if (value === undefined) continue;
      const row = document.createElement('div');
      row.className = 'calc-row';
      const l = document.createElement('span');
      l.className = 'calc-row-label';
      l.textContent = label;
      const v = document.createElement('span');
      v.className = 'calc-row-value';
      v.textContent = formatRub(value);
      row.append(l, v);
      body.appendChild(row);
    }

    // Удельная стоимость за м²·мм — полезный инженерный показатель раскладки.
    if (b.perM2mm !== undefined) {
      const row = document.createElement('div');
      row.className = 'calc-row';
      const l = document.createElement('span');
      l.className = 'calc-row-label';
      l.textContent = 'Стоимость за м²·мм';
      const v = document.createElement('span');
      v.className = 'calc-row-value';
      v.textContent = formatRub(b.perM2mm) + '/м²·мм';
      row.append(l, v);
      body.appendChild(row);
    }
  }

  // Расшифровка классов (UI-04): коэффициенты из PARAMS.koefKlass.
  function renderKlassInfo() {
    const list = document.getElementById('calc-klass-info-list');
    if (!list) return;
    list.innerHTML = '';
    for (const k of [1, 2, 3]) {
      const koef = PARAMS.koefKlass[k];
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = `Класс ${k} — ${KLASS_TEXTS[k]}`;
      const c = document.createElement('span');
      c.className = 'calc-koef';
      c.textContent = `×${koef.toFixed(1)}`;
      li.append(name, c);
      list.appendChild(li);
    }
  }
}

// Лёгкий фокус-трап: держим Tab/Shift+Tab в пределах окна (~10 строк vanilla).
function trapFocus(e, container) {
  const focusable = container.querySelectorAll(
    'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const visible = Array.from(focusable).filter((el) => !el.disabled && el.offsetParent !== null);
  if (visible.length === 0) return;
  const first = visible[0];
  const last = visible[visible.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
