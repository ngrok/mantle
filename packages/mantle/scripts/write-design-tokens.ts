import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { buildDesignTokens, TOKEN_FILE_NAMES } from "./design-tokens.ts";

/** The package directory, `packages/mantle`. */
const packageDir = path.resolve(import.meta.dirname, "..");

/**
 * Read the theme stylesheets in cascade order: Tailwind's `theme.css`, which
 * `@import "tailwindcss"` loads first, and then `mantle.css`.
 *
 * @example
 * buildDesignTokens(readThemeCss()).tokens.color; // => the color group
 */
function readThemeCss(): string {
	const tailwindTheme = createRequire(import.meta.url).resolve("tailwindcss/theme.css");
	return [
		fs.readFileSync(tailwindTheme, "utf8"),
		fs.readFileSync(path.join(packageDir, "src", "mantle.css"), "utf8"),
	].join("\n");
}

/**
 * Write the design token files into `dist`: `tokens.json`, `tokens.dark.json`,
 * and `tokens.resolver.json`. The `prepack` script runs this, so every tarball
 * carries them.
 *
 * @example
 * await writeDesignTokens(path.join(packageDir, "dist"));
 * // dist/tokens.json, dist/tokens.dark.json, and dist/tokens.resolver.json now exist
 */
async function writeDesignTokens(distDir: string): Promise<void> {
	const { tokens, darkTokens, resolver } = buildDesignTokens(readThemeCss());
	await fs.promises.mkdir(distDir, { recursive: true });
	const write = (fileName: string, document: unknown) =>
		fs.promises.writeFile(
			path.join(distDir, fileName),
			`${JSON.stringify(document, null, "\t")}\n`,
		);
	await Promise.all([
		write(TOKEN_FILE_NAMES.tokens, tokens),
		write(TOKEN_FILE_NAMES.dark, darkTokens),
		write(TOKEN_FILE_NAMES.resolver, resolver),
	]);
}

if (import.meta.main) {
	await writeDesignTokens(path.join(packageDir, "dist"));
}

export {
	//,
	readThemeCss,
	writeDesignTokens,
};
