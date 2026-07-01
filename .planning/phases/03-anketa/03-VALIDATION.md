---
phase: 03
slug: anketa
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-01
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Артефакт этапа — бинарный DOCX + правка landing.html. «Тесты» здесь =
> структурные проверки файла, а не unit-фреймворк.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Скрипты-проверки (PowerShell + Git Bash), не unit-фреймворк — артефакт бинарный |
| **Config file** | none — проверки в `verify-anketa.ps1`/`.sh` рядом со сборкой (создаются в Wave 0) |
| **Quick run command** | `unzip -t anketa/oprosnyj-list-multicrete.docx` |
| **Full suite command** | `verify-anketa` (целостность zip + well-formed XML + байтовое сравнение колонтитулов + Word open) |
| **Estimated runtime** | ~5–15 секунд (без Word-smoke); Word-smoke — вручную/COM |

---

## Sampling Rate

- **After every task commit:** `unzip -t *.docx` + well-formed document.xml
- **After every plan wave:** полный `verify-anketa` (все строки карты ниже)
- **Before `/gsd-verify-work`:** зелёный `verify-anketa` + ручная приёмка владельца в Word (D-07)
- **Max feedback latency:** ~15 секунд для автопроверок

---

## Per-Task Verification Map

| Req | Проверяемое поведение | Тип | Автокоманда | File Exists | Status |
|-----|----------------------|-----|-------------|-------------|--------|
| D-05 | Файл распаковывается, zip валиден | structural | `unzip -t *.docx` | ❌ W0 | ⬜ pending |
| D-05 | `word/document.xml` содержит тело опросника (заголовки блоков 0–6, таблицы, чекбоксы) | content | grep ключевых строк в извлечённом document.xml | ❌ W0 | ⬜ pending |
| D-05 | document.xml — well-formed XML (экранирование OK) | structural | XML-парс извлечённого document.xml | ❌ W0 | ⬜ pending |
| D-05 | header1.xml / footer1.xml / media/image1.jpg — байт-в-байт как в шаблоне | integrity | `cmp -s` каждой части против шаблона | ❌ W0 | ⬜ pending |
| D-05 | document.xml без BOM (первые 3 байта `3C 3F 78`) | structural | `head -c 3 … \| od -An -tx1` | ❌ W0 | ⬜ pending |
| D-07 | Word открывает файл без «повреждён/восстановить» | smoke | Word COM `Documents.Open` (или ручное открытие) | ❌ W0 | ⬜ pending |
| D-04 | Подвал содержит `MultiCrete@mail.ru` (не тронут) | content | grep в footer1.xml извлечённого файла | ❌ W0 | ⬜ pending |
| D-08/09 | На landing.html есть блок, кнопка «Скачать» = `<a download>` на .docx | content | grep href/download в landing.html | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `verify-anketa.ps1` (или `.sh`) — целостность zip, well-formed XML, `cmp` колонтитулов, BOM-чек, grep содержимого
- [ ] Word open smoke-проверка (обёртка вокруг `Documents.Open` или пункт ручной приёмки)
- [ ] Скрипт сборки `build-anketa.ps1` + исходник тела опросника (UTF-8 без BOM)

*Существующей тест-инфраструктуры под бинарный артефакт нет — всё создаётся в Wave 0.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Шапка/логотип/реквизиты на месте, кириллица корректна, таблицы не разъехались | D-07 | Визуальная аккуратность бланка не проверяется автоматически | Владелец открывает готовый `.docx` в Word, проверяет шапку, подвал, логотип, читаемость таблиц |
| Кнопка «Скачать опросной лист» реально отдаёт файл в браузере | D-09 | Поведение скачивания видно только в браузере | Открыть landing.html, нажать кнопку, убедиться что скачивается корректный `.docx` |

---

## Validation Sign-Off

- [ ] Все задачи имеют автопроверку или зависимость от Wave 0
- [ ] Непрерывность выборки: нет 3 задач подряд без автопроверки
- [ ] Wave 0 покрывает все MISSING-ссылки
- [ ] Нет watch-режимов
- [ ] Задержка обратной связи < 15с
- [ ] `nyquist_compliant: true` выставлен во frontmatter

**Approval:** pending
