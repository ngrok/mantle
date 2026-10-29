import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
	isApiDataFile,
	matchesIntegrity,
	parsePackument,
	readTarEntries,
	type PackageFiles,
} from "~/utilities/mcp/npm-tarball.server";
import { declarationOf, exportNamesOf } from "~/utilities/mcp/declarations.server";
import { packageFilesFixture, tarOf } from "~/utilities/mcp/test-fixtures";
import {
	createVersionDataLoader,
	versionDataFromFiles,
	type RegistryClient,
} from "~/utilities/mcp/version-data.server";

describe("readTarEntries", () => {
	it("keeps the files the filter accepts, keyed under the package root", () => {
		const archive = tarOf({ "dist/button.d.ts": "export {};", "dist/button.js": "export {};" });

		const files = readTarEntries(archive, isApiDataFile);

		expect(Array.from(files.keys())).toEqual(["dist/button.d.ts"]);
		expect(files.get("dist/button.d.ts")).toBe("export {};");
	});

	it("rejects an entry whose path climbs out of the root", () => {
		const archive = tarOf({ "package/../../etc/passwd": "x" });

		expect(() => readTarEntries(archive, () => true)).toThrow(/unsafe path/);
	});
});

describe("matchesIntegrity", () => {
	it("accepts the sha512 of the bytes and rejects other bytes", () => {
		const bytes = new TextEncoder().encode("tarball");
		const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;

		expect(matchesIntegrity(bytes, integrity)).toBe(true);
		expect(matchesIntegrity(new TextEncoder().encode("tampered"), integrity)).toBe(false);
	});
});

describe("parsePackument", () => {
	it("reads the latest tag and the dist of each version", () => {
		const packument = parsePackument({
			"dist-tags": { latest: "0.93.0" },
			versions: {
				"0.93.0": { dist: { tarball: "https://registry.npmjs.org/x.tgz", integrity: "sha512-a" } },
			},
		});

		expect(packument.latest).toBe("0.93.0");
		expect(packument.versions.get("0.93.0")?.integrity).toBe("sha512-a");
	});
});

describe("exportNamesOf", () => {
	it("lists named re-exports and follows export star into chunks", () => {
		const files = packageFilesFixture();

		expect(Array.from(exportNamesOf(files, "dist/button.d.ts")).toSorted()).toEqual([
			"Button",
			"ButtonProps",
		]);
		expect(Array.from(exportNamesOf(files, "dist/dialog.d.ts"))).toEqual(["Dialog"]);
	});
});

describe("declarationOf", () => {
	it("follows the renamed chunk export to the declaration and keeps its JSDoc", () => {
		const declaration = declarationOf(packageFilesFixture(), "dist/button.d.ts", "ButtonProps");

		expect(declaration).toBe(
			'/** The props of `Button`. */\ntype ButtonProps = { intent: "neutral" | "danger" };',
		);
	});

	it("returns undefined for a name the entry does not export", () => {
		expect(declarationOf(packageFilesFixture(), "dist/button.d.ts", "Buton")).toBeUndefined();
	});
});

describe("versionDataFromFiles", () => {
	it("maps each JS export to its specifier and skips the stylesheet", () => {
		const data = versionDataFromFiles("0.93.0", packageFilesFixture());

		expect(Array.from(data.exportsBySpecifier.keys())).toEqual([
			"@ngrok/mantle/button",
			"@ngrok/mantle/dialog",
			"@ngrok/mantle/hooks",
		]);
	});

	it("names the floor when the tarball has no agent manifest", () => {
		const files = new Map(packageFilesFixture());
		files.delete("dist/agent.json");

		expect(() => versionDataFromFiles("0.89.0", files)).toThrow(
			"@ngrok/mantle@0.89.0 has no full agent manifest. Use 0.90.0 or later.",
		);
	});
});

function fakeRegistry(files: PackageFiles = packageFilesFixture()) {
	const fetchPackageFiles = vi.fn<RegistryClient["fetchPackageFiles"]>(async () => files);
	const registry: RegistryClient = {
		fetchPackument: async () => ({
			latest: "0.93.0",
			versions: new Map([
				["0.93.0", { tarball: "https://registry.npmjs.org/a.tgz", integrity: "sha512-a" }],
				["0.91.0", { tarball: "https://registry.npmjs.org/b.tgz", integrity: "sha512-b" }],
			]),
		}),
		fetchPackageFiles,
	};
	return { registry, fetchPackageFiles };
}

describe("createVersionDataLoader", () => {
	it("loads the latest version when the caller passes none", async () => {
		const { registry } = fakeRegistry();

		const data = await createVersionDataLoader({ registry }).load(undefined);

		expect(data.version).toBe("0.93.0");
	});

	it("rejects a range, a version under the floor, and an unpublished version", async () => {
		const loader = createVersionDataLoader({ registry: fakeRegistry().registry });

		await expect(loader.load("^0.93.0")).rejects.toThrow(/exact MAJOR.MINOR.PATCH/);
		await expect(loader.load("0.89.9")).rejects.toThrow(/older than 0.90.0/);
		await expect(loader.load("0.92.5")).rejects.toThrow(
			"@ngrok/mantle@0.92.5 is not a published version.",
		);
	});

	it("fetches a version once for concurrent and later calls", async () => {
		const { registry, fetchPackageFiles } = fakeRegistry();
		const loader = createVersionDataLoader({ registry });

		await Promise.all([loader.load("0.93.0"), loader.load("0.93.0")]);
		await loader.load("0.93.0");

		expect(fetchPackageFiles).toHaveBeenCalledTimes(1);
	});

	it("evicts the least recent version when the cache is over its byte budget", async () => {
		const { registry, fetchPackageFiles } = fakeRegistry();
		const loader = createVersionDataLoader({ registry, cacheBytes: 1 });

		await loader.load("0.93.0");
		await loader.load("0.91.0");
		await loader.load("0.93.0");

		expect(fetchPackageFiles).toHaveBeenCalledTimes(3);
	});
});
