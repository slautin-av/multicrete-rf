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

// Дальше — только браузерный код. В Node (тест) document отсутствует, поэтому
// весь DOM-блок защищён проверкой и не мешает импорту validateInputs.
if (typeof document !== 'undefined') {
  initCalculatorUI();
}

function initCalculatorUI() {
  const overlay = document.getElementById('calc-modal-overlay');
  const openBtn = document.getElementById('calc-open');
  const runBtn = document.getElementById('calc-run');
  const heavyBox = document.getElementById('calc-heavy');

  // Элемент, на который вернуть фокус при закрытии окна.
  let lastTrigger = null;
  // Последний рассчитанный breakdown — чтобы чекбокс «>80 кг» мог перерисовать
  // только текст оговорки, не пересчитывая число (CALC-07).
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

  // Чекбокс «>80 кг»: меняет ТОЛЬКО текст оговорки, число не трогает (CALC-07).
  if (heavyBox) heavyBox.addEventListener('change', () => {
    if (lastBreakdown) renderOgovorki(lastBreakdown, heavyBox.checked);
  });

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
    renderOgovorki(b, heavyBox && heavyBox.checked);
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

  // Оговорки (D-11): берём breakdown.ogovorki как есть. Чекбокс «>80 кг» меняет
  // только показываемый текст первой оговорки (про массу), число не трогает.
  function renderOgovorki(b, heavy) {
    const list = document.getElementById('calc-ogovorki-list');
    list.innerHTML = '';
    const items = b.ogovorki.slice();
    if (heavy) {
      items[0] = 'Деталь тяжелее 80 кг: к расчёту добавится грузоподъёмное ' +
        'оборудование, итоговая стоимость вырастет.';
    }
    for (const text of items) {
      const li = document.createElement('li');
      li.textContent = text;
      list.appendChild(li);
    }
    document.getElementById('calc-ogovorki').hidden = false;
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
