// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { createRoutesStub, useLocation } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import ArriveFromEndpoint from "./arrive-from-endpoint";
import { demoPaths } from "./paths";

afterEach(() => {
	cleanup();
});

function StateProbe() {
	const location = useLocation();
	return <output data-testid="state">{JSON.stringify(location.state)}</output>;
}

const Stub = createRoutesStub([
	{
		path: "/preview/breadcrumbs-from-routes/from-endpoint/:endpointId",
		Component: ArriveFromEndpoint,
	},
	{ path: "/preview/breadcrumbs-from-routes/domains/:domainId", Component: StateProbe },
]);

describe("ArriveFromEndpoint", () => {
	it("lands on the endpoint's domain with the endpoint as the origin trail", async () => {
		render(<Stub initialEntries={["/preview/breadcrumbs-from-routes/from-endpoint/ep_3Exgo"]} />);

		const probe = await screen.findByTestId("state");

		expect(JSON.parse(probe.textContent)).toEqual({
			origin: [
				{
					kind: "endpoint",
					id: "ep_3Exgo",
					to: demoPaths.endpoint("ep_3Exgo"),
					ancestors: [{ label: "Endpoints", to: demoPaths.endpoints }],
				},
			],
		});
	});

	it("stays put for an unknown endpoint", () => {
		render(<Stub initialEntries={["/preview/breadcrumbs-from-routes/from-endpoint/ep_nope"]} />);

		expect(screen.getByText("No endpoint has this id.").tagName).toBe("P");
		expect(screen.queryByTestId("state")).toBeNull();
	});
});
