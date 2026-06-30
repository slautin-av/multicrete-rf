// calculator-ui.test.js — тесты чистой логики окна калькулятора.
//
// Запуск: node --test calculator/calculator-ui.test.js
// Тестируем ТОЛЬКО validateInputs (чистая функция без DOM). Механика окна и
// рендер «шапки» проверяются ручным smoke-тестом (см. план <verification>),
// т.к. требуют браузерного DOM, которого нет в Node.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateInputs } from './calculator-ui.js';

test('S<=0 ловится с точным текстом UI-SPEC', () => {
  const errors = validateInputs(0, 5, 2);
  assert.deepEqual(errors, { S: 'Укажите площадь больше нуля, м²' });
});

test('T<=0 ловится с точным текстом UI-SPEC', () => {
  const errors = validateInputs(100, 0, 1);
  assert.deepEqual(errors, { T: 'Укажите толщину больше нуля, мм' });
});

test('класс не выбран ловится с точным текстом UI-SPEC', () => {
  const errors = validateInputs(100, 5, 0);
  assert.deepEqual(errors, { klass: 'Выберите класс сложности' });
});

test('валидный ввод даёт пустой объект ошибок', () => {
  const errors = validateInputs(100, 5, 1);
  assert.deepEqual(errors, {});
});

test('NaN-площадь (пустое поле) ловится как ошибка площади', () => {
  const errors = validateInputs(NaN, 5, 1);
  assert.equal(errors.S, 'Укажите площадь больше нуля, м²');
});
