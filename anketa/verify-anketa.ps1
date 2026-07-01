<#
.SYNOPSIS
  Структурные проверки готового DOCX-бланка опросного листа МультиКрит.

.DESCRIPTION
  Проверяет anketa/oprosnyj-list-multicrete.docx по карте валидации 03-VALIDATION.md (D-04/D-05/D-07):
    1. Целостность zip (unzip -t → «No errors detected»).
    2. word/document.xml — well-formed XML.
    3. document.xml без BOM (первые 3 байта 3C 3F 78 = «<?x»).
    4. Содержание тела: «Блок 0», «Характер воздействия», «УТВЕРЖДАЮ».
    5. Байтовая идентичность колонтитулов против шаблона:
       word/header1.xml, word/footer1.xml, word/media/image1.jpg, word/styles.xml, [Content_Types].xml.
    6. Подвал (word/footer1.xml) содержит MultiCrete@mail.ru.
    7. Word COM smoke: открыть файл ReadOnly, Paragraphs.Count > 0 (graceful WARN, если COM недоступен).

  При любом FAIL скрипт завершается ненулевым кодом. Секретов в скрипте нет.

.NOTES
  Запуск из корня репозитория:  powershell -ExecutionPolicy Bypass -File anketa\verify-anketa.ps1
#>

$ErrorActionPreference = 'Stop'

$RepoRoot     = Split-Path -Parent $PSScriptRoot
$TemplatePath = Join-Path $RepoRoot 'Входящие/Бланк на опросной лист.docx'
$DocxPath     = Join-Path $RepoRoot 'anketa/oprosnyj-list-multicrete.docx'

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$script:Failed = $false

function Report($ok, $label, $detail) {
    if ($ok) {
        Write-Host ("PASS  {0}" -f $label) -ForegroundColor Green
    } else {
        Write-Host ("FAIL  {0}  — {1}" -f $label, $detail) -ForegroundColor Red
        $script:Failed = $true
    }
}
function Warn($label, $detail) {
    Write-Host ("WARN  {0}  — {1}" -f $label, $detail) -ForegroundColor Yellow
}

# Прочитать запись zip как массив байт
function Get-ZipEntryBytes([string]$zipPath, [string]$entryName) {
    $fs  = [System.IO.File]::OpenRead($zipPath)
    $zip = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Read)
    try {
        $entry = $zip.GetEntry($entryName)
        if ($null -eq $entry) { return $null }
        $ms = New-Object System.IO.MemoryStream
        $es = $entry.Open()
        try { $es.CopyTo($ms) } finally { $es.Close() }
        return $ms.ToArray()
    } finally {
        $zip.Dispose(); $fs.Close()
    }
}

if (-not (Test-Path -LiteralPath $DocxPath)) {
    Report $false 'Готовый .docx существует' "не найден: $DocxPath"
    Write-Host ''
    Write-Host 'Файл не собран. Запустите anketa\build-anketa.ps1' -ForegroundColor Red
    exit 1
}
Report $true 'Готовый .docx существует' $DocxPath

# --- 1. Целостность zip (unzip -t) ---
try {
    $unzipOut = & unzip -t $DocxPath 2>&1 | Out-String
    Report ($unzipOut -match 'No errors detected') 'D-05: zip валиден (unzip -t)' 'unzip -t не вернул «No errors detected»'
} catch {
    Warn 'D-05: zip валиден (unzip -t)' "unzip недоступен: $($_.Exception.Message)"
}

# --- Извлекаем document.xml (байты) один раз ---
$docBytes = Get-ZipEntryBytes $DocxPath 'word/document.xml'
if ($null -eq $docBytes) {
    Report $false 'word/document.xml присутствует' 'запись не найдена в .docx'
} else {
    Report $true 'word/document.xml присутствует' ''

    # --- 3. BOM-чек: первые 3 байта 3C 3F 78 (не EF BB BF) ---
    $b0 = $docBytes[0]; $b1 = $docBytes[1]; $b2 = $docBytes[2]
    $noBom = ($b0 -eq 0x3C -and $b1 -eq 0x3F -and $b2 -eq 0x78)
    Report $noBom 'D-05: document.xml без BOM (3C 3F 78)' ("первые байты: {0:X2} {1:X2} {2:X2}" -f $b0, $b1, $b2)

    # Текст document.xml (UTF-8)
    $docText = [System.Text.Encoding]::UTF8.GetString($docBytes)

    # --- 2. well-formed XML ---
    try {
        [xml]$null = $docText
        Report $true 'D-05: document.xml well-formed' ''
    } catch {
        Report $false 'D-05: document.xml well-formed' $_.Exception.Message
    }

    # --- 4. Content-чек тела ---
    foreach ($needle in @('Блок 0', 'Характер воздействия', 'УТВЕРЖДАЮ')) {
        Report ($docText.Contains($needle)) ("D-05: тело содержит «{0}»" -f $needle) 'подстрока не найдена'
    }
}

# --- 5. Байтовая идентичность неизменяемых частей ---
$immutableParts = @(
    'word/header1.xml',
    'word/footer1.xml',
    'word/media/image1.jpg',
    'word/styles.xml',
    '[Content_Types].xml'
)
if (-not (Test-Path -LiteralPath $TemplatePath)) {
    Warn 'D-05: колонтитулы байт-в-байт' "шаблон не найден для сравнения: $TemplatePath"
} else {
    foreach ($part in $immutableParts) {
        $tplBytes = Get-ZipEntryBytes $TemplatePath $part
        $outBytes = Get-ZipEntryBytes $DocxPath   $part
        if ($null -eq $tplBytes -or $null -eq $outBytes) {
            Report $false ("D-05: {0} байт-в-байт" -f $part) 'часть отсутствует в шаблоне или в .docx'
            continue
        }
        $same = ($tplBytes.Length -eq $outBytes.Length)
        if ($same) {
            for ($i = 0; $i -lt $tplBytes.Length; $i++) {
                if ($tplBytes[$i] -ne $outBytes[$i]) { $same = $false; break }
            }
        }
        Report $same ("D-05: {0} байт-в-байт" -f $part) 'содержимое отличается от шаблона'
    }
}

# --- 6. Подвал содержит MultiCrete@mail.ru ---
# Word дробит e-mail на несколько <w:t> run'ов (rsid/проверка орфографии),
# поэтому проверяем «плоский» текст подвала: конкатенацию содержимого всех <w:t>…</w:t>.
$footerBytes = Get-ZipEntryBytes $DocxPath 'word/footer1.xml'
if ($null -eq $footerBytes) {
    Report $false 'D-04: e-mail в подвале' 'word/footer1.xml не найден'
} else {
    $footerXml = [System.Text.Encoding]::UTF8.GetString($footerBytes)
    $flat = ($footerXml | Select-String -Pattern '<w:t[^>]*>([^<]*)</w:t>' -AllMatches |
             ForEach-Object { $_.Matches } |
             ForEach-Object { $_.Groups[1].Value }) -join ''
    Report ($flat -match 'MultiCrete@mail\.ru') 'D-04: подвал содержит MultiCrete@mail.ru' 'e-mail не найден в плоском тексте footer1.xml'
}

# --- 7. Word COM smoke (graceful WARN) ---
$word = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    try {
        $doc = $word.Documents.Open($DocxPath, $false, $true)   # ReadOnly
        $paraCount = $doc.Paragraphs.Count
        $doc.Close($false)
        Report ($paraCount -gt 0) 'D-07: Word открыл файл (COM smoke)' "Paragraphs.Count = $paraCount"
    } finally {
        $word.Quit()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    }
} catch {
    Warn 'D-07: Word открыл файл (COM smoke)' "Word COM недоступен — требуется ручная приёмка. ($($_.Exception.Message))"
}

Write-Host ''
if ($script:Failed) {
    Write-Host 'РЕЗУЛЬТАТ: FAIL — есть проваленные проверки.' -ForegroundColor Red
    exit 1
} else {
    Write-Host 'РЕЗУЛЬТАТ: PASS — все структурные проверки пройдены (WARN не считается FAIL).' -ForegroundColor Green
    exit 0
}
