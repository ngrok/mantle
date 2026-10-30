import path from "node:path";

/**
 * Get the absolute path relative to the current file in /scripts
 *
 * @param  {...string} parts
 */
function relativePath(...parts) {
	return path.resolve(import.meta.dirname, ...parts);
}

export {
	//,
	relativePath,
};
