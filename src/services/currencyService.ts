/**
 * Currency service.
 *
 * Strategy for "support ALL currencies":
 *  - The Settings selector is populated from `Intl.supportedValuesOf('currency')`
 *    (Chromium WebView / modern browsers) merged with a bundled list of all ISO
 *    4217 country currencies, so every code (incl. TND) is always present.
 *  - Names & symbols are derived at runtime with `Intl.DisplayNames` and
 *    `Intl.NumberFormat`, so even rarely used currencies display correctly and
 *    match the device locale.
 *  - Default currency is detected from the device timezone (IANA → ISO 3166 →
 *    ISO 4217), which reflects the user's actual location even when the phone
 *    language differs (e.g. an English-language phone in Tunisia → TND). If the
 *    timezone can't be mapped, we fall back to the navigator.language region,
 *    then to TND (the app's historical default).
 *  - The user can override the currency in Settings; the choice is persisted
 *    under `csr_currency` in Preferences.
 */
import { getString, setItem, removeItem } from './preferencesService';

const CURRENCY_KEY = 'csr_currency';
export const FALLBACK_CURRENCY = 'TND';

/** Cached IP-geolocated currency (set once resolved; avoids refetching). */
let ipDetectedCurrency: string | null = null;

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

/**
 * IANA timezone → ISO 3166-1 alpha-2 region (best-effort mapping).
 * Used to detect the user's currency from their actual location instead of
 * their phone language. E.g. a phone set to English in Tunisia reports
 * `Africa/Tunis` → `TN` → TND, even though the UI language is English
 * (navigator.language `en-EN` would otherwise map to GBP). Zones not listed
 * here fall back to the navigator.language region detection.
 */
const TIMEZONE_REGION: Record<string, string> = {
  // Africa
  'Africa/Abidjan': 'CI', 'Africa/Accra': 'GH', 'Africa/Addis_Ababa': 'ET',
  'Africa/Algiers': 'DZ', 'Africa/Asmara': 'ER', 'Africa/Bamako': 'ML',
  'Africa/Bangui': 'CF', 'Africa/Banjul': 'GM', 'Africa/Bissau': 'GW',
  'Africa/Blantyre': 'MW', 'Africa/Brazzaville': 'CG', 'Africa/Bujumbura': 'BI',
  'Africa/Cairo': 'EG', 'Africa/Casablanca': 'MA', 'Africa/Ceuta': 'ES',
  'Africa/Conakry': 'GN', 'Africa/Dakar': 'SN', 'Africa/Dar_es_Salaam': 'TZ',
  'Africa/Djibouti': 'DJ', 'Africa/Douala': 'CM', 'Africa/El_Aaiun': 'EH',
  'Africa/Freetown': 'SL', 'Africa/Gaborone': 'BW', 'Africa/Harare': 'ZW',
  'Africa/Johannesburg': 'ZA', 'Africa/Juba': 'SS', 'Africa/Kampala': 'UG',
  'Africa/Khartoum': 'SD', 'Africa/Kigali': 'RW', 'Africa/Kinshasa': 'CD',
  'Africa/Lagos': 'NG', 'Africa/Libreville': 'GA', 'Africa/Lome': 'TG',
  'Africa/Luanda': 'AO', 'Africa/Lubumbashi': 'CD', 'Africa/Lusaka': 'ZM',
  'Africa/Malabo': 'GQ', 'Africa/Maputo': 'MZ', 'Africa/Maseru': 'LS',
  'Africa/Mbabane': 'SZ', 'Africa/Mogadishu': 'SO', 'Africa/Monrovia': 'LR',
  'Africa/Nairobi': 'KE', 'Africa/Ndjamena': 'TD', 'Africa/Niamey': 'NE',
  'Africa/Nouakchott': 'MR', 'Africa/Ouagadougou': 'BF', 'Africa/Porto-Novo': 'BJ',
  'Africa/Sao_Tome': 'ST', 'Africa/Tripoli': 'LY', 'Africa/Tunis': 'TN',
  'Africa/Windhoek': 'NA',
  // Asia
  'Asia/Aden': 'YE', 'Asia/Almaty': 'KZ', 'Asia/Amman': 'JO',
  'Asia/Anadyr': 'RU', 'Asia/Aqtau': 'KZ', 'Asia/Aqtobe': 'KZ',
  'Asia/Ashgabat': 'TM', 'Asia/Atyrau': 'KZ', 'Asia/Baghdad': 'IQ',
  'Asia/Bahrain': 'BH', 'Asia/Baku': 'AZ', 'Asia/Bangkok': 'TH',
  'Asia/Barnaul': 'RU', 'Asia/Beirut': 'LB', 'Asia/Bishkek': 'KG',
  'Asia/Brunei': 'BN', 'Asia/Calcutta': 'IN', 'Asia/Chita': 'RU',
  'Asia/Choibalsan': 'MN', 'Asia/Colombo': 'LK', 'Asia/Damascus': 'SY',
  'Asia/Dhaka': 'BD', 'Asia/Dili': 'TL', 'Asia/Dubai': 'AE',
  'Asia/Dushanbe': 'TJ', 'Asia/Famagusta': 'CY', 'Asia/Gaza': 'PS',
  'Asia/Hebron': 'PS', 'Asia/Hong_Kong': 'HK', 'Asia/Hovd': 'MN',
  'Asia/Irkutsk': 'RU', 'Asia/Jakarta': 'ID', 'Asia/Jayapura': 'ID',
  'Asia/Jerusalem': 'IL', 'Asia/Kabul': 'AF', 'Asia/Kamchatka': 'RU',
  'Asia/Karachi': 'PK', 'Asia/Katmandu': 'NP', 'Asia/Khandyga': 'RU',
  'Asia/Kolkata': 'IN', 'Asia/Krasnoyarsk': 'RU', 'Asia/Kuala_Lumpur': 'MY',
  'Asia/Kuching': 'MY', 'Asia/Kuwait': 'KW', 'Asia/Macau': 'MO',
  'Asia/Magadan': 'RU', 'Asia/Makassar': 'ID', 'Asia/Manila': 'PH',
  'Asia/Muscat': 'OM', 'Asia/Nicosia': 'CY', 'Asia/Novokuznetsk': 'RU',
  'Asia/Novosibirsk': 'RU', 'Asia/Omsk': 'RU', 'Asia/Oral': 'KZ',
  'Asia/Phnom_Penh': 'KH', 'Asia/Pontianak': 'ID', 'Asia/Pyongyang': 'KP',
  'Asia/Qatar': 'QA', 'Asia/Qostanay': 'KZ', 'Asia/Qyzylorda': 'KZ',
  'Asia/Rangoon': 'MM', 'Asia/Riyadh': 'SA', 'Asia/Saigon': 'VN',
  'Asia/Sakhalin': 'RU', 'Asia/Samarkand': 'UZ', 'Asia/Seoul': 'KR',
  'Asia/Shanghai': 'CN', 'Asia/Singapore': 'SG', 'Asia/Srednekolymsk': 'RU',
  'Asia/Taipei': 'TW', 'Asia/Tashkent': 'UZ', 'Asia/Tbilisi': 'GE',
  'Asia/Tehran': 'IR', 'Asia/Thimphu': 'BT', 'Asia/Tokyo': 'JP',
  'Asia/Tomsk': 'RU', 'Asia/Ulaanbaatar': 'MN', 'Asia/Urumqi': 'CN',
  'Asia/Ust-Nera': 'RU', 'Asia/Vientiane': 'LA', 'Asia/Vladivostok': 'RU',
  'Asia/Yakutsk': 'RU', 'Asia/Yangon': 'MM', 'Asia/Yekaterinburg': 'RU',
  'Asia/Yerevan': 'AM',
  // Europe
  'Europe/Amsterdam': 'NL', 'Europe/Andorra': 'AD', 'Europe/Astrakhan': 'RU',
  'Europe/Athens': 'GR', 'Europe/Belgrade': 'RS', 'Europe/Berlin': 'DE',
  'Europe/Bratislava': 'SK', 'Europe/Brussels': 'BE', 'Europe/Bucharest': 'RO',
  'Europe/Budapest': 'HU', 'Europe/Busingen': 'DE', 'Europe/Chisinau': 'MD',
  'Europe/Copenhagen': 'DK', 'Europe/Dublin': 'IE', 'Europe/Gibraltar': 'GI',
  'Europe/Guernsey': 'GG', 'Europe/Helsinki': 'FI', 'Europe/Isle_of_Man': 'IM',
  'Europe/Istanbul': 'TR', 'Europe/Jersey': 'JE', 'Europe/Kaliningrad': 'RU',
  'Europe/Kiev': 'UA', 'Europe/Kirov': 'RU', 'Europe/Lisbon': 'PT',
  'Europe/Ljubljana': 'SI', 'Europe/London': 'GB', 'Europe/Luxembourg': 'LU',
  'Europe/Madrid': 'ES', 'Europe/Malta': 'MT', 'Europe/Mariehamn': 'AX',
  'Europe/Minsk': 'BY', 'Europe/Monaco': 'MC', 'Europe/Moscow': 'RU',
  'Europe/Oslo': 'NO', 'Europe/Paris': 'FR', 'Europe/Podgorica': 'ME',
  'Europe/Prague': 'CZ', 'Europe/Riga': 'LV', 'Europe/Rome': 'IT',
  'Europe/Samara': 'RU', 'Europe/San_Marino': 'SM', 'Europe/Sarajevo': 'BA',
  'Europe/Saratov': 'RU', 'Europe/Simferopol': 'UA', 'Europe/Skopje': 'MK',
  'Europe/Sofia': 'BG', 'Europe/Stockholm': 'SE', 'Europe/Tallinn': 'EE',
  'Europe/Tirane': 'AL', 'Europe/Ulyanovsk': 'RU', 'Europe/Uzhgorod': 'UA',
  'Europe/Vaduz': 'LI', 'Europe/Vatican': 'VA', 'Europe/Vienna': 'AT',
  'Europe/Vilnius': 'LT', 'Europe/Volgograd': 'RU', 'Europe/Warsaw': 'PL',
  'Europe/Zagreb': 'HR', 'Europe/Zaporozhye': 'UA', 'Europe/Zurich': 'CH',
  // America
  'America/Adak': 'US', 'America/Anchorage': 'US', 'America/Anguilla': 'AI',
  'America/Antigua': 'AG', 'America/Araguaina': 'BR',
  'America/Argentina/Buenos_Aires': 'AR', 'America/Argentina/Catamarca': 'AR',
  'America/Argentina/Cordoba': 'AR', 'America/Argentina/Jujuy': 'AR',
  'America/Argentina/La_Rioja': 'AR', 'America/Argentina/Mendoza': 'AR',
  'America/Argentina/Rio_Gallegos': 'AR', 'America/Argentina/Salta': 'AR',
  'America/Argentina/San_Juan': 'AR', 'America/Argentina/San_Luis': 'AR',
  'America/Argentina/Tucuman': 'AR', 'America/Argentina/Ushuaia': 'AR',
  'America/Aruba': 'AW', 'America/Asuncion': 'PY', 'America/Atikokan': 'CA',
  'America/Bahia': 'BR', 'America/Bahia_Banderas': 'MX', 'America/Barbados': 'BB',
  'America/Belem': 'BR', 'America/Belize': 'BZ', 'America/Blanc-Sablon': 'CA',
  'America/Boa_Vista': 'BR', 'America/Bogota': 'CO', 'America/Boise': 'US',
  'America/Cambridge_Bay': 'CA', 'America/Campo_Grande': 'BR', 'America/Cancun': 'MX',
  'America/Caracas': 'VE', 'America/Cayenne': 'GF', 'America/Cayman': 'KY',
  'America/Chicago': 'US', 'America/Chihuahua': 'MX', 'America/Costa_Rica': 'CR',
  'America/Cuiaba': 'BR', 'America/Curacao': 'CW', 'America/Danmarkshavn': 'GL',
  'America/Dawson': 'CA', 'America/Dawson_Creek': 'CA', 'America/Denver': 'US',
  'America/Detroit': 'US', 'America/Dominica': 'DM', 'America/Edmonton': 'CA',
  'America/Eirunepe': 'BR', 'America/El_Salvador': 'SV', 'America/Fortaleza': 'BR',
  'America/Glace_Bay': 'CA', 'America/Godthab': 'GL', 'America/Goose_Bay': 'CA',
  'America/Grand_Turk': 'TC', 'America/Grenada': 'GD', 'America/Guadeloupe': 'GP',
  'America/Guatemala': 'GT', 'America/Guayaquil': 'EC', 'America/Guyana': 'GY',
  'America/Halifax': 'CA', 'America/Havana': 'CU', 'America/Hermosillo': 'MX',
  'America/Indiana/Indianapolis': 'US', 'America/Indiana/Knox': 'US',
  'America/Indiana/Marengo': 'US', 'America/Indiana/Petersburg': 'US',
  'America/Indiana/Tell_City': 'US', 'America/Indiana/Vevay': 'US',
  'America/Indiana/Vincennes': 'US', 'America/Indiana/Winamac': 'US',
  'America/Inuvik': 'CA', 'America/Iqaluit': 'CA', 'America/Jamaica': 'JM',
  'America/Juneau': 'US', 'America/Kentucky/Louisville': 'US',
  'America/Kentucky/Monticello': 'US', 'America/La_Paz': 'BO', 'America/Lima': 'PE',
  'America/Los_Angeles': 'US', 'America/Lower_Princes': 'SX', 'America/Maceio': 'BR',
  'America/Managua': 'NI', 'America/Manaus': 'BR', 'America/Marigot': 'MF',
  'America/Martinique': 'MQ', 'America/Matamoros': 'MX', 'America/Mazatlan': 'MX',
  'America/Menominee': 'US', 'America/Merida': 'MX', 'America/Metlakatla': 'US',
  'America/Mexico_City': 'MX', 'America/Miquelon': 'PM', 'America/Moncton': 'CA',
  'America/Monterrey': 'MX', 'America/Montevideo': 'UY', 'America/Montreal': 'CA',
  'America/Montserrat': 'MS', 'America/Nassau': 'BS', 'America/New_York': 'US',
  'America/Nipigon': 'CA', 'America/Nome': 'US', 'America/Noronha': 'BR',
  'America/North_Dakota/Beulah': 'US', 'America/North_Dakota/Center': 'US',
  'America/North_Dakota/New_Salem': 'US', 'America/Nuuk': 'GL', 'America/Ojinaga': 'MX',
  'America/Panama': 'PA', 'America/Pangnirtung': 'CA', 'America/Paramaribo': 'SR',
  'America/Phoenix': 'US', 'America/Port-au-Prince': 'HT', 'America/Port_of_Spain': 'TT',
  'America/Porto_Velho': 'BR', 'America/Puerto_Rico': 'PR', 'America/Punta_Arenas': 'CL',
  'America/Rainy_River': 'CA', 'America/Rankin_Inlet': 'CA', 'America/Recife': 'BR',
  'America/Regina': 'CA', 'America/Resolute': 'CA', 'America/Rio_Branco': 'BR',
  'America/Santarem': 'BR', 'America/Santiago': 'CL', 'America/Santo_Domingo': 'DO',
  'America/Sao_Paulo': 'BR', 'America/Scoresbysund': 'GL', 'America/Sitka': 'US',
  'America/St_Barthelemy': 'BL', 'America/St_Johns': 'CA', 'America/St_Kitts': 'KN',
  'America/St_Lucia': 'LC', 'America/St_Thomas': 'VI', 'America/St_Vincent': 'VC',
  'America/Swift_Current': 'CA', 'America/Tegucigalpa': 'HN', 'America/Thule': 'GL',
  'America/Thunder_Bay': 'CA', 'America/Tijuana': 'MX', 'America/Toronto': 'CA',
  'America/Tortola': 'VG', 'America/Vancouver': 'CA', 'America/Whitehorse': 'CA',
  'America/Winnipeg': 'CA', 'America/Yakutat': 'US', 'America/Yellowknife': 'CA',
  // Atlantic / Pacific / Indian / Arctic
  'Atlantic/Azores': 'PT', 'Atlantic/Bermuda': 'BM', 'Atlantic/Canary': 'ES',
  'Atlantic/Cape_Verde': 'CV', 'Atlantic/Faroe': 'FO', 'Atlantic/Madeira': 'PT',
  'Atlantic/Reykjavik': 'IS', 'Atlantic/South_Georgia': 'GS', 'Atlantic/St_Helena': 'SH',
  'Atlantic/Stanley': 'FK',
  'Pacific/Apia': 'WS', 'Pacific/Auckland': 'NZ', 'Pacific/Bougainville': 'PG',
  'Pacific/Chatham': 'NZ', 'Pacific/Chuuk': 'FM', 'Pacific/Easter': 'CL',
  'Pacific/Efate': 'VU', 'Pacific/Enderbury': 'KI', 'Pacific/Fakaofo': 'TK',
  'Pacific/Fiji': 'FJ', 'Pacific/Funafuti': 'TV', 'Pacific/Galapagos': 'EC',
  'Pacific/Gambier': 'PF', 'Pacific/Guadalcanal': 'SB', 'Pacific/Guam': 'GU',
  'Pacific/Honolulu': 'US', 'Pacific/Johnston': 'UM', 'Pacific/Kiritimati': 'KI',
  'Pacific/Kosrae': 'FM', 'Pacific/Kwajalein': 'MH', 'Pacific/Majuro': 'MH',
  'Pacific/Marquesas': 'PF', 'Pacific/Midway': 'UM', 'Pacific/Nauru': 'NR',
  'Pacific/Niue': 'NU', 'Pacific/Norfolk': 'NF', 'Pacific/Noumea': 'NC',
  'Pacific/Pago_Pago': 'AS', 'Pacific/Palau': 'PW', 'Pacific/Pitcairn': 'PN',
  'Pacific/Pohnpei': 'FM', 'Pacific/Port_Moresby': 'PG', 'Pacific/Rarotonga': 'CK',
  'Pacific/Saipan': 'MP', 'Pacific/Tahiti': 'PF', 'Pacific/Tarawa': 'KI',
  'Pacific/Tongatapu': 'TO', 'Pacific/Truk': 'FM', 'Pacific/Wake': 'UM',
  'Pacific/Wallis': 'WF',
  'Indian/Antananarivo': 'MG', 'Indian/Chagos': 'IO', 'Indian/Christmas': 'CX',
  'Indian/Cocos': 'CC', 'Indian/Comoro': 'KM', 'Indian/Kerguelen': 'TF',
  'Indian/Mahe': 'SC', 'Indian/Maldives': 'MV', 'Indian/Mauritius': 'MU',
  'Indian/Mayotte': 'YT', 'Indian/Reunion': 'RE',
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
  let runtime: string[] = [];
  try {
    const supported = (Intl as unknown as {
      supportedValuesOf?: (type: 'currency') => string[];
    }).supportedValuesOf?.('currency');
    if (Array.isArray(supported) && supported.length > 0) {
      runtime = supported;
    }
  } catch {
    // ignore and fall back
  }
  // Merge the runtime list with the full static ISO 4217 fallback so every
  // currency (including TND) is always present even if the WebView's ICU data
  // is partial or the supportedValuesOf API is missing.
  return Array.from(new Set([...runtime, ...ISO4217_FALLBACK]));
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

/** Detect the device's default currency from its location/timezone, then locale region. */
export function detectDeviceCurrency(): string {
  // 0. IP-geolocated currency (if already resolved) takes priority.
  if (ipDetectedCurrency) return ipDetectedCurrency;
  // 1. Best signal: IANA timezone → region → currency. This picks up the user's
  //    actual location (e.g. Africa/Tunis → TN → TND) even when the phone UI
  //    language is English (which would otherwise map to GBP).
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      const region = TIMEZONE_REGION[tz];
      if (region) {
        const mapped = REGION_CURRENCY[region];
        if (mapped) return mapped;
      }
    }
  } catch {
    // ignore and fall back to locale detection
  }
  // 2. Fallback: navigator.language region (e.g. en-US → USD)
  const locale = getDeviceLocale();
  const regionMatch = locale.match(/[-_]([A-Za-z]{2})$/);
  if (regionMatch) {
    const region = regionMatch[1].toUpperCase();
    const mapped = REGION_CURRENCY[region];
    if (mapped) return mapped;
  }
  return FALLBACK_CURRENCY;
}

/**
 * IP geolocation => currency (https://ipwho.is). Returns null on failure.
 */
export async function detectCurrencyFromIP(): Promise<string | null> {
  if (ipDetectedCurrency) return ipDetectedCurrency;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://ipwho.is', {signal: controller.signal});
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const code = data && data.country_code ? String(data.country_code).toUpperCase() : '';
    if (!code) return null;
    const mapped = REGION_CURRENCY[code] || null;
    if (mapped) ipDetectedCurrency = mapped;
    return mapped;
  } catch {
    return null;
  }
}

/**
 * IP geolocation, then sync timezone/locale detection.
 */
export async function detectDeviceCurrencyAsync(): Promise<string> {
  const ip = await detectCurrencyFromIP();
  return ip || detectDeviceCurrency();
}

/**
 * Persist code as default only when the user hasn't chosen one.
 */
export function persistDefaultIfUnset(code: string): boolean {
  const saved = getString(CURRENCY_KEY);
  if (saved) return false;
  setItem(CURRENCY_KEY, code);
  return true;
}

/**
 * Kick off IP detection on app start (cache + persist default when unset).
 */
export function primeCurrencyDetection(): void {
  detectCurrencyFromIP().then(code => {
    if (code) persistDefaultIfUnset(code);
  });
}

/** Currently active currency code: saved preference, else detected device default. */
export function getCurrency(): string {
  const saved = getString(CURRENCY_KEY);
  if (saved) return saved;
  return detectDeviceCurrency();
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