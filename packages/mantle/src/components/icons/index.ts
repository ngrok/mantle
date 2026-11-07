/**
 * Re-exports for the Icons component — the ngrok-specific icons that
 * `@phosphor-icons/react` does not ship.
 *
 * @useWhen Show an ngrok glyph that `@phosphor-icons/react` does not ship, such as the ngrok
 * wordmark or the icon for a traffic policy file.
 *
 * @siblings
 * - `Icon`: the glyph comes from `@phosphor-icons/react`.
 *
 * @see https://mantle.ngrok.com/components/data-display/icons
 */

export { SortIcon } from "./sort.js";
export { TrafficPolicyFileIcon } from "./traffic-policy-file.js";
export {
	//,
	AutoThemeIcon,
	ThemeIcon,
} from "./theme.js";
export {
	//,
	NgrokWordmarkIcon,
	NgrokLettermarkIcon,
} from "./ngrok.js";
export type { InlineIconProps } from "./types.js";
