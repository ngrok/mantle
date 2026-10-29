import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";

/** The one registry host that the MCP server fetches `@ngrok/mantle` from. */
export const REGISTRY_ORIGIN = "https://registry.npmjs.org";

const PACKAGE_NAME = "@ngrok/mantle";

/** Limits on one tarball, so a hostile or corrupt archive cannot fill memory. */
export const TARBALL_LIMITS = {
	compressedBytes: 8 * 1024 * 1024,
	extractedBytes: 32 * 1024 * 1024,
	fileCount: 2_000,
	timeoutMs: 15_000,
} as const;

const PACKUMENT_LIMIT_BYTES = 16 * 1024 * 1024;

/** The files of a package tarball, keyed by the path under `package/`. */
export type PackageFiles = ReadonlyMap<string, string>;

/** The registry facts for `@ngrok/mantle` that version selection needs. */
export type Packument = {
	latest: string;
	versions: ReadonlyMap<string, { tarball: string; integrity: string }>;
};

/**
 * Reads the entries of an uncompressed POSIX `ustar` archive. Keeps a regular
 * file only when `keep(path)` is true, where `path` is the name under the
 * `package/` root.
 *
 * Throws on a path with `..`, an absolute path, an entry that runs past the
 * buffer, or more than `TARBALL_LIMITS.fileCount` entries.
 *
 * @example
 * const files = readTarEntries(gunzipSync(tgz), (path) => path.endsWith(".d.ts"));
 * files.get("dist/button.d.ts");
 */
export function readTarEntries(archive: Uint8Array, keep: (path: string) => boolean): PackageFiles {
	const decoder = new TextDecoder();
	const files = new Map<string, string>();
	let offset = 0;
	let count = 0;

	const field = (start: number, length: number) =>
		decoder.decode(archive.subarray(offset + start, offset + start + length)).replace(/\0.*$/s, "");

	while (offset + 512 <= archive.length) {
		const name = field(0, 100);
		if (name === "") {
			break;
		}
		count += 1;
		if (count > TARBALL_LIMITS.fileCount) {
			throw new Error(`The tarball has more than ${TARBALL_LIMITS.fileCount} entries.`);
		}

		const prefix = field(345, 155);
		const fullName = prefix === "" ? name : `${prefix}/${name}`;
		const size = Number.parseInt(field(124, 12).trim() || "0", 8);
		const type = field(156, 1);
		const bodyStart = offset + 512;
		if (!Number.isFinite(size) || size < 0 || bodyStart + size > archive.length) {
			throw new Error(`The tarball entry ${JSON.stringify(fullName)} is truncated.`);
		}
		if (fullName.startsWith("/") || fullName.split("/").includes("..")) {
			throw new Error(`The tarball entry ${JSON.stringify(fullName)} has an unsafe path.`);
		}

		const path = fullName.replace(/^[^/]+\//, "");
		const isRegularFile = type === "" || type === "0";
		if (isRegularFile && keep(path)) {
			files.set(path, decoder.decode(archive.subarray(bodyStart, bodyStart + size)));
		}
		offset = bodyStart + Math.ceil(size / 512) * 512;
	}

	return files;
}

/**
 * Whether `bytes` match an npm `dist.integrity` value. Only `sha512` counts.
 *
 * @example
 * matchesIntegrity(tgz, "sha512-3+49r+…"); // true when the hash matches
 */
export function matchesIntegrity(bytes: Uint8Array, integrity: string): boolean {
	const expected = integrity
		.split(/\s+/)
		.find((entry) => entry.startsWith("sha512-"))
		?.slice("sha512-".length);
	if (expected == null) {
		return false;
	}
	return createHash("sha512").update(bytes).digest("base64") === expected;
}

/** The tarball files the MCP server reads: the manifests, the exports, and the declarations. */
export function isApiDataFile(path: string): boolean {
	return (
		path === "package.json" ||
		path === "dist/agent.json" ||
		path === "dist/llms.txt" ||
		/^dist\/[^/]+\.d\.ts$/.test(path)
	);
}

async function readBounded(response: Response, limit: number): Promise<Uint8Array> {
	const declared = Number(response.headers.get("content-length") ?? "0");
	if (declared > limit) {
		throw new Error(`The registry response is larger than ${limit} bytes.`);
	}
	if (response.body == null) {
		throw new Error("The registry response has no body.");
	}
	const chunks: Uint8Array[] = [];
	let total = 0;
	for await (const chunk of response.body) {
		total += chunk.byteLength;
		if (total > limit) {
			throw new Error(`The registry response is larger than ${limit} bytes.`);
		}
		chunks.push(chunk);
	}
	return Buffer.concat(chunks);
}

async function fetchFromRegistry(url: string, limit: number): Promise<Uint8Array> {
	if (new URL(url).origin !== REGISTRY_ORIGIN) {
		throw new Error(`Refusing to fetch from a host other than ${REGISTRY_ORIGIN}.`);
	}
	// Why `redirect: "error"`: a redirect to another host would skip the origin check above.
	const response = await fetch(url, {
		redirect: "error",
		signal: AbortSignal.timeout(TARBALL_LIMITS.timeoutMs),
		headers: { Accept: "application/json, application/octet-stream" },
	});
	if (!response.ok) {
		throw new Error(`The registry returned ${response.status} for ${url}.`);
	}
	return readBounded(response, limit);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value != null && !Array.isArray(value);
}

/**
 * Parses the registry document for `@ngrok/mantle` into the latest version
 * and the tarball location and integrity of each version.
 *
 * @example
 * parsePackument(JSON.parse(body)).latest; // "0.93.0"
 */
export function parsePackument(document: unknown): Packument {
	if (!isRecord(document) || !isRecord(document.versions) || !isRecord(document["dist-tags"])) {
		throw new Error("The registry document has no versions.");
	}
	const latest = document["dist-tags"].latest;
	if (typeof latest !== "string") {
		throw new Error("The registry document has no latest tag.");
	}
	const versions = new Map<string, { tarball: string; integrity: string }>();
	for (const [version, entry] of Object.entries(document.versions)) {
		if (!isRecord(entry) || !isRecord(entry.dist)) {
			continue;
		}
		const { tarball, integrity } = entry.dist;
		if (typeof tarball === "string" && typeof integrity === "string") {
			versions.set(version, { tarball, integrity });
		}
	}
	return { latest, versions };
}

/** Fetches and parses the registry document for `@ngrok/mantle`. */
export async function fetchPackument(): Promise<Packument> {
	const bytes = await fetchFromRegistry(
		`${REGISTRY_ORIGIN}/${PACKAGE_NAME.replace("/", "%2f")}`,
		PACKUMENT_LIMIT_BYTES,
	);
	return parsePackument(JSON.parse(new TextDecoder().decode(bytes)));
}

/**
 * Downloads one published tarball, checks its integrity, and returns the API
 * data files ({@link isApiDataFile}). Throws when a limit or the check fails.
 */
export async function fetchPackageFiles(dist: {
	tarball: string;
	integrity: string;
}): Promise<PackageFiles> {
	const compressed = await fetchFromRegistry(dist.tarball, TARBALL_LIMITS.compressedBytes);
	if (!matchesIntegrity(compressed, dist.integrity)) {
		throw new Error("The tarball does not match its registry integrity hash.");
	}
	const archive = gunzipSync(compressed, { maxOutputLength: TARBALL_LIMITS.extractedBytes });
	return readTarEntries(archive, isApiDataFile);
}
