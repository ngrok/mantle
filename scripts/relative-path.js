import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Get the absolute path relative to the current file in /scripts
 *
 * @param  {...string} parts
 */
function relativePath(...parts) {
	const currentDir = fileURLToPath(new URL(".", import.meta.url));
	return path.resolve(currentDir, ...parts);
}

export {
	//,
	relativePath,
};
