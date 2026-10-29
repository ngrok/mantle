import mantlePackageJson from "@ngrok/mantle/package.json" with { type: "json" };
import { describe, expect, it } from "vitest";
import { loadPreviewModule, previewModules } from "./module-registry";

describe("previewModules", () => {
	it("lists every JavaScript subpath that @ngrok/mantle exports", () => {
		const jsSubpaths = Object.entries(mantlePackageJson.exports)
			.filter(
				([, target]) =>
					typeof target === "object" && "import" in target && target.import.endsWith(".js"),
			)
			.map(([subpath]) => `@ngrok/mantle/${subpath.slice(2)}`);
		const registered = Object.keys(previewModules).filter((key) =>
			key.startsWith("@ngrok/mantle/"),
		);
		expect(registered.toSorted()).toEqual(jsSubpaths.toSorted());
	});
});

describe("loadPreviewModule", () => {
	// Why the long timeout: the barrel holds every phosphor icon, and its first import
	// takes seconds when the full suite runs in parallel.
	it("loads a phosphor icon subpath from the barrel", { timeout: 30_000 }, async () => {
		const icons = await loadPreviewModule("@phosphor-icons/react/Trash");
		expect(icons).toHaveProperty("TrashIcon");
	});

	it("returns null for a module the preview does not bundle", async () => {
		expect(await loadPreviewModule("lodash")).toBeNull();
	});

	it("does not read a registry key from the object prototype", async () => {
		expect(await loadPreviewModule("toString")).toBeNull();
	});
});
