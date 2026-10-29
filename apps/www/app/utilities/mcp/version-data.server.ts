import type { AgentManifest } from "../../../../../packages/mantle/scripts/agent-manifest";
import {
	declarationEntryFor,
	declarationOf,
	exportNamesOf,
} from "~/utilities/mcp/declarations.server";
import {
	fetchPackageFiles,
	fetchPackument,
	type PackageFiles,
	type Packument,
} from "~/utilities/mcp/npm-tarball.server";

/** The first version whose `dist/agent.json` carries full records. */
export const MIN_SUPPORTED_VERSION = "0.90.0";

/** The API data of one published `@ngrok/mantle` version. */
export type VersionData = {
	version: string;
	manifest: AgentManifest;
	/** Each importable specifier, such as `@ngrok/mantle/button`, and the names it exports. */
	exportsBySpecifier: ReadonlyMap<string, ReadonlySet<string>>;
	/** The version's `dist/llms.txt`, when it ships one. */
	llmsTxt: string | undefined;
	/** The declaration source of `name` as `specifier` exports it, with its JSDoc. */
	declarationOf: (specifier: string, name: string) => string | undefined;
};

/** A version argument the caller can act on: why the server cannot answer for it. */
export class VersionError extends Error {
	override name = "VersionError";
}

/** Compares two `MAJOR.MINOR.PATCH` strings. */
export function compareVersions(left: string, right: string): number {
	const leftParts = left.split(".").map(Number);
	const rightParts = right.split(".").map(Number);
	for (let index = 0; index < 3; index += 1) {
		const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
		if (difference !== 0) {
			return difference;
		}
	}
	return 0;
}

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value != null && !Array.isArray(value);
}

function isAgentManifest(value: unknown): value is AgentManifest {
	return (
		isRecord(value) &&
		typeof value.version === "string" &&
		Array.isArray(value.components) &&
		Array.isArray(value.hooks) &&
		Array.isArray(value.utilities) &&
		Array.isArray(value.subpaths)
	);
}

/**
 * Builds the API data of one version from its tarball files. Throws a
 * {@link VersionError} when the files lack a full `dist/agent.json`.
 *
 * @example
 * const data = versionDataFromFiles("0.93.0", files);
 * data.exportsBySpecifier.get("@ngrok/mantle/button")?.has("Button"); // true
 */
export function versionDataFromFiles(version: string, files: PackageFiles): VersionData {
	const manifestSource = files.get("dist/agent.json");
	const packageSource = files.get("package.json");
	const manifest: unknown = manifestSource == null ? undefined : JSON.parse(manifestSource);
	const packageJson: unknown = packageSource == null ? undefined : JSON.parse(packageSource);
	if (!isAgentManifest(manifest) || !isRecord(packageJson) || !isRecord(packageJson.exports)) {
		throw new VersionError(
			`@ngrok/mantle@${version} has no full agent manifest. Use ${MIN_SUPPORTED_VERSION} or later.`,
		);
	}

	const exportsField = packageJson.exports;
	const entryBySpecifier = new Map<string, string>();
	const exportsBySpecifier = new Map<string, ReadonlySet<string>>();
	for (const subpath of Object.keys(exportsField)) {
		const entry = declarationEntryFor(exportsField, subpath);
		if (entry == null) {
			continue;
		}
		const specifier = `@ngrok/mantle/${subpath.replace(/^\.\//, "")}`;
		entryBySpecifier.set(specifier, entry);
		exportsBySpecifier.set(specifier, exportNamesOf(files, entry));
	}

	return {
		version,
		manifest,
		exportsBySpecifier,
		llmsTxt: files.get("dist/llms.txt"),
		declarationOf: (specifier, name) => {
			const entry = entryBySpecifier.get(specifier);
			return entry == null ? undefined : declarationOf(files, entry, name);
		},
	};
}

/** An approximate retained size of one version's data, for the cache budget. */
function sizeOf(files: PackageFiles): number {
	let total = 0;
	for (const source of files.values()) {
		total += source.length * 2;
	}
	return total;
}

/** What the loader needs from the registry; tests pass a fake. */
export type RegistryClient = {
	fetchPackument: () => Promise<Packument>;
	fetchPackageFiles: (dist: { tarball: string; integrity: string }) => Promise<PackageFiles>;
};

type LoaderOptions = {
	registry?: RegistryClient;
	/** The byte budget of the version cache. */
	cacheBytes?: number;
	/** The most tarball downloads that run at one time. */
	maxConcurrentFetches?: number;
	/** The most downloads that can wait for a slot; more fail fast. */
	maxQueuedFetches?: number;
	/** How long a registry document stays fresh, in milliseconds. */
	packumentTtlMs?: number;
	now?: () => number;
};

/** Loads and caches the API data of published versions. */
export type VersionDataLoader = {
	/** The latest published version. */
	latestVersion: () => Promise<string>;
	/** Validates `version` (or picks the latest) and loads its data. Throws {@link VersionError}. */
	load: (version: string | undefined) => Promise<VersionData>;
};

/**
 * Creates the version loader: a fixed registry host, integrity checks, a
 * byte-bounded LRU cache, one fetch per version at a time, and a bounded
 * download pool and queue.
 *
 * @example
 * const loader = createVersionDataLoader();
 * const data = await loader.load("0.93.0");
 */
export function createVersionDataLoader({
	registry = { fetchPackument, fetchPackageFiles },
	cacheBytes = 96 * 1024 * 1024,
	maxConcurrentFetches = 2,
	maxQueuedFetches = 8,
	packumentTtlMs = 5 * 60_000,
	now = Date.now,
}: LoaderOptions = {}): VersionDataLoader {
	let packument: { value: Promise<Packument>; fetchedAt: number } | undefined;
	const cache = new Map<string, { data: VersionData; bytes: number }>();
	let cachedBytes = 0;
	const inFlight = new Map<string, Promise<VersionData>>();
	let running = 0;
	const waiting: (() => void)[] = [];

	const getPackument = (): Promise<Packument> => {
		if (packument == null || now() - packument.fetchedAt > packumentTtlMs) {
			const value = registry.fetchPackument();
			const entry = { value, fetchedAt: now() };
			packument = entry;
			// Why: a failed fetch must not stick in the cache until the TTL ends.
			value.catch(() => {
				if (packument === entry) {
					packument = undefined;
				}
			});
		}
		return packument.value;
	};

	const withSlot = async <T>(task: () => Promise<T>): Promise<T> => {
		if (running >= maxConcurrentFetches) {
			if (waiting.length >= maxQueuedFetches) {
				throw new VersionError("The server is busy loading other versions. Try again soon.");
			}
			await new Promise<void>((resolve) => {
				waiting.push(resolve);
			});
		}
		running += 1;
		try {
			return await task();
		} finally {
			running -= 1;
			waiting.shift()?.();
		}
	};

	const remember = (version: string, data: VersionData, bytes: number) => {
		cache.set(version, { data, bytes });
		cachedBytes += bytes;
		for (const [key, entry] of cache) {
			if (cachedBytes <= cacheBytes || key === version) {
				break;
			}
			cache.delete(key);
			cachedBytes -= entry.bytes;
		}
	};

	const fetchVersion = async (version: string): Promise<VersionData> => {
		const { versions } = await getPackument();
		const dist = versions.get(version);
		if (dist == null) {
			throw new VersionError(`@ngrok/mantle@${version} is not a published version.`);
		}
		const files = await withSlot(() => registry.fetchPackageFiles(dist));
		const data = versionDataFromFiles(version, files);
		remember(version, data, sizeOf(files));
		return data;
	};

	const latestVersion = async () => (await getPackument()).latest;

	return {
		latestVersion,
		load: async (requested) => {
			if (requested != null && !VERSION_PATTERN.test(requested)) {
				throw new VersionError(
					`Pass an exact MAJOR.MINOR.PATCH version, such as "0.93.0". Ranges, tags, and URLs are not accepted.`,
				);
			}
			const version = requested ?? (await latestVersion());
			if (compareVersions(version, MIN_SUPPORTED_VERSION) < 0) {
				throw new VersionError(
					`@ngrok/mantle@${version} is older than ${MIN_SUPPORTED_VERSION}, the first version with full API data. Use ${MIN_SUPPORTED_VERSION} or later, or call \`migrate\` to upgrade.`,
				);
			}
			const cached = cache.get(version);
			if (cached != null) {
				// Why delete and set: a Map keeps insertion order, so this marks the entry most recent.
				cache.delete(version);
				cache.set(version, cached);
				return cached.data;
			}
			const pending = inFlight.get(version) ?? fetchVersion(version);
			inFlight.set(version, pending);
			try {
				return await pending;
			} finally {
				inFlight.delete(version);
			}
		},
	};
}
