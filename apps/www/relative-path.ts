import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Resolve the relative path to www app directory.
 * @example `<root>/apps/www/...parts`
 */
function relativeWwwPath(...parts: string[]) {
	const currentDir = fileURLToPath(new URL(".", import.meta.url));
	return path.resolve(currentDir, ...parts);
}

/**
 * Resolve a path to <root> directory.
 * @example `<root>/...parts`
 */
const repoRootPath = (...parts: string[]) => relativeWwwPath("..", "..", ...parts);

/**
 * Resolve a path to <root>/packages directory.
 * @example `<root>/packages/...parts`
 */
const packagesPath = (...parts: string[]) => repoRootPath("packages", ...parts);

/**
 * Resolve a path to <root>/packages/mantle directory.
 * @example `<root>/packages/mantle/...parts`
 */
const mantlePackagePath = (...parts: string[]) => packagesPath("mantle", ...parts);

/**
 * Resolve a path to mantle package src directory.
 * @example `<root>/packages/mantle/src/...parts`
 */
const mantleSrcPath = (...parts: string[]) => mantlePackagePath("src", ...parts);

export {
	//,
	mantlePackagePath,
	mantleSrcPath,
	packagesPath,
	relativeWwwPath,
	repoRootPath,
};
