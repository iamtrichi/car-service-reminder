/**
 * Currency service.
 *
 * Strategy for "support ALL currencies":
 *  - The Settings selector is populated from `Intl.supportedValuesOf('currency')`
 *    (Chromium WebView / modern browsers) which returns every ISO 4217 currency
 *    the runtime supports natively. If that API is missing, we fall back to a
 *    bundled list of all ISO 4217 country currencies.
 *  - Names & symbols are derived at runtime with `Intl.DisplayNames` and
 *    `Intl.NumberFormat`, so even rarely used currencies display correctly and
 *    match the device locale.
 *  - Default currency is detected from the device locale region (via
 *    navigator.language) using a full ISO 3166 → ISO 4217 mapping. When the
 *    region can't be resolved, we fall back to TND (the app's historical default).
 *  - The user can override the currency in Settings; the choice is persisted
 *    under `csr_currency` in Preferences.
 */
import { getString, setItem, removeItem } from './preferencesService';

const CURRENCY_KEY = 'csr_currency';
export const FALLBACK_CURRENCY = 'TND';

/** All ISO 4217 country currencies (used when Intl.supportedValuesOf is missing). */
const ISO4217_FALLBACK = [
  'AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN',
  'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL',
  'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHF', 'CLP', 'CNY',
  'COP', 'CRC', 'CUC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD',
  'EGP', 'ERN', 'ETB', 'EUR', 'FJD', 'FKP', 'GBP', 'GEL', 'GHS', 'GIP',
  'GMD', 'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HTG', 'HUF', 'IDR', 'ILS',
  'INR', 'IQD', 'IRR', 'ISK', 'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR',
  'KMF', 'KPW', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR', 'LRD',
  'LSL', 'LYD', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MRU',
  'MUR', 'MVR', 'MWK', 'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK',
  'NPR', 'NZD', 'OMR', 'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG',
  'QAR', 'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK',
  'SGD', 'SHP', 'SLE', 'SOS', 'SRD', 'SSP', 'STN', 'SVC', 'SYP', 'SZL',
  'THB', 'TJS', 'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH',
  'UGX', 'USD', 'UYU', 'UZS', 'VED', 'VES', 'VND', 'VUV', 'WST', 'XAF',
  'XCD', 'XOF', 'XPF', 'YER', 'ZAR', 'ZMW', 'ZWL',
];
/** ISO 3166-1 alpha-2 region → ISO 4217 currency code (complete map). */
const REGION_CURRENCY: Record<string, string> = {
  AD: 'EUR', AE: 'AED', AF: 'AFN', AG: 'XCD', AI: 'XCD', AL: 'ALL',
  AM: 'AMD', AO: 'AOA', AR: 'ARS', AS: 'USD', AT: 'EUR', AU: 'AUD',
  AW: 'AWG', AX: 'EUR', AZ: 'AZN', BA: 'BAM', BB: 'BBD', BD: 'BDT',
  BE: 'EUR', BF: 'XOF', BG: 'BGN', BH: 'BHD', BI: 'BIF', BJ: 'XOF',
  BL: 'EUR', BM: 'BMD', BN: 'BND', BO: 'BOB', BQ: 'USD', BR: 'BRL',
  BS: 'BSD', BT: 'BTN', BV: 'NOK', BW: 'BWP', BY: 'BYN', BZ: 'BZD',
  CA: 'CAD', CC: 'AUD', CD: 'CDF', CF: 'XAF', CG: 'XAF', CH: 'CHF',
  CI: 'XOF', CK: 'NZD', CL: 'CLP', CM: 'XAF', CN: 'CNY', CO: 'COP',
  CR: 'CRC', CU: 'CUP', CV: 'CVE', CW: 'ANG', CX: 'AUD', CY: 'EUR',
  CZ: 'CZK', DE: 'EUR', DJ: 'DJF', DK: 'DKK', DM: 'XCD', DO: 'DOP',
  DZ: 'DZD', EC: 'USD', EE: 'EUR', EG: 'EGP', EH: 'MAD', ER: 'ERN',
  ES: 'EUR', ET: 'ETB', FI: 'EUR', FJ: 'FJD', FK: 'FKP', FM: 'USD',
  FO: 'DKK', FR: 'EUR', GA: 'XAF', GB: 'GBP', GD: 'XCD', GE: 'GEL',
  GF: 'EUR', GG: 'GBP', GH: 'GHS', GI: 'GIP', GL: 'DKK', GM: 'GMD',
  GN: 'GNF', GP: 'EUR', GQ: 'XAF', GR: 'EUR', GS: 'GBP', GT: 'GTQ',
  GU: 'USD', GW: 'XOF', GY: 'GYD', HK: 'HKD', HM: 'AUD', HN: 'HNL',
  HR: 'EUR', HT: 'HTG', HU: 'HUF', ID: 'IDR', IE: 'EUR', IL: 'ILS',
  IM: 'GBP', IN: 'INR', IO: 'USD', IQ: 'IQD', IR: 'IRR', IS: 'ISK',
  IT: 'EUR', JE: 'GBP', JM: 'JMD', JO: 'JOD', JP: 'JPY', KE: 'KES',
  KG: 'KGS', KH: 'KHR', KI: 'AUD', KM: 'KMF', KN: 'XCD', KP: 'KPW',
  KR: 'KRW', KW: 'KWD', KY: 'KYD', KZ: 'KZT', LA: 'LAK', LB: 'LBP',
  LC: 'XCD', LI: 'CHF', LK: 'LKR', LR: 'LRD', LS: 'LSL', LT: 'EUR',
  LU: 'EUR', LV: 'EUR', LY: 'LYD', MA: 'MAD', MC: 'EUR', MD: 'MDL',
  ME: 'EUR', MF: 'EUR', MG: 'MGA', MH: 'USD', MK: 'MKD', ML: 'XOF',
  MM: 'MMK', MN: 'MNT', MO: 'MOP', MP: 'USD', MQ: 'EUR', MR: 'MRU',
  MS: 'XCD', MT: 'EUR', MU: 'MUR', MV: 'MVR', MW: 'MWK', MX: 'MXN',
  MY: 'MYR', MZ: 'MZN', NA: 'NAD', NC: 'XPF', NE: 'XOF', NF: 'AUD',
  NG: 'NGN', NI: 'NIO', NL: 'EUR', NO: 'NOK', NP: 'NPR', NR: 'AUD',
  NU: 'NZD', NZ: 'NZD', OM: 'OMR', PA: 'PAB', PE: 'PEN', PF: 'XPF',
  PG: 'PGK', PH: 'PHP', PK: 'PKR', PL: 'PLN', PM: 'EUR', PN: 'NZD',
  PR: 'USD', PS: 'ILS', PT: 'EUR', PW: 'USD', PY: 'PYG', QA: 'QAR',
  RE: 'EUR', RO: 'RON', RS: 'RSD', RU: 'RUB', RW: 'RWF', SA: 'SAR',
  SB: 'SBD', SC: 'SCR', SD: 'SDG', SE: 'SEK', SG: 'SGD', SH: 'SHP',
  SI: 'EUR', SJ: 'NOK', SK: 'EUR', SL: 'SLE', SM: 'EUR', SN: 'XOF',
  SO: 'SOS', SR: 'SRD', SS: 'SSP', ST: 'STN', SV: 'USD', SX: 'ANG',
  SY: 'SYP', SZ: 'SZL', TC: 'USD', TD: 'XAF', TF: 'EUR', TG: 'XOF',
  TH: 'THB', TJ: 'TJS', TK: 'NZD', TL: 'USD', TM: 'TMT', TN: 'TND',
  TO: 'TOP', TR: 'TRY', TT: 'TTD', TV: 'AUD', TW: 'TWD', TZ: 'TZS',
  UA: 'UAH', UG: 'UGX', UM: 'USD', US: 'USD', UY: 'UYU', UZ: 'UZS',
  VA: 'EUR', VC: 'XCD', VE: 'VES', VG: 'USD', VI: 'USD', VN: 'VND',
  VU: 'VUV', WF: 'XPF', WS: 'WST', YE: 'YER', YT: 'EUR', ZA: 'ZAR',
  ZM: 'ZMW', ZW: 'ZWL',
};
export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
}

/** Locale currently used for formatting (device locale). */
export function getDeviceLocale(): string {
  return (typeof navigator !== 'undefined' && navigator.language) || 'en';
}

/** Runtime-supported currency codes (Intl.supportedValuesOf) with static fallback. */
export function getSupportedCurrencyCodes(): string[] {
  try {
    const supported = (Intl as unknown as {
      supportedValuesOf?: (type: 'currency') => string[];
    }).supportedValuesOf?.('currency');
    if (Array.isArray(supported) && supported.length > 0) {
      return supported;
    }
  } catch {
    // ignore and fall back
  }
  return ISO4217_FALLBACK;
}

/** Localized name + symbol for a currency code. */
export function getCurrencyInfo(code: string): CurrencyInfo {
  const locale = getDeviceLocale();
  let name = code;
  let symbol = code;
  try {
    if (typeof Intl.DisplayNames !== 'undefined') {
      name = new Intl.DisplayNames([locale, 'en'], { type: 'currency' }).of(code) || code;
    }
  } catch {
    name = code;
  }
  try {
    symbol = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0).find(p => p.type === 'currency')?.value || code;
  } catch {
    symbol = code;
  }
  return { code, name, symbol };
}

/** All supported currencies with localized names/symbols, sorted by code. */
export function getSupportedCurrencies(): CurrencyInfo[] {
  return getSupportedCurrencyCodes()
    .map(code => getCurrencyInfo(code))
    .sort((a, b) => a.code.localeCompare(b.code));
}

/** Detect the device's default currency from its locale region. */
export function detectDeviceCurrency(): string {
  const locale = getDeviceLocale();
  const regionMatch = locale.match(/[-_]([A-Za-z]{2})$/);
  if (regionMatch) {
    const region = regionMatch[1].toUpperCase();
    const mapped = REGION_CURRENCY[region];
    if (mapped) return mapped;
  }
  return FALLBACK_CURRENCY;
}

/** Currently active currency code: saved preference, else detected device default. */
export function getCurrency(): string {
  const saved = getString(CURRENCY_KEY);
  if (saved) return saved;
  const detected = detectDeviceCurrency();
  // Persist the detected default so it stays stable across sessions
  setItem(CURRENCY_KEY, detected);
  return detected;
}

export function setCurrency(code: string): void {
  setItem(CURRENCY_KEY, code);
}

export function resetCurrency(): void {
  removeItem(CURRENCY_KEY);
}

/** Format an amount in the active currency using the device locale. */
export function formatCurrency(amount: number): string {
  const currency = getCurrency();
  try {
    return new Intl.NumberFormat(getDeviceLocale(), {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    return `${amount || 0} ${currency}`;
  }
}

/** Short symbol/abbreviation for the active currency (for labels/chips). */
export function getCurrencySymbol(): string {
  return getCurrencyInfo(getCurrency()).symbol;
}