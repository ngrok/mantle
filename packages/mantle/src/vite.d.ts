/**
 * Ambient type declarations for Vite-specific import suffixes used in this package.
 * These are resolved by the consuming app's Vite bundler at build time.
 */

declare module "*?url" {
	const url: string;
	export default url;
}

declare module "*?raw" {
	const source: string;
	export default source;
}
