// engine.selftest.js — самопроверка движка на контрольных примерах эталона.
//
// Без тест-фреймворка: голый JS + console. Запуск в терминале:
//   node calculator/engine.selftest.js
// Тот же файл работает и в браузере (ES-модуль; вместо process.exitCode —
// просто красный лог при FAIL).
//
// Контрольные примеры — из «Калькуляция МультиКрит 700.xlsx» (гарантия 5%).
// Движок обязан совпасть с ИТОГО и ₽/м² в пределах округления (CALC-01).

import { calc } from './engine.js';
import { PARAMS } from './params.js';

const EPS = 0.05; // допуск на округление
const near = (a, b, eps = EPS) => Math.abs(a - b) <= eps;

// ── Контрольные примеры (S=1.6 м², T=5 мм; класс 1/2/3) ───────────────────
const cases = [
  { name: 'эталон S=1.6 T=5 класс 1', in: { S: 1.6, T: 5, klass: 1 }, exp: { itogo: 137600.16, perM2: 86000.10 } },
  { name: 'эталон S=1.6 T=5 класс 2', in: { S: 1.6, T: 5, klass: 2 }, exp: { itogo: 143931.08, perM2: 89956.92 } },
  { name: 'эталон S=1.6 T=5 класс 3', in: { S: 1.6, T: 5, klass: 3 }, exp: { itogo: 150262.00, perM2: 93913.75 } },
];

let ok = true;

console.log('=== Контрольные примеры (ИТОГО / ₽/м²) ===');
for (const c of cases) {
  const r = calc(c.in, PARAMS);
  const pass = near(r.itogo, c.exp.itogo) && near(r.perM2, c.exp.perM2);
  ok = ok && pass;
  console.log(
    `${pass ? 'PASS' : 'FAIL'} — ${c.name}: ` +
    `ИТОГО ${r.itogo.toFixed(2)} (ожид. ${c.exp.itogo.toFixed(2)}), ` +
    `₽/м² ${r.perM2.toFixed(2)} (ожид. ${c.exp.perM2.toFixed(2)})`
  );
}

// ── Доп. проверка 1: нелинейность нанесения по толщине (CALC-03) ──────────
console.log('\n=== Нелинейность нанесения (внутренняя расценка F52) ===');
const nanesCases = [
  { T: 2, exp: 1800 }, // 2*900
  { T: 3, exp: 2700 }, // 3*900 (граница излома)
  { T: 5, exp: 3700 }, // (5-3)*500 + 3*900
];
for (const nc of nanesCases) {
  // rascNanesenie не зависит от S/klass — берём через любой вызов calc
  const r = calc({ S: 1.6, T: nc.T, klass: 1 }, PARAMS);
  const pass = near(r.rascNanesenie, nc.exp);
  ok = ok && pass;
  console.log(`${pass ? 'PASS' : 'FAIL'} — T=${nc.T}: расценка ${r.rascNanesenie} (ожид. ${nc.exp})`);
}

// ── Доп. проверка 2: коэффициент класса множит только труд (CALC-02) ──────
console.log('\n=== Кратность класса (только sumWorks, не материалы) ===');
const r1 = calc({ S: 1.6, T: 5, klass: 1 }, PARAMS);
const r2 = calc({ S: 1.6, T: 5, klass: 2 }, PARAMS);
const r3 = calc({ S: 1.6, T: 5, klass: 3 }, PARAMS);
// Чистая проверка кратности — на sumWorks*coef (sumWorks одинаков для всех классов).
const baseWorks = r1.sumWorks; // coef=1.0
const checkCoef = [
  { lbl: 'класс 2 ×1.2', got: r2.sumWorks * r2.coef, exp: baseWorks * 1.2 },
  { lbl: 'класс 3 ×1.4', got: r3.sumWorks * r3.coef, exp: baseWorks * 1.4 },
];
for (const cc of checkCoef) {
  const pass = near(cc.got, cc.exp);
  ok = ok && pass;
  console.log(`${pass ? 'PASS' : 'FAIL'} — ${cc.lbl}: работы×коэф ${cc.got.toFixed(2)} (ожид. ${cc.exp.toFixed(2)})`);
}
// Материалы НЕ должны меняться от класса.
const matSame = near(r1.materialy, r2.materialy) && near(r1.materialy, r3.materialy);
ok = ok && matSame;
console.log(`${matSame ? 'PASS' : 'FAIL'} — материалы не зависят от класса: ${r1.materialy} / ${r2.materialy} / ${r3.materialy}`);

// ── Итог ──────────────────────────────────────────────────────────────────
console.log('\n=== ИТОГ САМОПРОВЕРКИ ===');
if (ok) {
  console.log('PASS — все проверки зелёные, движок сверен с эталоном «700» (CALC-01).');
} else {
  console.log('FAIL — есть расхождения с эталоном. См. вывод выше.');
  if (typeof process !== 'undefined') process.exitCode = 1;
}
