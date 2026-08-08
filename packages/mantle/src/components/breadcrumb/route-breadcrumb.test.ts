import { describe, expect, test } from "vitest";
import type { BreadcrumbMatch } from "./route-breadcrumb.js";
import { buildCrumbs, hasBreadcrumb, routeBreadcrumb } from "./route-breadcrumb.js";

/**
 * Builds a `BreadcrumbMatch` fixture. The builder is router-agnostic and reads
 * only these three fields, so the fixture needs nothing from a real router.
 */
function match(fields: { id: string; pathname: string; handle?: unknown }): BreadcrumbMatch {
	return {
		id: fields.id,
		pathname: fields.pathname,
		handle: fields.handle,
	};
}

describe("routeBreadcrumb", () => {
	test("creates a link crumb, leaving `to` unset when omitted", () => {
		expect(routeBreadcrumb("Endpoints")).toEqual({ kind: "link", label: "Endpoints" });
		expect(routeBreadcrumb("Endpoints", { to: "/endpoints" })).toEqual({
			kind: "link",
			label: "Endpoints",
			to: "/endpoints",
		});
	});

	test("label creates a crumb with no destination at all", () => {
		expect(routeBreadcrumb.label("Settings")).toEqual({ kind: "label", label: "Settings" });
	});

	test("content wraps a rendered segment verbatim", () => {
		const segment = "rendered elsewhere";
		expect(routeBreadcrumb.content(segment)).toEqual({ kind: "content", content: segment });
	});
});

describe("hasBreadcrumb", () => {
	test("accepts a string or function breadcrumb and nothing else", () => {
		expect(hasBreadcrumb(match({ id: "a", pathname: "/", handle: { breadcrumb: "A" } }))).toBe(
			true,
		);
		expect(hasBreadcrumb(match({ id: "a", pathname: "/", handle: { breadcrumb: () => [] } }))).toBe(
			true,
		);
		expect(hasBreadcrumb(match({ id: "a", pathname: "/" }))).toBe(false);
		expect(hasBreadcrumb(match({ id: "a", pathname: "/", handle: { requiresAuth: true } }))).toBe(
			false,
		);
		expect(hasBreadcrumb(match({ id: "a", pathname: "/", handle: { breadcrumb: 42 } }))).toBe(
			false,
		);
	});
});

describe("buildCrumbs", () => {
	test("returns nothing when no route named itself", () => {
		expect(buildCrumbs([match({ id: "root", pathname: "/" })])).toEqual([]);
	});

	test("skips routes with no breadcrumb handle — omitting it is the opt-out", () => {
		const crumbs = buildCrumbs([
			match({ id: "root", pathname: "/" }),
			match({ id: "gate", pathname: "/", handle: { requiresAuth: true } }),
			match({ id: "endpoints", pathname: "/endpoints", handle: { breadcrumb: "Endpoints" } }),
		]);
		expect(crumbs).toEqual([
			{ kind: "link", key: "endpoints:0", label: "Endpoints", to: "/endpoints" },
		]);
	});

	test("defaults a link crumb's `to` to the contributing route's pathname", () => {
		const crumbs = buildCrumbs([
			match({
				id: "endpoint",
				pathname: "/endpoints/ep_1",
				handle: { breadcrumb: () => [routeBreadcrumb("ep_1")] },
			}),
		]);
		expect(crumbs).toEqual([
			{ kind: "link", key: "endpoint:0", label: "ep_1", to: "/endpoints/ep_1" },
		]);
	});

	test("lets one route contribute several crumbs, keying each by index", () => {
		const crumbs = buildCrumbs([
			match({
				id: "endpoint",
				pathname: "/endpoints/ep_1",
				handle: {
					breadcrumb: () => [
						routeBreadcrumb("Endpoints", { to: "/endpoints" }),
						routeBreadcrumb("ep_1"),
					],
				},
			}),
		]);
		expect(crumbs).toEqual([
			{ kind: "link", key: "endpoint:0", label: "Endpoints", to: "/endpoints" },
			{ kind: "link", key: "endpoint:1", label: "ep_1", to: "/endpoints/ep_1" },
		]);
	});

	test("resolves a label crumb with no destination", () => {
		const crumbs = buildCrumbs([
			match({
				id: "settings",
				pathname: "/settings",
				handle: { breadcrumb: () => [routeBreadcrumb.label("Settings")] },
			}),
		]);
		// no `to` at all — an unlinked link crumb is unrepresentable
		expect(crumbs).toEqual([{ kind: "label", key: "settings:0", label: "Settings" }]);
	});

	test("passes a content crumb through with its key", () => {
		const segment = "rendered elsewhere";
		const crumbs = buildCrumbs([
			match({
				id: "app",
				pathname: "/apps/app_123",
				handle: { breadcrumb: () => [routeBreadcrumb.content(segment)] },
			}),
		]);
		expect(crumbs).toEqual([{ kind: "content", key: "app:0", content: segment }]);
	});

	test("passes the match to a breadcrumb function, so labels derive from it", () => {
		const crumbs = buildCrumbs([
			match({
				id: "endpoint",
				pathname: "/endpoints/ep_1",
				handle: {
					breadcrumb: (m: BreadcrumbMatch) => [routeBreadcrumb(m.pathname.split("/").at(-1))],
				},
			}),
		]);
		expect(crumbs.map((crumb) => (crumb.kind === "content" ? null : crumb.label))).toEqual([
			"ep_1",
		]);
	});
});
