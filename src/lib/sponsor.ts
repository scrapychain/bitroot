export type Sponsor = {
  /** Sponsor brand name as displayed on the card. */
  name: string;
  /** One-line description (2-3 short sentences max). */
  tagline: string;
  /** Where the card links to. */
  url: string;
  /** Button text. Defaults to "Visit". */
  cta?: string;
};

/**
 * Current active sponsor.
 *
 * Set to `null` while the slot is open. The empty state on the home
 * page then doubles as a sales pitch ("Available, get in touch →").
 *
 * Filling this in is the only edit needed to swap sponsors.
 */
export const currentSponsor: Sponsor | null = null;

/**
 * Where prospective sponsors should reach out.
 */
export const sponsorContactUrl = "https://x.com/ashutoshrana_20";
