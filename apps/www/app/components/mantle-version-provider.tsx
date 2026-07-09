import type { PropsWithChildren } from "react";
import { createContext, useContext } from "react";
import invariant from "tiny-invariant";

/**
 * A validated `major.minor.patch` semantic version string for `@ngrok/mantle`.
 * The template-literal shape prevents arbitrary strings from flowing into the
 * provider — values must be produced by a parser (e.g. the server-only
 * utility in `utilities/mantle-version.server.ts`).
 */
export type MantleVersion = `${number}.${number}.${number}`;

const MantleVersionContext = createContext<MantleVersion | null>(null);

/**
 * Props for the {@link MantleVersionProvider} component.
 */
type MantleVersionProviderProps = PropsWithChildren & {
	/**
	 * The currently installed version of `@ngrok/mantle`, typically resolved
	 * from the package manifest at build/SSR time and surfaced to the UI via
	 * {@link useMantleVersion}.
	 */
	mantleVersion: MantleVersion;
};

/**
 * Provides the current `@ngrok/mantle` version to descendants via React
 * context so UI elements (e.g. the site header) can read it without
 * threading the value through props.
 */
export function MantleVersionProvider({ children, mantleVersion }: MantleVersionProviderProps) {
	return (
		<MantleVersionContext.Provider value={mantleVersion}>{children}</MantleVersionContext.Provider>
	);
}

/**
 * Returns the current `@ngrok/mantle` version supplied by the nearest
 * {@link MantleVersionProvider} ancestor. Throws if called outside of a
 * provider — the version is required context, not an optional value.
 */
export function useMantleVersion() {
	const context = useContext(MantleVersionContext);
	invariant(
		context,
		"useMantleVersion should only be called from a descendant of the MantleVersionProvider",
	);
	return context;
}
