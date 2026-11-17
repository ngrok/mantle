import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { exampleHeightsFile, type ExampleHeights } from "~/features/example-heights";

const pixels = z.number().int().positive();

const exampleHeightsSchema = z.record(z.string(), z.object({ wide: pixels, narrow: pixels }));

/**
 * Returns the measured heights of the examples on one docs page, keyed by
 * preview key. Returns an empty record in development and when the build did
 * not measure the examples: each frame then grows to its example's height
 * after the preview loads.
 *
 * Why the file is read for each call: the build starts a preview server
 * before it writes the file, so a cached read would keep the empty result.
 *
 * @example
 * ```ts
 * await pageExampleHeights("components/actions/button");
 * // { "components/actions/button/size": { wide: 212, narrow: 180 }, … }
 * ```
 */
export async function pageExampleHeights(page: string): Promise<ExampleHeights> {
	if (import.meta.env.DEV) {
		return {};
	}
	let contents: string;
	try {
		// Why `process.cwd()`: the build and the server both run from the app root,
		// the folder that holds `build/`.
		contents = await readFile(path.resolve(process.cwd(), exampleHeightsFile), "utf8");
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			return {};
		}
		throw error;
	}
	const heights = exampleHeightsSchema.parse(JSON.parse(contents));
	return Object.fromEntries(
		Object.entries(heights).filter(([key]) => key.slice(0, key.lastIndexOf("/")) === page),
	);
}
