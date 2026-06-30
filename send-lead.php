<?php
/**
 * send-lead.php — переиспользуемый обработчик заявки (LEAD-02).
 *
 * Назначение: принять POST-заявку с фронта (калькулятор и др. формы),
 * переслать письмом владельцу на MultiCrete@yandex.ru и вернуть JSON-ответ
 * для UI. Параметр `source` делает обработчик переиспользуемым (D-03).
 *
 * ЗАЛИВКА (D-02, обязательно перед сдачей):
 *   1. Залить этот файл в КОРЕНЬ хостинга Reg.ru — URL будет /send-lead.php.
 *   2. Создать ящик-отправитель FROM_EMAIL (см. константу ниже) в панели Reg.ru
 *      и убедиться, что SPF домена проходит, порт 587/TLS доступен (порт 25 закрыт).
 *   3. Подставить рабочий домен Reg.ru в FROM_EMAIL.
 *   4. Отправить реальную тестовую заявку и проверить, что письмо ПРИШЛО
 *      на MultiCrete@yandex.ru (включая папку «Спам»).
 *
 * БЕЗОПАСНОСТЬ:
 *   - Защита от email header-injection (CRLF) для полей, идущих в заголовки.
 *   - Honeypot-поле `website` отсекает ботов.
 *   - Получатель $to зафиксирован в коде (анти-релей), НЕ из пользовательского ввода.
 *   - Письмо text/plain (без HTML) — нет XSS при просмотре.
 *   - НИКАКИХ паролей/ключей/SMTP-логинов в этом файле (CLAUDE.md).
 *     FROM_EMAIL — это домен отправителя, а не секрет.
 *
 * Fallback Web3Forms (D-02) в этот файл НЕ зашит — он включается на фронте
 * сменой endpoint, если почта Reg.ru не заработает.
 */

// Адрес отправителя — на СОБСТВЕННОМ домене сайта (НЕ @yandex.ru, иначе спам).
// TODO при заливке: подставить рабочий домен Reg.ru (напр. noreply@мультикрит.рф).
const FROM_EMAIL = 'noreply@example-domain';
const FROM_NAME  = 'МультиКрит сайт';

// Фиксированный получатель заявок (владелец). НЕ берётся из пользовательского ввода.
const LEAD_RECIPIENT = 'MultiCrete@yandex.ru';

header('Content-Type: application/json; charset=UTF-8');

/**
 * Завершить выполнение JSON-ответом.
 */
function respond($success, $error = null, $code = 200)
{
    http_response_code($code);
    $payload = ['success' => (bool) $success];
    if ($error !== null) {
        $payload['error'] = $error;
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Отвергнуть значение с CR/LF — защита от email header-injection (ASVS V5).
 * Применять к КАЖДОМУ полю, попадающему в заголовки письма (email, name, source).
 */
function rejectIfInjection($v)
{
    if (preg_match('/[\r\n]/', $v)) {
        respond(false, 'bad input', 400);
    }
    return $v;
}

// Только POST.
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(false, 'method not allowed', 405);
}

// Фронт шлёт JSON (fetch, Content-Type: application/json); поддержим и обычный $_POST.
$raw  = file_get_contents('php://input');
$data = [];
if ($raw !== false && $raw !== '') {
    $decoded = json_decode($raw, true);
    if (is_array($decoded)) {
        $data = $decoded;
    }
}
if (!$data) {
    $data = $_POST;
}

/**
 * Достать строковое поле из заявки.
 */
function field($data, $key, $maxLen = 500)
{
    $v = isset($data[$key]) ? (string) $data[$key] : '';
    $v = trim($v);
    return mb_substr($v, 0, $maxLen);
}

// Honeypot: если скрытое поле заполнено — это бот. Тихо «успех», ничего не шлём.
$honeypot = field($data, 'website');
if ($honeypot !== '') {
    respond(true);
}

// Поля заявки.
$name         = rejectIfInjection(field($data, 'name'));          // может идти в From-name
$organization = field($data, 'organization');                     // тело письма
$phone        = field($data, 'phone');                            // тело письма
$emailInput   = rejectIfInjection(field($data, 'email'));         // идёт в Reply-To
// source идёт в тему письма (Subject = заголовок), поэтому defense in depth:
// чистим регуляркой И прогоняем через rejectIfInjection (CR-01).
$source       = rejectIfInjection(preg_replace('/[^a-z0-9_-]/i', '', (string) ($data['source'] ?? 'unknown')));
if ($source === '') {
    $source = 'unknown';
}

// E-mail необязателен: в Reply-To попадает только валидный.
$cleanEmail = '';
if ($emailInput !== '' && filter_var($emailInput, FILTER_VALIDATE_EMAIL)) {
    $cleanEmail = $emailInput;
}

// Организация обязательна (продуктовое требование владельца).
if ($organization === '') {
    respond(false, 'no organization', 400);
}

// Нужен хотя бы один контакт: иначе с клиентом не связаться (WR-03).
if ($phone === '' && $cleanEmail === '') {
    respond(false, 'no contact', 400);
}

// Тема — с кириллицей, обязательно кодируем base64 (=?UTF-8?B?...?=).
$subject = '=?UTF-8?B?' . base64_encode('Заявка с калькулятора — МультиКрит [' . $source . ']') . '?=';

// Тело письма — UTF-8 text/plain (без HTML → нет XSS при просмотре).
$bodyLines = [
    'Новая заявка с сайта МультиКрит.',
    'Источник: ' . $source,
    '',
    'Имя: '         . ($name !== '' ? $name : '—'),
    'Организация: ' . ($organization !== '' ? $organization : '—'),
    'Телефон: '     . ($phone !== '' ? $phone : '—'),
    'E-mail: '      . ($emailInput !== '' ? $emailInput : '—'),
];
$body = implode("\r\n", $bodyLines);

// Заголовки письма.
$headers   = [];
$headers[] = 'From: ' . FROM_NAME . ' <' . FROM_EMAIL . '>'; // СВОЙ домен, не @yandex.ru
if ($cleanEmail !== '') {
    $headers[] = 'Reply-To: ' . $cleanEmail;                 // ответ уйдёт клиенту
}
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-Type: text/plain; charset=UTF-8';
$headers[] = 'Content-Transfer-Encoding: 8bit';

$ok = mail(LEAD_RECIPIENT, $subject, $body, implode("\r\n", $headers));

if ($ok) {
    respond(true);
}
respond(false, 'mail failed', 500);
