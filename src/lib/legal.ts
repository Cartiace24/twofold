/**
 * Twofold legal versions — single source of truth.
 * Bump these when the documents change so acceptance can be re-collected.
 */
export const TERMS_VERSION = "1.0" as const;
export const PRIVACY_VERSION = "1.0" as const;
export const GUIDELINES_VERSION = "1.0" as const;

/** Last updated date shown on the pages (Philippine time). */
export const LEGAL_LAST_UPDATED = "September 20, 2026";

/**
 * Placeholders — replace when the real operator details are known.
 * Never invent a company, address, or email; leave as placeholder.
 */
export const LEGAL_PLACEHOLDERS = {
  BUSINESS_NAME: "[LEGAL NAME / BUSINESS NAME]",
  BUSINESS_ADDRESS: "[PHILIPPINE BUSINESS ADDRESS]",
  CONTACT_EMAIL: "[CONTACT EMAIL]",
  PRIVACY_EMAIL: "[PRIVACY EMAIL]",
  LEGAL_EMAIL: "[LEGAL EMAIL]",
} as const;
