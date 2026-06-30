// engine.js — ядро движка калькулятора покрытий «МультиКрит».
//
// Чистая функция calc(inputs, PARAMS) -> breakdown. Без DOM, без чтения
// глобалей, без даты/random — детерминирована. UI этапа 2 просто вызовет
// calc() и отрисует breakdown.
//
// Эталон — «Калькуляция МультиКрит 700.xlsx». Движок воспроизводит его
// число-в-число (CALC-01). Формулы перенесены РОВНО в порядке Excel; адреса
// ячеек указаны в комментариях (К = лист «Калькуляция», РП = «Расчет.
// поверхн», ВМ = «вспомогательные материалы»). Подробности — 01-RESEARCH.md.
//
// CALC-09: никаких «магических чисел» в формулах — все ставки, цены, проценты
// и нормы берутся из объекта PARAMS (P.xxx). Исключение — структурные
// делители геометрии и нормативов количества расходников: по решению
// владельца количество вспомогательных материалов считает движок (в PARAMS
// только цены за единицу), а геометрия площади/объёма — часть алгоритма.

// ROUNDUP(x, n) из Excel — округление ВВЕРХ (от нуля) до n знаков.
// Для всех величин модели x >= 0, поэтому Math.ceil совпадает с ROUNDUP.
// Реализовывать «умное» округление или decimal-арифметику НЕЛЬЗЯ: эталон
// считает в обычном double, любая «улучшенная» точность сломает совпадение.
function roundUp(x, n = 0) {
  const k = 10 ** n;
  return Math.ceil(x * k) / k;
}

/**
 * Расчёт предварительной стоимости покрытия.
 *
 * @param {{S:number, T:number, klass:(1|2|3)}} inputs
 *   S — площадь детали, м²; T — толщина покрытия, мм; klass — класс сложности.
 * @param {object} P — объект PARAMS (один источник истины, заморожен).
 * @returns {object} breakdown — полная разбивка стоимости + список оговорок.
 */
export function calc(inputs, P) {
  const { S, T, klass } = inputs;

  // Коэффициент класса сложности (К F20). Применяется ТОЛЬКО к работам.
  const coef = P.koefKlass[klass] ?? P.koefKlass[1];

  // ── Шаг 1. Материал (РП + К79–86) ──────────────────────────────────────
  // Объём эластомера, см³: I30 = (F30*10000)*H15/10.
  const volElastomer = S * 10000 * T / 10;
  // Масса сырая, кг: E33 = Vэл*расход/1000*(1+потери).
  const massElastomerRaw = volElastomer * P.rashodElastomer / 1000 * (1 + P.poteriElastomer);
  // E80 = ROUNDUP(масса, 0) — округление вверх до целого. Двигает и цену, и порог.
  const massElastomer = roundUp(massElastomerRaw, 0);
  // Ценовой порог эластомера по округлённой массе (F80): <20 / 20..100 / >=100.
  const cenaElastomer = massElastomer < 20 ? P.cenaEl_do20
    : massElastomer < 100 ? P.cenaEl_20_100
      : P.cenaEl_ot100;
  const stElastomer = massElastomer * cenaElastomer;                       // G80

  // Грунты и очиститель: норма*потери*1 → ROUNDUP до 0.1 → ×цена.
  const kgGruntPredv = roundUp(roundUp(S * P.normaGruntPredv * (1 + P.poteriGruntPredv), 2), 1); // РП E35→E82
  const stGruntPredv = kgGruntPredv * P.cenaGrunt;                          // G82
  const kgGruntOsn = roundUp(roundUp(S * P.normaGruntOsn * (1 + P.poteriGruntOsn), 2), 1);       // РП E36→E83
  const stGruntOsn = kgGruntOsn * P.cenaGrunt;                             // G83
  const stGruntRezina = 0;                                                  // G84 — флаг выкл.
  const kgOchistitel = roundUp(roundUp(S * P.normaOchistitel * (1 + P.poteriOchistitel), 2), 1); // РП E38→E85
  const stOchistitel = kgOchistitel * P.cenaOchistitel;                    // G85

  // Основные материалы G86 = SUM(G80:G85). Коэффициент класса НЕ применяется.
  const materialy = stElastomer + stGruntPredv + stGruntOsn + stGruntRezina + stOchistitel;

  // ── Шаг 2. Трудозатраты построчно (К40–56) ─────────────────────────────
  const sPlosch = S < 1 ? 1 : S;                                           // E42 = IF(S<1;1;S)
  const stDrobestruika = sPlosch * P.stavkaDrobestruika;                    // G42
  const stObespylivanie = sPlosch * P.stavkaObespylivanie;                 // G43
  const stPodgotovkaDo = S * P.dolyaPodgotovkaDo * P.stavkaPodgotovka;     // G47
  const stObezzhirivanie = S * P.stavkaObezzhirivanie;                     // G49
  const stGruntPredvWork = S * P.stavkaGruntPredv;                         // G50
  const stGruntOsnWork = S * P.stavkaGruntOsn;                             // G51
  // Нанесение: F52 нелинейна по толщине (CALC-03), излом на 3 мм.
  const rascNanesenie = T <= 3
    ? T * P.rasc1mm
    : (T - 3) * P.rascPosled + 3 * P.rasc1mm;                              // F52
  const stNanesenie = S * rascNanesenie;                                  // G52
  const stPodgotovkaPosle = S * P.dolyaPodgotovkaPosle * P.stavkaPodgotovka; // G53

  const sumWorks = stDrobestruika + stObespylivanie + stPodgotovkaDo
    + stObezzhirivanie + stGruntPredvWork + stGruntOsnWork
    + stNanesenie + stPodgotovkaPosle;                                     // SUM(G42:G53)

  const stITR = P.stavkaITR * P.dni;                                       // G54
  // Коэффициент класса умножает ТОЛЬКО sumWorks, НЕ ИТР (камень 2).
  const esn = (sumWorks * coef + stITR) * P.esn / 100;                     // G55
  const trudozatraty = sumWorks * coef + stITR + esn;                      // G56

  // ── Шаг 3. Вспомогательные материалы (лист ВМ, итог G62) ───────────────
  // Количество расходников считает движок (гибрид масса E80 / площадь S, как
  // в эталоне «700»). Цены — из PARAMS. ROUNDUP там же, где в эталоне.
  const E80 = massElastomer;
  const vspomMaterialy =
      roundUp(S / 10, 0) * P.cenaSoplo                       // сопло, по площади
    + roundUp(E80 / 10, 0) * P.cenaKisti60                   // кисти 60 мм, по массе
    + roundUp(E80 / 20, 0) * P.cenaKistiRadiator             // кисти радиаторные, по массе
    + roundUp(E80 / 10, 0) * P.cenaStakanchiki               // стаканчики, по массе
    + roundUp(E80 / 20, 1) * P.cenaVetosh                    // ветошь, по массе
    + roundUp(E80 / 20, 1) * P.cenaPolotenca                 // полотенца, по массе
    + roundUp(S / 25, 2) * P.cenaPerchatki                   // перчатки, по площади
    + (S / 20) * P.cenaKostyum                               // костюм, по площади
    + (S / 25 * 2 * P.specChel) * P.cenaFiltr                // фильтр, площадь×спец
    + (S / 10) * P.cenaDiskZachistnoy                        // диск зачистной, по площади
    + (S / 50) * P.cenaPlenka                                // плёнка, по площади
    + roundUp(S / 10, 1) * P.cenaSkotch                      // скотч, по площади (до 0.1)
    + P.kolRastvoritel * P.cenaRastvoritel                   // растворитель, фикс. кол-во
    + P.cenaOsnastka;                                        // оснастка, выкл. (=0)

  // ── Шаг 4. Накрутки (порядок строгий — камень 3) ───────────────────────
  const sklad = (vspomMaterialy + materialy) * P.sklad / 100;              // G63 (зависит от материалов)
  const nakladnye = trudozatraty * P.nakladnye / 100;                     // G64
  // Транспорт и командировки в смету НЕ входят по решению владельца (CALC-08):
  // расчёт всегда на стандартную деталь, покрываемую на площадке ООО «МультиКрит»,
  // без выездов и такелажа. Эти ограничения уходят в текстовые оговорки (см. ниже),
  // отдельной расчётной строкой не считаются — поэтому здесь честный 0, не флаг.
  const transport = 0;                                                    // G66
  const komandirovki = 0;                                                 // G68
  const obshchayaRabot = nakladnye + vspomMaterialy + trudozatraty
    + transport + komandirovki + sklad;                                    // G74
  const pribyl = (obshchayaRabot - komandirovki) * P.pribyl / 100;        // G75
  const rabotyItogo = obshchayaRabot + pribyl;                            // G77

  // ── Шаг 5. Итог (К87–90) ───────────────────────────────────────────────
  // Гарантия — ПОСЛЕ прибыли, от (работы + материалы) (камень 3).
  const garantiya = (rabotyItogo + materialy) * P.garantiya / 100;        // G87
  const bezNds = rabotyItogo + materialy + garantiya;                     // G88
  const nds = bezNds * P.nds / 100;                                       // G89 = 0 (УСН)
  const itogo = bezNds + nds;                                             // G90
  const perM2 = itogo / S;                                                // E36
  const perM2mm = perM2 / T;                                              // E37

  // ── Текстовые оговорки для показа в UI этапа 2 ─────────────────────────
  // CALC-07: деталь до 30 кг считается без грузоподъёмного оборудования —
  // отдельная расчётная строка НЕ добавляется, только текстовая оговорка.
  // CALC-08: фиксированные допущения расчёта.
  const ogovorki = [
    P.tekstOgovorki80kg,
    'Расчёт на 1 рабочий день и 1 специалиста-полимерщика.',
    'Без транспортных расходов, командировок и спецоснастки.',
  ];

  return {
    // входы (эхо)
    S, T, klass, coef,
    // материал
    massElastomer, cenaElastomer,
    stElastomer, stGruntPredv, stGruntOsn, stGruntRezina, stOchistitel,
    materialy,                                  // G86
    // труд построчно
    stDrobestruika, stObespylivanie, stPodgotovkaDo, stObezzhirivanie,
    stGruntPredvWork, stGruntOsnWork, rascNanesenie, stNanesenie, stPodgotovkaPosle,
    sumWorks, stITR, esn,
    trudozatraty,                               // G56
    // накрутки
    vspomMaterialy,                             // G62
    sklad, nakladnye, transport, komandirovki,
    pribyl,
    rabotyItogo,                                // G77
    garantiya,                                  // G87
    nds,
    // итоги
    itogo,                                      // G90
    perM2,                                      // E36
    perM2mm,                                    // E37
    ogovorki,
  };
}
