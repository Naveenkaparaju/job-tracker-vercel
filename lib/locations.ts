// US-only filter. India is removed from all pages and APIs.
// Workday locations are free-form strings, so we use heuristic regexes.

const NON_US_TOKENS: RegExp[] = [
  /\bindia\b/i,
  /bangalore/i,
  /bengaluru/i,
  /hyderabad/i,
  /chennai/i,
  /pune/i,
  /gurgaon/i,
  /gurugram/i,
  /noida/i,
  /mumbai/i,
  /delhi/i,
  /\bcanada\b/i,
  /toronto/i,
  /\bontario\b/i,
  /vancouver/i,
  /\buk\b/i,
  /united kingdom/i,
  /london/i,
  /\bireland\b/i,
  /dublin/i,
  /\bgermany\b/i,
  /berlin/i,
  /munich/i,
  /\bfrance\b/i,
  /\bparis\b/i,
  /\bspain\b/i,
  /madrid/i,
  /barcelona/i,
  /\bchina\b/i,
  /shanghai/i,
  /beijing/i,
  /\bjapan\b/i,
  /tokyo/i,
  /singapore/i,
  /\baustralia\b/i,
  /sydney/i,
  /melbourne/i,
  /\bmexico\b/i,
  /\bbrazil\b/i,
  /\bisrael\b/i,
  /tel aviv/i,
  /\bphilippines\b/i,
  /manila/i,
  /\bvietnam\b/i,
];

const US_HINTS: RegExp[] = [
  /,\s*[A-Z]{2}(\s|$|\d)/, // ", CA " style
  /\bUSA\b/,
  /\bU\.S\.A?\.?\b/,
  /united states/i,
  /\bremote\b.*\bus\b/i,
  /\bus[-\s]remote\b/i,
];

export function isUsLocation(location: string | undefined | null): boolean {
  if (!location) return false;
  const loc = location.trim();
  if (!loc) return false;
  if (NON_US_TOKENS.some((r) => r.test(loc))) return false;
  if (US_HINTS.some((r) => r.test(loc))) return true;
  // Be permissive for Workday "primary location" strings that often look like
  // "Bentonville, AR" with no country suffix. The 2-letter state regex above
  // already handles those. Otherwise default to false.
  return false;
}
