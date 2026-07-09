/**
 * Build the GitHub release URL for a specific `@ngrok/mantle` version tag.
 *
 * @example
 * releaseHref("0.69.0")
 * // "https://github.com/ngrok-oss/mantle/releases/tag/%40ngrok%2Fmantle%400.69.0"
 */
export function releaseHref(version: string): string {
	return `https://github.com/ngrok-oss/mantle/releases/tag/${encodeURIComponent(`@ngrok/mantle@${version}`)}`;
}
