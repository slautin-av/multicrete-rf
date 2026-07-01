# Phase 3: Опросной лист подбора покрытия — Research

**Researched:** 2026-07-01
**Domain:** Программная сборка валидного DOCX (OOXML) на Windows БЕЗ Python — инъекция XML тела в фирменный шаблон
**Confidence:** HIGH (всё проверено эмпирически на реальном шаблоне и реальном Word на этой машине)

## Summary

Главный технический риск этапа — «собрать валидный DOCX-бланк инъекцией в OOXML без Python» — **снят экспериментально**. Я вскрыл фирменный шаблон `Входящие/Бланк на опросной лист.docx`, подтвердил его внутреннюю структуру, собрал тестовый `.docx` через `System.IO.Compression.ZipArchive` (штатный PowerShell 5.1, без внешнего `zip` и без Python), и **реальный Word на этой машине открыл файл без ошибок восстановления**. При этом `word/header1.xml`, `word/footer1.xml`, `word/media/image1.jpg`, `word/styles.xml` и `[Content_Types].xml` остались **байт-в-байт идентичны** оригиналу — колонтитулы владельца нетронуты по построению (D-05 выполним).

Ключевой вывод по инструментам: `zip`/`7z` на машине НЕТ; `Compress-Archive` ЕСТЬ, но **непригоден** (ломает структуру OOXML — см. Pitfall 1). Рабочий путь — **`System.IO.Compression.ZipArchive` с ручным перечислением записей и forward-slash путями**. Тело опросника формируется как строка OOXML и вставляется в `word/document.xml` строго перед `<w:sectPr>`; всё остальное копируется из шаблона неизменным.

Таблицы «Поле | Значение» рисуются self-contained (собственные `<w:tblBorders>`), но в шаблоне уже есть готовый стиль `styleId="ab"` = "Table Grid" со всеми границами — можно ссылаться на него. Заголовки блоков — стиль `styleId="1"` (heading 1) / `"2"` (heading 2), уже определены в шаблоне. Чекбоксы — символ `☐` (U+2610) прямо в `<w:t>`: шрифт тела Calibri содержит этот глиф, вариант надёжнее `w:sym`.

**Primary recommendation:** Сборка = PowerShell-скрипт (`build-anketa.ps1`) поверх `System.IO.Compression.ZipArchive`: распаковка не нужна — читаем шаблон-zip, для `word/document.xml` подменяем содержимое (инъекция тела перед `<w:sectPr>`, UTF-8 без BOM), остальные записи копируем байт-в-байт. Тело опросника — отдельный XML-фрагмент, генерируемый из структуры `ANKETA-draft-v1.md`. Приёмка (D-07) — владелец открывает `.docx` в Word.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Генерация XML тела опросника | Build-time (скрипт-исполнитель) | — | Детерминированная сборка артефакта, не рантайм |
| Перепаковка DOCX (zip OOXML) | Build-time (PowerShell) | — | `System.IO.Compression` на машине сборки |
| Хранение готового `.docx` | Static asset (репозиторий) | — | Отдаётся прямой ссылкой, без сервера (D-09) |
| Скачивание бланка | Browser / Static | — | `<a href download>` — без бэкенда |
| Блок с кнопками | Frontend (landing.html) | — | Статический HTML/CSS/JS, тёмная тема лендинга |
| Приёмка (открытие в Word) | Manual (владелец) | — | D-07, визуальная проверка колонтитулов/кириллицы |

## Standard Stack

### Core

| Инструмент | Версия (на машине) | Назначение | Почему это стандарт здесь |
|-----------|--------------------|-----------|---------------------------|
| PowerShell | 5.1.19041 `[VERIFIED: $PSVersionTable]` | Хост скрипта сборки | Штатно на Windows 10, ничего ставить не надо |
| `System.IO.Compression.ZipArchive` (.NET) | встроен `[VERIFIED: LoadWithPartialName OK]` | Чтение шаблона-zip и запись нового `.docx` | Единственный доступный способ дать forward-slash пути и контролировать порядок/BOM (см. Pitfall 1) |
| `unzip` (Git Bash) | `/usr/bin/unzip` `[VERIFIED: command -v]` | Валидация: `unzip -t`, распаковка для сравнения | Для проверки целостности готового файла |

### Supporting

| Инструмент | Назначение | Когда использовать |
|-----------|-----------|--------------------|
| Word COM (`New-Object -ComObject Word.Application`) | Программно открыть готовый файл, проверить, что Word не ругается | Автопроверка перед ручной приёмкой (Word установлен — `[VERIFIED]`, файл открылся) |
| `cmp -s` (Git Bash) | Байтовое сравнение частей шаблона до/после | Доказать, что колонтитулы/медиа не тронуты (D-05) |
| `xml.dom.minidom` / любой XML-парсер | Проверка well-formed document.xml | Ранняя ловля ошибок экранирования до Word |

### Alternatives Considered

| Вместо | Можно было | Компромисс |
|--------|-----------|-----------|
| `System.IO.Compression.ZipArchive` | `Compress-Archive` | **НЕ использовать** — ломает OOXML (Pitfall 1) |
| PowerShell + .NET zip | Внешний `zip` (info-zip) | `zip` на машине НЕТ `[VERIFIED: command -v zip → not found]` |
| PowerShell | Python + `python-docx`/`zipfile` | Python физически на машине есть (`Python313`), но D-06 требует не полагаться на Python; PowerShell — надёжнее для воспроизводимости у владельца |
| Символ `☐` (U+2610) в `<w:t>` | `<w:sym w:font="Wingdings" w:char="F06F"/>` | U+2610 не зависит от наличия Wingdings, печатается штатным Calibri; `w:sym` капризнее в вьюверах |

**Установка:** ничего ставить не требуется — все компоненты уже на машине `[VERIFIED]`.

**Version verification:** версии не из npm — это системные компоненты Windows, проверены прямым вызовом на этой машине (см. теги `[VERIFIED]`).

## Architecture Patterns

### System Architecture Diagram (поток сборки)

```
ANKETA-draft-v1.md (структура: блоки, таблицы, чекбоксы)
        │  (человек-исполнитель переносит 1:1 в шаблон-генератор тела)
        ▼
anketa-body.xml.ps1  ──►  строка OOXML тела (<w:p>…</w:p><w:tbl>…</w:tbl>…)
        │
        ▼
build-anketa.ps1
        │  1. читает шаблон .docx как ZipArchive (Read)
        │  2. для каждой записи:
        │        word/document.xml → подменяет: инъекция тела ПЕРЕД <w:sectPr>
        │        всё остальное      → копирует байт-в-байт
        │  3. пишет новый ZipArchive (Create), forward-slash пути, UTF-8 без BOM
        ▼
oprosnyj-list-multicrete.docx  ──►  в репозиторий (static asset)
        │
        ├──► unzip -t + cmp (валидация: см. Validation Architecture)
        ├──► Word COM open (автопроверка «не повреждён»)
        └──► landing.html <a href download> ──► клиент скачивает
```

Диаграмма показывает поток данных сборки, не файлы. Соответствие компонент → файл — в разделе Don't Hand-Roll / Code Examples.

### Реальная структура фирменного шаблона `[VERIFIED: unzip -l + чтение частей]`

21 часть. Что важно для нас:

| Часть | Размер | Роль | Трогаем? |
|-------|--------|------|----------|
| `[Content_Types].xml` | 2148 | Типы контента (jpg, rels, xml + Override'ы) | НЕТ (все типы уже объявлены) |
| `_rels/.rels` | 590 | Корневые связи пакета | НЕТ |
| `word/document.xml` | 3162 | **Тело — сейчас пустое** (`<w:p …/>` + `<w:sectPr>`) | **ДА — только сюда пишем** |
| `word/_rels/document.xml.rels` | 1614 | Связи документа (header/footer/styles/…) | НЕТ (тело не вводит новых rId) |
| `word/header1.xml` | 4632 | Шапка: логотип + «Опросной лист» | НЕТ (байт-в-байт) |
| `word/footer1.xml` | 9042 | Подвал: ООО «МультиКрит», MultiCrete@mail.ru, тел., www.МультиКрит.рф | НЕТ (байт-в-байт) |
| `word/_rels/header1.xml.rels` | 289 | Связь header→image1.jpg | НЕТ |
| `word/media/image1.jpg` | 2 327 570 | Логотип (≈99% размера файла) | НЕТ (байт-в-байт) |
| `word/styles.xml` | 36121 | Стили (heading 1/2, Table Grid) | НЕТ (используем существующие) |
| `word/numbering.xml` | 41477 | Нумерация | НЕТ |
| `word/settings.xml`, `webSettings.xml`, `fontTable.xml`, `theme/theme1.xml`, `footnotes.xml`, `endnotes.xml`, `docProps/*`, `customXml/*` | — | Служебные | НЕТ |

**Namespace-декларации в корне `word/document.xml`** `[VERIFIED: прочитан корневой тег]` — объявлены среди прочих `w:` (главный, `…/wordprocessingml/2006/main`), `r:` (relationships), `w14:` (`…/office/word/2010/wordml`), `mc:`, `wp:`, `v:` и т.д. Атрибут `mc:Ignorable="w14 w15 w16se …"`.
→ **При генерации тела используем ТОЛЬКО префикс `w:`** для всех элементов (`w:p`, `w:tbl`, `w:tc`, `w:r`, `w:t`, `w:pPr`, `w:pStyle` …). Он уже объявлен в корне — новые xmlns не нужны. `w14:paraId`/`w14:textId` в наших параграфах **не обязательны** (Word проставит сам), можно опускать.

### Точка вставки `[VERIFIED: содержимое document.xml]`

Текущее тело:
```xml
<w:body><w:p w14:paraId="41F28C5E" w14:textId="478E9D42" w:rsidR="00AE315C" w:rsidRPr="00CB16D2" w:rsidRDefault="00AE315C" w:rsidP="00CB16D2"/><w:sectPr …>…</w:sectPr></w:body>
```
Вставка тела опросника — **строго перед `<w:sectPr`**. Пустой `<w:p …/>` можно оставить (тогда бланк начнётся с пустой строки) или заменить нашим первым параграфом. Рекомендация — заменить, регуляркой `(<w:p [^>]*/>)?<w:sectPr` → `<НАШЕ_ТЕЛО><w:sectPr`. `<w:sectPr>` должен остаться последним потомком `<w:body>` — это обязательное требование OOXML.

### Доступные стили шаблона `[VERIFIED: styles.xml]`

| styleId | Имя | Применение |
|---------|-----|-----------|
| `1` | heading 1 | Заголовки блоков («Блок 0. Заказчик») |
| `2` | heading 2 | Подзаголовки («4.1. Абразивное воздействие») |
| `ab` | Table Grid | Таблицы «Поле \| Значение» (все границы уже в стиле) |
| `a3` | Strong | Жирный инлайн |
| `a4` | List Paragraph | Абзацы-списки |

Ссылка на стиль: параграф — `<w:pPr><w:pStyle w:val="1"/></w:pPr>`; таблица — `<w:tblPr><w:tblStyle w:val="ab"/>…`.
Шрифт тела — тема minorHAnsi = **Calibri** `[VERIFIED: theme1.xml minorFont latin=Calibri]`, размер по умолчанию 11pt (`w:sz=22`), язык `ru-RU` `[VERIFIED: docDefaults]`.

### Anti-Patterns to Avoid

- **Распаковывать шаблон в папку и потом паковать всю папку целиком** — лишний шаг, риск затащить BOM/CRLF в неизменяемые части. Лучше читать zip напрямую и подменять одну запись (см. Code Examples).
- **Ссылаться на `rId` в теле** — тело опросника (текст/таблицы/чекбоксы) не требует ни картинок, ни гиперссылок, поэтому `document.xml.rels` менять НЕ нужно. Если вдруг добавится картинка в тело — тогда и только тогда трогать rels.
- **Придумывать свои xmlns в теле** — все нужные уже в корне; добавлять их на элементы `<w:tbl>`/`<w:p>` не надо и вредно.
- **Опираться на «человекочитаемые» styleId** — Word при пересохранении переименовал стили в `a`, `a1`, `ab`… Это норма; но проверяй актуальный styleId в `styles.xml`, не хардкодь «TableGrid» (такого id тут нет — он называется `ab`).

## Don't Hand-Roll

| Проблема | Не строить | Использовать | Почему |
|----------|-----------|--------------|--------|
| Границы таблицы | Свои `<w:tblBorders>` в каждой таблице | `<w:tblStyle w:val="ab"/>` (Table Grid из шаблона) | Стиль уже определён, единообразно; self-contained borders — резерв, если стиль подведёт |
| Заголовки блоков | Ручной bold+размер в `<w:rPr>` | `<w:pStyle w:val="1"/>` / `"2"` | heading 1/2 уже в шаблоне, попадут в навигацию Word |
| Пустой чекбокс | Рисовать рамку/картинку | Символ `☐` U+2610 в `<w:t>` | Calibri содержит глиф; печатается и в Word Online/Google Docs |
| Zip-упаковка OOXML | Свой парсер/упаковщик | `System.IO.Compression.ZipArchive` | Контроль путей (forward-slash), порядка, отсутствия BOM |
| Проверка «Word откроет» | Гадать | Word COM open + `unzip -t` | Объективная автопроверка перед ручной приёмкой |

**Key insight:** шаблон уже содержит всё нужное форматирование (стили, границы, шрифт, колонтитулы). Наша задача — не «сверстать документ», а аккуратно **дописать тело в готовую заготовку**, ничего лишнего не изобретая.

## Runtime State Inventory

> Этап не rename/refactor — но есть один нюанс про артефакт-производный файл.

| Категория | Найдено | Действие |
|-----------|---------|----------|
| Stored data | None — нет БД/датастора, файл статический | — |
| Live service config | None — нет внешних сервисов, скачивание без сервера (D-09) | — |
| OS-registered state | None | — |
| Secrets/env vars | None — в бланке только публичный e-mail MultiCrete@mail.ru (не секрет) | — |
| Build artifacts | Готовый `.docx` — **производный артефакт** от шаблона + тела. При правке содержания пересобирается, а не правится руками (D-06). Исходники сборки (скрипт + XML тела) должны лежать в репозитории рядом. | Класть в репо и скрипт, и результат |

## Common Pitfalls

### Pitfall 1: `Compress-Archive` ломает OOXML
**Что идёт не так:** файл выглядит как zip, но Word говорит «повреждён / нужно восстановить», либо разъезжается структура.
**Почему:** `Compress-Archive` (PS 5.1) исторически (а) использует backslash `\` в именах записей на Windows вместо обязательного forward-slash `/`, (б) не гарантирует, что `[Content_Types].xml` окажется корректной записью, (в) может добавлять свои артефакты. OOXML/OPC требует POSIX-путей.
**Как избежать:** не использовать `Compress-Archive`. Использовать `System.IO.Compression.ZipArchive` с `CreateEntry(relPath)`, где `relPath` уже с `/` (`.Replace('\\','/')`). `[VERIFIED: собранный так файл открылся в Word, пути forward-slash]`
**Ранние признаки:** `unzip -l` показывает пути с `\` — красный флаг.

### Pitfall 2: BOM в document.xml
**Что идёт не так:** Word может ругаться на кодировку/повреждение.
**Почему:** `Set-Content`/`Out-File` в PS 5.1 по умолчанию пишут UTF-8 **с BOM** (EF BB BF), а OOXML-части должны быть UTF-8 без BOM.
**Как избежать:** писать байты через `[System.Text.Encoding]::UTF8.GetBytes($xml)` (класс `UTF8Encoding` по умолчанию БЕЗ BOM при `GetBytes`) прямо в поток записи ZipArchive — как в тесте. `[VERIFIED: первые 3 байта = 3C 3F 78 «<?x», BOM отсутствует]`
**Ранние признаки:** `head -c 3 document.xml | od -An -tx1` показывает `ef bb bf`.

### Pitfall 3: Неэкранированные `&`, `<`, `>` в кириллическом тексте
**Что идёт не так:** document.xml становится не-well-formed → Word «повреждён».
**Почему:** в текстах опросника есть амперсанды/кавычки/скобки; в XML `&`→`&amp;`, `<`→`&lt;`, `>`→`&gt;`. Кавычки внутри `<w:t>` экранировать не обязательно.
**Как избежать:** прогонять весь **текстовый** контент (то, что попадает между `<w:t>…</w:t>`) через экранирование ПЕРЕД сборкой строки. Разметочные `<w:…>` — не трогать. Кириллица в UTF-8 экранирования не требует — только сохранять кодировку UTF-8. `[VERIFIED: тестовое тело с &amp; &lt; &gt; открылось в Word корректно, minidom подтвердил well-formed]`
**Ранние признаки:** XML-парсер (`minidom`) падает на document.xml.

### Pitfall 4: `<w:sectPr>` не последним в body
**Что идёт не так:** документ невалиден, поля страницы/колонтитулы слетают.
**Почему:** OOXML требует `<w:sectPr>` последним потомком `<w:body>` (задаёт размер страницы и ссылки на header/footer — `rId8`/`rId9`).
**Как избежать:** вставлять тело строго ПЕРЕД `<w:sectPr`, никогда после. `[VERIFIED: тест сохранил sectPr в конце, колонтитулы отрисовались]`

### Pitfall 5: изменение неизменяемых частей при копировании
**Что идёт не так:** колонтитулы/логотип «поехали», приёмка (D-07) провалена.
**Почему:** случайная перекодировка/переформатирование при копировании частей.
**Как избежать:** копировать все части, кроме `word/document.xml`, **как поток байт** (`OpenRead().CopyTo(entryStream)`), не через строки. Проверять `cmp -s` против шаблона. `[VERIFIED: header/footer/media/styles/Content_Types идентичны байт-в-байт]`

## Code Examples

Проверенные на этой машине паттерны.

### Сборка DOCX (ядро build-anketa.ps1) `[VERIFIED: этот код собрал файл, открывшийся в Word]`
```powershell
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$tplDir = 'путь/к/распакованному/шаблону'   # или читать сам .docx как ZipArchive Read-режима
$out    = 'oprosnyj-list-multicrete.docx'

# 1. Готовим новое document.xml: инъекция тела перед <w:sectPr>
$doc  = [System.IO.File]::ReadAllText("$tplDir/word/document.xml", [System.Text.Encoding]::UTF8)
$body = Get-AnketaBodyXml   # функция-генератор тела (см. ниже), возвращает строку OOXML
$docNew = $doc -replace '(<w:p [^>]*/>)?<w:sectPr', ($body + '<w:sectPr')

# 2. Пишем новый zip: forward-slash пути, document.xml как UTF-8 без BOM, остальное байт-в-байт
$fs  = [System.IO.File]::Create($out)
$zip = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)
foreach ($file in Get-ChildItem $tplDir -Recurse -File) {
    $rel   = $file.FullName.Substring($tplDir.Length + 1).Replace('\','/')  # ОБЯЗАТЕЛЬНО '/'
    $entry = $zip.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Optimal)
    $es    = $entry.Open()
    if ($rel -eq 'word/document.xml') {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($docNew)   # UTF8Encoding.GetBytes => без BOM
        $es.Write($bytes, 0, $bytes.Length)
    } else {
        $src = [System.IO.File]::OpenRead($file.FullName); $src.CopyTo($es); $src.Close()  # байт-в-байт
    }
    $es.Close()
}
$zip.Dispose(); $fs.Close()
```

### Экранирование текста для `<w:t>`
```powershell
function XmlEsc([string]$s) {
    return $s.Replace('&','&amp;').Replace('<','&lt;').Replace('>','&gt;')
    # порядок важен: & первым
}
```

### Параграф-заголовок блока
```xml
<w:p><w:pPr><w:pStyle w:val="1"/></w:pPr><w:r><w:t>Блок 0. Заказчик</w:t></w:r></w:p>
```

### Таблица «Поле | Значение» (2 колонки, стиль Table Grid шаблона)
```xml
<w:tbl>
  <w:tblPr>
    <w:tblStyle w:val="ab"/>
    <w:tblW w:w="0" w:type="auto"/>
    <w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>
  </w:tblPr>
  <w:tblGrid>
    <w:gridCol w:w="4675"/>
    <w:gridCol w:w="4675"/>
  </w:tblGrid>
  <w:tr>
    <w:tc>
      <w:tcPr><w:tcW w:w="4675" w:type="dxa"/></w:tcPr>
      <w:p><w:r><w:t>Предприятие</w:t></w:r></w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="4675" w:type="dxa"/></w:tcPr>
      <w:p/>
    </w:tc>
  </w:tr>
</w:tbl>
```
> Примечание: сумма ширин ≈ 9350 twip = рабочая ширина A4 при полях шаблона (11906 − 567 − 567 ≈ 10772; можно взять 5386/5386 — уточнить при вёрстке). После `</w:tbl>` желательно вставлять пустой `<w:p/>` (Word не любит две таблицы подряд без параграфа между).

### Блок чекбоксов (символ U+2610, шрифт тела Calibri)
```xml
<w:p>
  <w:r><w:t>☐ Насосное оборудование    ☐ Гребной / судовой винт    ☐ Трубопровод, отвод, колено</w:t></w:r>
</w:p>
```
> `☐` = U+2610 BALLOT BOX. Хранить исходник тела и скрипт в UTF-8. Word печатает глиф штатным Calibri. Для «Другое: __________» — обычные подчёркивания в тексте.

### Поле «УТВЕРЖДАЮ» / прочерки
```xml
<w:p>
  <w:r><w:rPr><w:b/></w:rPr><w:t>УТВЕРЖДАЮ</w:t></w:r>
  <w:r><w:t xml:space="preserve">  _______________________________________________</w:t></w:r>
</w:p>
```
> `xml:space="preserve"` — обязателен, если в `<w:t>` есть значимые ведущие/множественные пробелы.

### Автопроверка «Word откроет» (COM) `[VERIFIED: отработало, файл открылся]`
```powershell
$word = New-Object -ComObject Word.Application; $word.Visible = $false
$doc  = $word.Documents.Open($path, $false, $true)   # ReadOnly
$ok   = $doc.Paragraphs.Count -gt 0
$doc.Close($false); $word.Quit()
```

## State of the Art

| Старый подход | Текущий подход | Импакт |
|---------------|----------------|--------|
| Верстать бланк руками в Word | Программная инъекция OOXML (D-05) | Воспроизводимость: правка содержания → пересборка |
| `Compress-Archive` для zip | `System.IO.Compression.ZipArchive` | Единственный надёжный способ на этой машине |
| `w:sym`/Wingdings для чекбокса | Unicode ☐ (U+2610) в тексте | Печатается в любом вьювере без спец-шрифта |

**Deprecated/outdated:** `Compress-Archive` для сборки OOXML — избегать (Pitfall 1).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Ширины колонок 4675/4675 twip хорошо лягут в поля шаблона | Code Examples (таблица) | Низкий — таблица «auto» подстроится; уточняется на вёрстке, видно в приёмке |
| A2 | Владельцу для будущих правок доступен PowerShell (не нужен Python) | Stack | Низкий — PS штатный в Windows; сборку всё равно ведёт исполнитель |

**Все прочие claim'ы — `[VERIFIED]` на этой машине.** Список короткий: главный риск снят экспериментом.

## Open Questions

1. **Точные ширины колонок и разбивка широких строк**
   - Что знаем: рабочая ширина ≈ 10772 twip (поля шаблона узкие: left/right по 567).
   - Что неясно: как лягут длинные подписи полей (напр. «Пожелания по покрытию: желаемая твёрдость по Шор А…»).
   - Рекомендация: делать колонку «Поле» шире (≈6000) для длинных подписей, «Значение» уже; финально — глазами на приёмке (D-07).

2. **Оставлять ли первый пустой `<w:p/>` шаблона**
   - Рекомендация: заменить его первым осмысленным параграфом (заголовок блока 0 или вводную «Как заполнять»), чтобы бланк не начинался с пустой строки.

## Environment Availability

| Зависимость | Требуется для | Доступно | Версия | Fallback |
|-------------|---------------|----------|--------|----------|
| PowerShell | Скрипт сборки | ✓ | 5.1.19041 | — |
| System.IO.Compression | Zip OOXML | ✓ | .NET встроен | — |
| unzip (Git Bash) | Валидация | ✓ | /usr/bin/unzip | — |
| Microsoft Word (COM) | Автопроверка + приёмка | ✓ | установлен (COM отработал) | Ручное открытие владельцем |
| zip (info-zip) | — | ✗ | — | System.IO.Compression (используем его) |
| 7-Zip | — | ✗ | — | System.IO.Compression |
| Python | (не используем по D-06) | ✓ (есть Python313) | 3.13 | Не задействуем — PS достаточно |

**Missing dependencies with no fallback:** нет — всё критичное доступно.
**Missing dependencies with fallback:** `zip`/`7z` отсутствуют, заменены штатным `System.IO.Compression` (проверено).

## Validation Architecture

> nyquist_validation считаем включённым (в конфиге не отключён). Артефакт не код — «тесты» здесь = структурные проверки файла.

### Test Framework

| Свойство | Значение |
|----------|----------|
| Framework | Скрипты-проверки (PowerShell + Git Bash), не unit-фреймворк — артефакт бинарный |
| Config file | none — проверки в `verify-anketa.sh`/`.ps1` рядом со сборкой (Wave 0) |
| Quick run command | `unzip -t oprosnyj-list-multicrete.docx` |
| Full suite command | `verify-anketa` (целостность zip + well-formed XML + байтовое сравнение колонтитулов + Word COM open) |

### Phase Requirements → Test Map

| Req | Проверяемое поведение | Тип | Автокоманда | Файл есть? |
|-----|----------------------|-----|-------------|-----------|
| D-05 | Файл распаковывается, zip валиден | structural | `unzip -t *.docx` | ❌ Wave 0 |
| D-05 | `word/document.xml` содержит тело опросника (заголовки блоков 0–6, таблицы, чекбоксы) | content | grep-проверка ключевых строк в извлечённом document.xml | ❌ Wave 0 |
| D-05 | document.xml — well-formed XML (экранирование OK) | structural | XML-парс извлечённого document.xml | ❌ Wave 0 |
| D-05 | header1.xml / footer1.xml / media/image1.jpg — байт-в-байт как в шаблоне | integrity | `cmp -s` каждой части против шаблона | ❌ Wave 0 |
| D-05 | document.xml без BOM (первые 3 байта `3C 3F 78`) | structural | `head -c 3 … \| od -An -tx1` | ❌ Wave 0 |
| D-07 | Word открывает файл без «повреждён/восстановить» | smoke | Word COM `Documents.Open` | ❌ Wave 0 |
| D-04 | Подвал содержит `MultiCrete@mail.ru` (не тронут) | content | grep в footer1.xml | ❌ Wave 0 |
| D-08/09 | На landing.html есть блок, кнопка «Скачать» = `<a download>` на .docx | content | grep href/download в landing.html | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `unzip -t *.docx` + well-formed document.xml.
- **Per wave merge:** полный `verify-anketa` (все строки таблицы выше).
- **Phase gate:** зелёный `verify-anketa` + **ручная приёмка владельца в Word (D-07)** — визуально: шапка, логотип, реквизиты, кириллица, таблицы не разъехались.

### Wave 0 Gaps

- [ ] `verify-anketa.sh` (или `.ps1`) — целостность zip, well-formed XML, `cmp` колонтитулов, BOM-чек, grep содержимого
- [ ] Word COM smoke-проверка (обёртка вокруг `Documents.Open`)
- [ ] Скрипт сборки `build-anketa.ps1` + генератор тела `anketa-body` (исходник тела в UTF-8)

*(Существующей тест-инфраструктуры под бинарный артефакт нет — всё создаётся в Wave 0.)*

## Security Domain

> security_enforcement не отключён явно — раздел включён; но поверхность атаки минимальна.

### Applicable ASVS Categories

| ASVS | Applies | Контроль |
|------|---------|----------|
| V2 Authentication | no | Нет auth — статический файл |
| V3 Session | no | Нет сессий |
| V4 Access Control | no | Публичный бланк на скачивание |
| V5 Input Validation | yes (build-time) | Экранирование текста для XML (`&`,`<`,`>`) при генерации тела — иначе битый файл, не уязвимость |
| V6 Cryptography | no | Нет крипто |

### Known Threat Patterns

| Паттерн | STRIDE | Митигация |
|---------|--------|-----------|
| Секрет в артефакте | Information Disclosure | В бланке только публичный e-mail; проверить, что скрипт/тело не содержат ключей (правило CLAUDE.md) |
| Битый DOCX из-за неэкранированного текста | (не security — качество) | XmlEsc + well-formed проверка |

> Реальных security-рисков этап почти не несёт: статический документ без пользовательского ввода в рантайме.

## Project Constraints (from CLAUDE.md)

- **Имена файлов кода — латиница и дефисы**, без пробелов/кириллицы → `anketa/oprosnyj-list-multicrete.docx`, `build-anketa.ps1`, `verify-anketa.sh`. Имя для клиента при скачивании — кириллицей через `download="Опросной лист МультиКрит.docx"` (это атрибут, не имя файла в репо).
- **Не удалять/переименовывать файлы без подтверждения** → шаблон `Входящие/Бланк на опросной лист.docx` не трогать/не переименовывать; готовый файл — новый.
- **Проверять код на пароли/ключи** → в скрипте сборки и в теле бланка секретов нет (только публичный e-mail); проверить перед коммитом.
- **Отвечать на русском** → соблюдено.
- Бриф читать перед изменением страниц сайта (блок на landing.html — этап включает правку страницы).

## Sources

### Primary (HIGH confidence — эмпирика на этой машине)
- `Входящие/Бланк на опросной лист.docx` — вскрыт как zip, прочитаны `document.xml`, `[Content_Types].xml`, `document.xml.rels`, `styles.xml`, `header1.xml`, `footer1.xml`, `theme1.xml`, `settings.xml`
- Тестовая сборка через `System.IO.Compression.ZipArchive` → `unzip -t` OK → `cmp` колонтитулов IDENTICAL → BOM отсутствует → `minidom` well-formed → **Word COM `Documents.Open` открыл без ошибок**
- Проверка инструментов: `command -v zip/unzip/7z/python`, `$PSVersionTable`, `Get-Command Compress-Archive`

### Secondary (MEDIUM)
- OOXML/OPC требования (sectPr последним в body; forward-slash пути в OPC; UTF-8 без BOM) — общеизвестные требования формата, подтверждены поведением Word в тесте

### Tertiary (LOW)
- нет — критичные claim'ы верифицированы прямым тестом

## Metadata

**Confidence breakdown:**
- Структура шаблона: HIGH — прочитана напрямую
- Рецепт сборки zip: HIGH — собранный файл открылся в реальном Word, колонтитулы байт-в-байт
- Грамматика OOXML тела: HIGH — паттерны стандартны, тестовый фрагмент прошёл Word
- Экранирование/BOM/кириллица: HIGH — проверено на тестовом теле с `&<>` и кириллицей
- Инструменты Windows: HIGH — проверены прямыми вызовами

**Research date:** 2026-07-01
**Valid until:** ~30 дней (окружение стабильно; шаблон и инструменты не меняются)
