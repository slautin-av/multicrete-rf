<#
.SYNOPSIS
  Сборка DOCX-бланка опросного листа МультиКрит инъекцией тела в фирменный шаблон.

.DESCRIPTION
  Читает шаблон 'Входящие/Бланк на опросной лист.docx' как zip (System.IO.Compression.ZipArchive,
  режим Read), подменяет ТОЛЬКО word/document.xml — вставляя тело опросника (anketa/src/anketa-body.xml)
  строго перед <w:sectPr>. Все остальные части (колонтитулы, логотип, стили, [Content_Types].xml, rels)
  копируются байт-в-байт. Результат — anketa/oprosnyj-list-multicrete.docx.

  Упаковка выполняется исключительно через System.IO.Compression.ZipArchive — штатный zip-упаковщик
  PowerShell для OOXML не годится (ломает структуру: backslash в путях, лишние артефакты).

  Требования формата OOXML соблюдаются по построению:
    - forward-slash пути в записях zip;
    - word/document.xml пишется UTF-8 БЕЗ BOM (UTF8Encoding.GetBytes);
    - <w:sectPr> остаётся последним потомком <w:body>;
    - неизменяемые части копируются как поток байт.

.NOTES
  Запуск из корня репозитория:  powershell -ExecutionPolicy Bypass -File anketa\build-anketa.ps1
  Секретов в скрипте нет — в бланке только публичный e-mail MultiCrete@mail.ru.
#>

$ErrorActionPreference = 'Stop'

# --- Пути (относительно корня репозитория; корень = родитель папки скрипта) ---
$RepoRoot     = Split-Path -Parent $PSScriptRoot
$TemplatePath = Join-Path $RepoRoot 'Входящие/Бланк на опросной лист.docx'
$BodyPath     = Join-Path $RepoRoot 'anketa/src/anketa-body.xml'
$OutPath      = Join-Path $RepoRoot 'anketa/oprosnyj-list-multicrete.docx'

foreach ($p in @($TemplatePath, $BodyPath)) {
    if (-not (Test-Path -LiteralPath $p)) {
        throw "Не найден входной файл: $p"
    }
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

# UTF-8 без BOM (конструктор с $false) — для чтения/записи document.xml
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

# --- 1. Читаем тело опросника (UTF-8) ---
$body = [System.IO.File]::ReadAllText($BodyPath, $utf8NoBom)

# --- 2. Открываем шаблон как ZipArchive (Read), готовим новое document.xml ---
$tplStream = [System.IO.File]::OpenRead($TemplatePath)
$tplZip    = New-Object System.IO.Compression.ZipArchive($tplStream, [System.IO.Compression.ZipArchiveMode]::Read)

try {
    $docEntry = $tplZip.GetEntry('word/document.xml')
    if ($null -eq $docEntry) { throw 'В шаблоне нет word/document.xml' }

    $reader = New-Object System.IO.StreamReader($docEntry.Open(), $utf8NoBom)
    $doc    = $reader.ReadToEnd()
    $reader.Close()

    # Инъекция тела строго перед <w:sectPr>. Опциональный пустой первый <w:p .../> заменяем.
    $docNew = $doc -replace '(<w:p [^>]*/>)?<w:sectPr', ($body + '<w:sectPr')

    if ($docNew -eq $doc) {
        throw 'Инъекция не сработала: маркер <w:sectPr> в document.xml не найден'
    }

    # --- 3. Пишем новый .docx: forward-slash пути, document.xml без BOM, прочее — поток байт ---
    if (Test-Path -LiteralPath $OutPath) { Remove-Item -LiteralPath $OutPath -Force }

    $outStream = [System.IO.File]::Create($OutPath)
    $outZip    = New-Object System.IO.Compression.ZipArchive($outStream, [System.IO.Compression.ZipArchiveMode]::Create)

    try {
        foreach ($entry in $tplZip.Entries) {
            $rel      = $entry.FullName.Replace('\', '/')   # OPC требует '/'
            $newEntry = $outZip.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Optimal)
            $es       = $newEntry.Open()
            try {
                if ($rel -eq 'word/document.xml') {
                    $bytes = $utf8NoBom.GetBytes($docNew)   # UTF-8 без BOM
                    $es.Write($bytes, 0, $bytes.Length)
                } else {
                    $src = $entry.Open()                    # байт-в-байт из шаблона
                    try { $src.CopyTo($es) } finally { $src.Close() }
                }
            } finally {
                $es.Close()
            }
        }
    } finally {
        $outZip.Dispose()
        $outStream.Close()
    }
} finally {
    $tplZip.Dispose()
    $tplStream.Close()
}

Write-Host "Готово: $OutPath"
