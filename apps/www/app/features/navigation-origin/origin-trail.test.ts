import { routeBreadcrumb } from "@ngrok/mantle/breadcrumb";
import { describe, expect, it } from "vitest";
import {
	findSelfOrigin,
	hasOrigin,
	MAX_ORIGIN_DEPTH,
	type OriginEntry,
	pushOrigin,
	readOriginTrail,
} from "./origin-trail";

const endpoint: OriginEntry = {
	kind: "endpoint",
	id: "ep_1",
	to: "/endpoints/ep_1",
	ancestors: [{ label: "Endpoints", to: "/endpoints" }],
};
const domain: OriginEntry = {
	kind: "domain",
	id: "rd_1",
	to: "/domains/rd_1",
	ancestors: [{ label: "Domains", to: "/domains" }],
};
const otherEndpoint: OriginEntry = {
	kind: "endpoint",
	id: "ep_2",
	to: "/endpoints/ep_2",
	ancestors: [{ label: "Endpoints", to: "/endpoints" }],
};
const otherDomain: OriginEntry = {
	kind: "domain",
	id: "rd_2",
	to: "/domains/rd_2",
	ancestors: [{ label: "Domains", to: "/domains" }],
};

describe("pushOrigin", () => {
	it("appends the current page when the target is new", () => {
		expect(pushOrigin([], endpoint, domain.to)).toEqual([endpoint]);
	});

	it("pops back to before a target already in the trail", () => {
		// A → B → A: returning to A resumes A's context, which had no trail
		expect(pushOrigin([endpoint], domain, endpoint.to)).toEqual([]);
	});

	it("alternates between one entry and none while two pages link back and forth", () => {
		let trail: ReadonlyArray<OriginEntry> = [];
		let self = endpoint;
		let target = domain;
		for (let hop = 1; hop <= 6; hop += 1) {
			trail = pushOrigin(trail, self, target.to);
			expect(trail).toEqual(hop % 2 === 1 ? [endpoint] : []);
			[self, target] = [target, self];
		}
	});

	it("slices to the target's position, not to empty", () => {
		// A → B → C → B: B is at index 1, so the trail resumes as [A]
		expect(pushOrigin([endpoint, domain], otherEndpoint, domain.to)).toEqual([endpoint]);
	});

	it("caps the trail and drops the oldest entry", () => {
		const full = [endpoint, domain, otherEndpoint];
		const trail = pushOrigin(full, otherDomain, "/apps/app_1");

		expect(trail).toHaveLength(MAX_ORIGIN_DEPTH);
		expect(trail).toEqual([domain, otherEndpoint, otherDomain]);
	});

	it("does not push a link to the page itself", () => {
		expect(pushOrigin([endpoint], domain, domain.to)).toEqual([endpoint]);
	});

	it("passes the trail through from a page with no identity", () => {
		expect(pushOrigin([endpoint], null, "/domains")).toEqual([endpoint]);
	});
});

describe("readOriginTrail", () => {
	it("reads an empty trail from a null state", () => {
		expect(readOriginTrail(null)).toEqual([]);
		expect(readOriginTrail(undefined)).toEqual([]);
	});

	it("reads an empty trail when origin is not an array", () => {
		expect(readOriginTrail({ origin: "ep_1" })).toEqual([]);
		expect(readOriginTrail({ other: [] })).toEqual([]);
	});

	it("drops an entry with an unknown kind and keeps the rest", () => {
		const agent = { kind: "agent", id: "ag_1", to: "/agents/ag_1", ancestors: [] };
		expect(readOriginTrail({ origin: [agent, domain] })).toEqual([domain]);
	});

	it("drops a malformed entry", () => {
		const emptyId = { kind: "endpoint", id: "", to: "/endpoints/", ancestors: [] };
		const relativeTo = { kind: "domain", id: "rd_1", to: "domains/rd_1", ancestors: [] };
		const missingTo = { kind: "domain", id: "rd_1", ancestors: [] };
		const relativeAncestor = { ...domain, ancestors: [{ label: "Domains", to: "domains" }] };

		expect(
			readOriginTrail({ origin: [emptyId, relativeTo, missingTo, relativeAncestor, endpoint] }),
		).toEqual([endpoint]);
	});

	it("reads an entry written without ancestors as one with none", () => {
		const legacy = { kind: "domain", id: "rd_1", to: "/domains/rd_1" };
		expect(readOriginTrail({ origin: [legacy] })).toEqual([{ ...legacy, ancestors: [] }]);
	});

	it("strips fields the entry schema does not know", () => {
		expect(readOriginTrail({ origin: [{ ...endpoint, label: "stale" }] })).toEqual([endpoint]);
	});
});

describe("findSelfOrigin", () => {
	const endpointHandle = {
		// the detail route is a sibling of its list, so it names `Endpoints` itself
		breadcrumb: () => [routeBreadcrumb("Endpoints", { to: "/endpoints" }), routeBreadcrumb("ep_1")],
		origin: () => ({ kind: "endpoint", id: "ep_1" }) as const,
	};

	it("takes the deepest match with an origin handle and stamps its pathname", () => {
		const self = findSelfOrigin([
			{ id: "root", pathname: "/", handle: undefined },
			{ id: "endpoint", pathname: "/endpoints/ep_1", handle: endpointHandle },
			// a tab under the detail route: no identity of its own
			{ id: "tab", pathname: "/endpoints/ep_1/traffic-policy", handle: { breadcrumb: "Policy" } },
		]);

		expect(self).toEqual({
			kind: "endpoint",
			id: "ep_1",
			to: "/endpoints/ep_1",
			ancestors: [{ label: "Endpoints", to: "/endpoints" }],
		});
	});

	it("keeps a label crumb above the page as an ancestor with no `to`", () => {
		const self = findSelfOrigin([
			{ id: "gate", pathname: "/", handle: undefined },
			{
				id: "section",
				pathname: "/",
				handle: { breadcrumb: () => [routeBreadcrumb.label("Account")] },
			},
			{ id: "endpoint", pathname: "/endpoints/ep_1", handle: endpointHandle },
		]);

		expect(self?.ancestors).toEqual([
			{ label: "Account" },
			{ label: "Endpoints", to: "/endpoints" },
		]);
	});

	it("leaves a content crumb out of the ancestors", () => {
		const self = findSelfOrigin([
			{
				id: "app",
				pathname: "/apps/app_1",
				handle: {
					breadcrumb: () => [
						routeBreadcrumb("Apps", { to: "/apps" }),
						routeBreadcrumb.content("x"),
					],
				},
			},
			{ id: "endpoint", pathname: "/apps/app_1/endpoints/ep_1", handle: endpointHandle },
		]);

		expect(self?.ancestors).toEqual([
			{ label: "Apps", to: "/apps" },
			{ label: "Endpoints", to: "/endpoints" },
		]);
	});

	it("prefers the deeper of two identified matches", () => {
		const self = findSelfOrigin([
			{
				id: "domain",
				pathname: "/domains/rd_1",
				handle: { origin: () => ({ kind: "domain", id: "rd_1" }) },
			},
			{ id: "endpoint", pathname: "/domains/rd_1/endpoints/ep_1", handle: endpointHandle },
		]);

		expect(self?.to).toBe("/domains/rd_1/endpoints/ep_1");
	});

	it("passes the match to the origin function", () => {
		const self = findSelfOrigin([
			{
				id: "domain",
				pathname: "/domains/rd_1",
				handle: {
					origin: (match: { pathname: string }) => ({ kind: "domain", id: match.pathname }),
				},
			},
		]);

		expect(self?.id).toBe("/domains/rd_1");
	});

	it("returns null when the origin function declines", () => {
		const declined = findSelfOrigin([
			{ id: "endpoints", pathname: "/endpoints/", handle: { origin: () => null } },
		]);
		expect(declined).toBeNull();
	});

	it("returns null when no match identifies itself", () => {
		const unidentified = findSelfOrigin([
			{ id: "endpoints", pathname: "/endpoints", handle: { breadcrumb: "Endpoints" } },
		]);
		expect(unidentified).toBeNull();
	});
});

describe("hasOrigin", () => {
	it("accepts a handle whose origin is a function", () => {
		expect(hasOrigin({ id: "a", pathname: "/", handle: { origin: () => null } })).toBe(true);
	});

	it("rejects a handle whose origin is not a function", () => {
		const handle = { origin: { kind: "endpoint", id: "ep_1" } };
		expect(hasOrigin({ id: "a", pathname: "/", handle })).toBe(false);
	});

	it("rejects a missing handle", () => {
		expect(hasOrigin({ id: "a", pathname: "/", handle: undefined })).toBe(false);
		expect(hasOrigin({ id: "a", pathname: "/", handle: null })).toBe(false);
	});
});
