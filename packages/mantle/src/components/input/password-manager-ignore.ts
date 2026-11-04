/**
 * Attributes that tell 1Password, Bitwarden, Dashlane, LastPass, and Proton
 * Pass to skip an input: no badge, no fill, no save prompt. Spread them on an
 * input that is not a credential, such as a search or filter box.
 *
 * Do not spread them on a one-time-code input. Most of these managers fill
 * one-time codes, and an ignore attribute stops that fill.
 *
 * @example
 * ```tsx
 * <Input type="search" aria-label="Search" {...passwordManagerIgnoreProps} />
 * ```
 */
export const passwordManagerIgnoreProps = {
	"data-1p-ignore": true, // 1Password
	"data-bwignore": true, // Bitwarden
	"data-form-type": "other", // Dashlane
	"data-lpignore": "true", // LastPass
	"data-protonpass-ignore": true, // Proton Pass
} as const;
