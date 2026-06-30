---
phase: 1
slug: calc-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-29
---

# Phase 1 — Validation Strategy

> Контракт проверок этапа «Движок расчёта». Движок — чистый JS без сборщика; «тесты» — это
> самопроверка на контрольных примерах из эталона, прогоняемая на Node (и пригодная для браузера).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | без фреймворка — самописный прогон на `node` (assert через сравнение с округлением) |
| **Config file** | none — отдельный файл-прогон в модуле `calculator/` |
| **Quick run command** | `node calculator/engine.selftest.js` |
| **Full suite command** | `node calculator/engine.selftest.js` |
| **Estimated runtime** | ~1 секунда |

---

## Sampling Rate

- **After every task commit:** `node calculator/engine.selftest.js`
- **After every plan wave:** тот же прогон (все контрольные примеры зелёные)
- **Before `/gsd-verify-work`:** все контрольные примеры совпадают с эталоном в пределах округления
- **Max feedback latency:** ~2 секунды

---

## Per-Task Verification Map

| Требование | Что проверяем | Test Type | Automated Command | Status |
|------------|---------------|-----------|-------------------|--------|
| CALC-01 | `calc(S=1.6,T=5,класс=1)` → ИТОГО 137 600,16 и ₽/м² 86 000,10 (± округление) | self-test | `node calculator/engine.selftest.js` | ⬜ pending |
| CALC-02 | класс 1→2→3 множит работы на ×1.0/×1.2/×1.4; ИТОГО 137 600,16 / 143 931,08 / 150 262,00 | self-test | `node calculator/engine.selftest.js` | ⬜ pending |
| CALC-03 | расценка нанесения нелинейна по T: T=2→1800, T=5→3700 (излом на 3 мм) | self-test | `node calculator/engine.selftest.js` | ⬜ pending |
| CALC-04 | масса и стоимость материала по площади/толщине; ценовые пороги 6800/6650/6400 | self-test | `node calculator/engine.selftest.js` | ⬜ pending |
| CALC-05 | вспомогательные материалы воспроизводят итог эталона | self-test | `node calculator/engine.selftest.js` | ⬜ pending |
| CALC-06 | порядок накруток (ЕСН→накладные→склад→гарантия 5%→прибыль), НДС=0 | self-test | `node calculator/engine.selftest.js` | ⬜ pending |
| CALC-07 | результат содержит текстовую оговорку «деталь до 80 кг» | self-test | `node calculator/engine.selftest.js` | ⬜ pending |
| CALC-08 | фикс. допущения зашиты по умолчанию (1 день, 1 спец., без транспорта/командировок/оснастки) | source-assert | проверка блока PARAMS | ⬜ pending |
| CALC-09 | все коэффициенты/ставки/цены — в едином блоке `PARAMS`, не в формулах | source-assert | проверка структуры кода | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red*

---

## Wave 0 Requirements

- [ ] `calculator/engine.selftest.js` — прогон контрольных примеров (создаётся вместе с движком)

*Фреймворк не требуется — Node присутствует в окружении, прогон самописный.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Текст оговорки читается корректно | CALC-07 | формулировка для заказчика | глазами прочитать вывод оговорки |

---

## Validation Sign-Off

- [ ] У каждого требования CALC-01..09 есть проверка (self-test или source-assert)
- [ ] Контрольные примеры совпадают с эталоном в пределах округления
- [ ] Блок `PARAMS` — единственный источник чисел (CALC-09)
- [ ] `nyquist_compliant: true` проставлен после прохождения

**Approval:** pending
