import mantlePackageJson from "@ngrok/mantle/package.json" with { type: "json" };

/**
 * Public shape of `/api/package.json`. The full `package.json` would
 * leak internal dev tooling and churn on every devDependency bump, so
 * we surface only the fields downstream tools actually consume: the
 * version, the dependency ranges consumers must satisfy, and the list
 * of importable subpaths.
 */
export type PackageInfo = {
	name: string;
	version: string;
	description?: string;
	homepage?: string;
	repository?: string;
	license?: string;
	peerDependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	/** Full import specifiers (`@ngrok/mantle/<name>`), sorted, JS only. */
	subpaths: string[];
};

/**
 * Importable JS subpaths from `package.json#exports`, sorted. Drops CSS
 * bundles, the `./package.json` passthrough, and the `./agent.json` /
 * `./llms.txt` agent-discovery artifacts (those exist precisely to
 * describe this list — including them in it would be circular).
 */
function importableSubpaths(): string[] {
	const skip = new Set([".", "./package.json", "./agent.json", "./llms.txt"]);
	return Object.keys(mantlePackageJson.exports)
		.filter((key) => key.startsWith("./") && !skip.has(key) && !key.endsWith(".css"))
		.map((key) => `@ngrok/mantle/${key.slice(2)}`)
		.toSorted((a, b) => a.localeCompare(b));
}

/**
 * `package.json#repository` may be a bare URL string or a `{ type, url }`
 * object — the npm spec allows both. Normalize to a URL or undefined.
 */
function repositoryUrl(): string | undefined {
	const repository = mantlePackageJson.repository;
	if (typeof repository === "string") {
		return repository;
	}
	if (repository && typeof repository === "object" && "url" in repository) {
		const url = repository.url;
		return typeof url === "string" ? url : undefined;
	}
	return undefined;
}

/**
 * Cached for the process lifetime — the inputs all come from the static
 * JSON import above, so a rebuild is the only thing that can change them.
 */
let cached: PackageInfo | null = null;
export function buildPackageInfo(): PackageInfo {
	if (cached) {
		return cached;
	}
	cached = {
		name: mantlePackageJson.name,
		version: mantlePackageJson.version,
		description: mantlePackageJson.description,
		homepage: mantlePackageJson.homepage,
		repository: repositoryUrl(),
		license: mantlePackageJson.license,
		peerDependencies: mantlePackageJson.peerDependencies,
		devDependencies: mantlePackageJson.devDependencies,
		subpaths: importableSubpaths(),
	};
	return cached;
}
