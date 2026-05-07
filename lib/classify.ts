// Entry-level classification rules.
// Hard requirement: "Software Engineer II" must classify as entry-level.
// We apply EXCLUDE first because "Senior Software Engineer II" should still be
// senior — but we test exclude with word boundaries, and the include list has
// /\bII\b/ which matches "Software Engineer II" but exclude wins on senior.

import type { JobLevel } from "./types";

export const ENTRY_INCLUDE_REGEXES: RegExp[] = [
  /\bI\b/,
  /\bII\b/,
  /associate/i,
  /\bjr\b/i,
  /junior/i,
  /new grad/i,
  /university/i,
  /early career/i,
  /entry.?level/i,
  /intern/i,
  /apprentice/i,
];

export const ENTRY_EXCLUDE_REGEXES: RegExp[] = [
  /\bIII\b/,
  /\bIV\b/,
  /\bV\b/,
  /senior/i,
  /\bsr\b/i,
  /staff/i,
  /principal/i,
  /lead/i,
  /manager/i,
  /director/i,
  /head of/i,
  /\bvp\b/i,
  /vice president/i,
  /distinguished/i,
];

export function classifyLevel(title: string): JobLevel {
  if (!title) return "unknown";
  const excluded = ENTRY_EXCLUDE_REGEXES.some((r) => r.test(title));
  if (excluded) return "senior";
  const included = ENTRY_INCLUDE_REGEXES.some((r) => r.test(title));
  if (included) return "entry";
  return "unknown";
}

export function isEntryLevel(title: string): boolean {
  return classifyLevel(title) === "entry";
}
