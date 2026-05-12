/**
 * X (Twitter) configuration for the home hero card.
 *
 * The X spot on the home page is the primary follower funnel while
 * the audience is still small. Update the pinned thread to whichever
 * post you want every new visitor to land on.
 */

export const xHandle = "ashutoshrana_20";
export const xProfileUrl = `https://x.com/${xHandle}`;

/**
 * X's "follow" intent URL. Lands the visitor on the follow dialog
 * if they're logged in, profile page otherwise. One click flow.
 */
export const xFollowUrl = `https://x.com/intent/follow?screen_name=${xHandle}`;

/**
 * Optional pinned / featured thread shown as a secondary link on the
 * home X card. Set to `null` if there's nothing to feature yet.
 */
export const xFeaturedThread: { title: string; url: string } | null = null;
// Example, fill in once you have a flagship thread:
// export const xFeaturedThread = {
//   title: "Why 0.1 + 0.2 isn't 0.3 (8-tweet thread)",
//   url: "https://x.com/ashutoshrana_20/status/1234567890",
// };
