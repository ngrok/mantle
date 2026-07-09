import { z } from "zod";
import type { MantleVersion } from "../components/mantle-version-provider";

/**
 * Zod schema that validates a stable `major.minor.patch` version string and
 * narrows it to the {@link MantleVersion} template-literal type.
 *
 * Accepts:
 * - `"0.0.0"`
 * - `"1.2.3"`
 * - `"12.34.567"`
 *
 * Rejects (throws `ZodError` on `.parse`):
 * - Non-strings (`undefined`, `null`, numbers, objects, …)
 * - Empty strings
 * - Prerelease suffixes (e.g. `"1.2.3-beta.1"`)
 * - Build-metadata suffixes (e.g. `"1.2.3+sha.abc"`)
 * - Leading `v` (e.g. `"v1.2.3"`)
 * - Partial versions (e.g. `"1.2"`, `"1"`)
 * - Surrounding whitespace (e.g. `" 1.2.3 "`)
 *
 * Prerelease / build-metadata versions are intentionally rejected because the
 * UI only renders stable releases (`releaseHref` links to a GitHub release tag
 * that follows this exact format).
 *
 * @example
 * ```ts
 * mantleVersionSchema.parse("1.2.3"); // "1.2.3" (typed as MantleVersion)
 * mantleVersionSchema.parse("1.2.3-beta.1"); // throws ZodError
 * ```
 */
export const mantleVersionSchema = z.custom<MantleVersion>(
	(value) => typeof value === "string" && /^\d+\.\d+\.\d+$/.test(value),
	"expected a `major.minor.patch` version string",
);

/**
 * Parses an unknown value (typically `packageJson.version`) into a validated
 * {@link MantleVersion}. Throws a `ZodError` when the input does not match
 * `major.minor.patch`, surfacing misconfigured deployments immediately in the
 * root loader rather than letting a malformed string leak into the UI.
 *
 * Server-only: intended to be called from React Router loaders, where the
 * `@ngrok/mantle` `package.json` is resolved at build/SSR time.
 *
 * @example
 * ```ts
 * const version = parseMantleVersion(packageJson.version); // "1.2.3"
 * ```
 */
export function parseMantleVersion(input: unknown): MantleVersion {
	return mantleVersionSchema.parse(input);
}
