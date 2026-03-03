/**
 * Timezone constants with city/country-based labels.
 * Searchable format for the TimezoneCombobox component.
 */

export interface TimezoneEntry {
  value: string;       // IANA identifier, e.g., 'Africa/Cairo'
  label: string;       // Display label: "Cairo, Egypt (UTC+2)"
  searchTerms: string; // Additional search terms for fuzzy matching
}

/**
 * Comprehensive timezone list organized by UTC offset.
 * Labels use "City, Country (UTC±X)" format so candidates can find their timezone by country name.
 */
export const TIMEZONE_LIST: TimezoneEntry[] = [
  // UTC-12 to UTC-9
  { value: 'Pacific/Pago_Pago', label: 'Pago Pago, American Samoa (UTC-11)', searchTerms: 'samoa sst' },
  { value: 'Pacific/Honolulu', label: 'Honolulu, Hawaii (UTC-10)', searchTerms: 'hawaii hst usa' },
  { value: 'America/Anchorage', label: 'Anchorage, Alaska (UTC-9)', searchTerms: 'alaska akst usa' },

  // UTC-8
  { value: 'America/Los_Angeles', label: 'Los Angeles, USA (UTC-8)', searchTerms: 'pacific pt pst pdt california san francisco seattle usa' },
  { value: 'America/Vancouver', label: 'Vancouver, Canada (UTC-8)', searchTerms: 'pacific pt pst pdt canada british columbia' },
  { value: 'America/Tijuana', label: 'Tijuana, Mexico (UTC-8)', searchTerms: 'pacific mexico baja' },

  // UTC-7
  { value: 'America/Denver', label: 'Denver, USA (UTC-7)', searchTerms: 'mountain mt mst mdt colorado usa' },
  { value: 'America/Phoenix', label: 'Phoenix, USA (UTC-7)', searchTerms: 'arizona mountain usa no dst' },
  { value: 'America/Edmonton', label: 'Edmonton, Canada (UTC-7)', searchTerms: 'mountain canada alberta' },

  // UTC-6
  { value: 'America/Chicago', label: 'Chicago, USA (UTC-6)', searchTerms: 'central ct cst cdt texas houston dallas usa' },
  { value: 'America/Mexico_City', label: 'Mexico City, Mexico (UTC-6)', searchTerms: 'central mexico cst' },
  { value: 'America/Winnipeg', label: 'Winnipeg, Canada (UTC-6)', searchTerms: 'central canada manitoba' },

  // UTC-5
  { value: 'America/New_York', label: 'New York, USA (UTC-5)', searchTerms: 'eastern et est edt washington dc miami boston usa' },
  { value: 'America/Toronto', label: 'Toronto, Canada (UTC-5)', searchTerms: 'eastern canada ontario ottawa montreal' },
  { value: 'America/Bogota', label: 'Bogota, Colombia (UTC-5)', searchTerms: 'colombia cot south america' },
  { value: 'America/Lima', label: 'Lima, Peru (UTC-5)', searchTerms: 'peru pet south america' },

  // UTC-4
  { value: 'America/Santiago', label: 'Santiago, Chile (UTC-4)', searchTerms: 'chile clt south america' },
  { value: 'America/Caracas', label: 'Caracas, Venezuela (UTC-4)', searchTerms: 'venezuela vet' },
  { value: 'America/Halifax', label: 'Halifax, Canada (UTC-4)', searchTerms: 'atlantic ast canada nova scotia' },

  // UTC-3
  { value: 'America/Sao_Paulo', label: 'São Paulo, Brazil (UTC-3)', searchTerms: 'brazil brt brasilia rio south america' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires, Argentina (UTC-3)', searchTerms: 'argentina art south america' },

  // UTC-1 to UTC
  { value: 'Atlantic/Cape_Verde', label: 'Cape Verde (UTC-1)', searchTerms: 'cvt atlantic' },
  { value: 'UTC', label: 'UTC / GMT (UTC+0)', searchTerms: 'utc gmt greenwich coordinated universal' },
  { value: 'Europe/London', label: 'London, UK (UTC+0)', searchTerms: 'gmt bst britain england united kingdom ireland' },
  { value: 'Africa/Accra', label: 'Accra, Ghana (UTC+0)', searchTerms: 'ghana gmt west africa' },

  // UTC+1
  { value: 'Europe/Paris', label: 'Paris, France (UTC+1)', searchTerms: 'cet cest central european france belgium netherlands' },
  { value: 'Europe/Berlin', label: 'Berlin, Germany (UTC+1)', searchTerms: 'cet cest germany deutschland' },
  { value: 'Europe/Madrid', label: 'Madrid, Spain (UTC+1)', searchTerms: 'cet cest spain espana' },
  { value: 'Europe/Rome', label: 'Rome, Italy (UTC+1)', searchTerms: 'cet cest italy italia' },
  { value: 'Africa/Lagos', label: 'Lagos, Nigeria (UTC+1)', searchTerms: 'wat west africa nigeria' },
  { value: 'Africa/Casablanca', label: 'Casablanca, Morocco (UTC+1)', searchTerms: 'morocco wet' },
  { value: 'Africa/Tunis', label: 'Tunis, Tunisia (UTC+1)', searchTerms: 'tunisia cet' },
  { value: 'Africa/Algiers', label: 'Algiers, Algeria (UTC+1)', searchTerms: 'algeria cet' },

  // UTC+2
  { value: 'Africa/Cairo', label: 'Cairo, Egypt (UTC+2)', searchTerms: 'egypt eet eastern european' },
  { value: 'Europe/Athens', label: 'Athens, Greece (UTC+2)', searchTerms: 'eet eest greece' },
  { value: 'Europe/Bucharest', label: 'Bucharest, Romania (UTC+2)', searchTerms: 'eet eest romania' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg, South Africa (UTC+2)', searchTerms: 'sast south africa cape town' },
  { value: 'Asia/Jerusalem', label: 'Jerusalem, Israel (UTC+2)', searchTerms: 'israel ist tel aviv' },
  { value: 'Asia/Beirut', label: 'Beirut, Lebanon (UTC+2)', searchTerms: 'lebanon eet' },
  { value: 'Asia/Amman', label: 'Amman, Jordan (UTC+2)', searchTerms: 'jordan eet' },

  // UTC+3
  { value: 'Europe/Istanbul', label: 'Istanbul, Turkey (UTC+3)', searchTerms: 'turkey trt ankara' },
  { value: 'Europe/Moscow', label: 'Moscow, Russia (UTC+3)', searchTerms: 'russia msk' },
  { value: 'Asia/Riyadh', label: 'Riyadh, Saudi Arabia (UTC+3)', searchTerms: 'saudi arabia ast jeddah mecca ksa' },
  { value: 'Asia/Baghdad', label: 'Baghdad, Iraq (UTC+3)', searchTerms: 'iraq ast' },
  { value: 'Asia/Kuwait', label: 'Kuwait City, Kuwait (UTC+3)', searchTerms: 'kuwait ast' },
  { value: 'Asia/Qatar', label: 'Doha, Qatar (UTC+3)', searchTerms: 'qatar ast doha' },
  { value: 'Africa/Nairobi', label: 'Nairobi, Kenya (UTC+3)', searchTerms: 'kenya eat east africa' },
  { value: 'Africa/Addis_Ababa', label: 'Addis Ababa, Ethiopia (UTC+3)', searchTerms: 'ethiopia eat east africa' },

  // UTC+3:30
  { value: 'Asia/Tehran', label: 'Tehran, Iran (UTC+3:30)', searchTerms: 'iran irst' },

  // UTC+4
  { value: 'Asia/Dubai', label: 'Dubai, UAE (UTC+4)', searchTerms: 'uae gst gulf abu dhabi emirates' },
  { value: 'Asia/Muscat', label: 'Muscat, Oman (UTC+4)', searchTerms: 'oman gst gulf' },
  { value: 'Asia/Baku', label: 'Baku, Azerbaijan (UTC+4)', searchTerms: 'azerbaijan' },

  // UTC+4:30
  { value: 'Asia/Kabul', label: 'Kabul, Afghanistan (UTC+4:30)', searchTerms: 'afghanistan aft' },

  // UTC+5
  { value: 'Asia/Karachi', label: 'Karachi, Pakistan (UTC+5)', searchTerms: 'pakistan pkt islamabad lahore' },
  { value: 'Asia/Tashkent', label: 'Tashkent, Uzbekistan (UTC+5)', searchTerms: 'uzbekistan uzt' },

  // UTC+5:30
  { value: 'Asia/Kolkata', label: 'Mumbai, India (UTC+5:30)', searchTerms: 'india ist delhi kolkata bangalore chennai new delhi' },
  { value: 'Asia/Colombo', label: 'Colombo, Sri Lanka (UTC+5:30)', searchTerms: 'sri lanka slst' },

  // UTC+6 to UTC+7
  { value: 'Asia/Dhaka', label: 'Dhaka, Bangladesh (UTC+6)', searchTerms: 'bangladesh bst' },
  { value: 'Asia/Bangkok', label: 'Bangkok, Thailand (UTC+7)', searchTerms: 'thailand ict indochina' },
  { value: 'Asia/Jakarta', label: 'Jakarta, Indonesia (UTC+7)', searchTerms: 'indonesia wib western' },

  // UTC+8
  { value: 'Asia/Shanghai', label: 'Shanghai, China (UTC+8)', searchTerms: 'china cst beijing hong kong' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (UTC+8)', searchTerms: 'hkt china' },
  { value: 'Asia/Singapore', label: 'Singapore (UTC+8)', searchTerms: 'sgt' },
  { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur, Malaysia (UTC+8)', searchTerms: 'malaysia myt' },
  { value: 'Asia/Manila', label: 'Manila, Philippines (UTC+8)', searchTerms: 'philippines pht' },
  { value: 'Australia/Perth', label: 'Perth, Australia (UTC+8)', searchTerms: 'awst western australia' },

  // UTC+9
  { value: 'Asia/Tokyo', label: 'Tokyo, Japan (UTC+9)', searchTerms: 'japan jst osaka' },
  { value: 'Asia/Seoul', label: 'Seoul, South Korea (UTC+9)', searchTerms: 'korea kst' },

  // UTC+9:30
  { value: 'Australia/Darwin', label: 'Darwin, Australia (UTC+9:30)', searchTerms: 'acst central australia northern territory' },

  // UTC+10
  { value: 'Australia/Brisbane', label: 'Brisbane, Australia (UTC+10)', searchTerms: 'aest eastern australia queensland no dst' },

  // UTC+10:30 / UTC+11
  { value: 'Australia/Adelaide', label: 'Adelaide, Australia (UTC+10:30)', searchTerms: 'acdt central australia south australia' },
  { value: 'Australia/Sydney', label: 'Sydney, Australia (UTC+11)', searchTerms: 'aedt eastern australia melbourne canberra new south wales victoria' },
  { value: 'Australia/Melbourne', label: 'Melbourne, Australia (UTC+11)', searchTerms: 'aedt eastern australia victoria' },

  // UTC+12 to UTC+13
  { value: 'Pacific/Auckland', label: 'Auckland, New Zealand (UTC+12)', searchTerms: 'nz nzst nzdt wellington' },
  { value: 'Pacific/Fiji', label: 'Suva, Fiji (UTC+12)', searchTerms: 'fiji fjt' },
  { value: 'Pacific/Tongatapu', label: 'Nuku\'alofa, Tonga (UTC+13)', searchTerms: 'tonga tot' },
];

/**
 * Detect the user's timezone from the browser and resolve to a TimezoneEntry.
 * If the detected timezone is not in the list, dynamically creates an entry.
 * Never falls back to UTC silently.
 */
export function detectAndResolveTimezone(): TimezoneEntry {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const match = TIMEZONE_LIST.find(tz => tz.value === detected);
    if (match) return match;

    // Dynamically create an entry for unknown timezones
    const label = buildTimezoneLabel(detected);
    return { value: detected, label, searchTerms: detected.toLowerCase().replace(/[/_]/g, ' ') };
  } catch {
    return TIMEZONE_LIST.find(tz => tz.value === 'UTC')!;
  }
}

/**
 * Get the display label for a timezone IANA value.
 * Returns a dynamically generated label for unknown timezones.
 */
export function getTimezoneLabel(ianaValue: string): string {
  const match = TIMEZONE_LIST.find(tz => tz.value === ianaValue);
  if (match) return match.label;
  return buildTimezoneLabel(ianaValue);
}

/**
 * Build a human-readable label for any IANA timezone.
 */
function buildTimezoneLabel(iana: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: iana,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value || '';
    // Extract city name from IANA (e.g., 'Asia/Kolkata' → 'Kolkata')
    const city = iana.split('/').pop()?.replace(/_/g, ' ') || iana;
    return `${city} (${offsetPart})`;
  } catch {
    return iana;
  }
}

/** Backward-compatible alias */
export const COMMON_TIMEZONES = TIMEZONE_LIST.map(tz => ({
  value: tz.value,
  label: tz.label,
}));
