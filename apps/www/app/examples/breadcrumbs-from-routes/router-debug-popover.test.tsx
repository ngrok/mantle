// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { RouterDebugPopover } from "./router-debug-popover";

afterEach(() => {
	cleanup();
});

const Stub = createRoutesStub([
	{
		path: "/preview/demo",
		id: "demo-shell",
		Component: RouterDebugPopover,
		children: [
			{
				path: "domains/:domainId",
				id: "demo-domain",
				handle: { breadcrumb: "Domains", origin: () => null },
				Component: () => null,
			},
		],
	},
]);

async function openPopover() {
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "Show router state" }));
	return screen.findByRole("dialog");
}

describe("RouterDebugPopover", () => {
	it("shows the raw location state the reader arrived with", async () => {
		render(
			<Stub
				initialEntries={[
					{
						pathname: "/preview/demo/domains/rd_1",
						state: {
							origin: [{ kind: "endpoint", id: "ep_1", to: "/preview/demo/endpoints/ep_1" }],
						},
					},
				]}
			/>,
		);

		const popover = await openPopover();

		// once as `location.pathname`, once as the leaf match's cumulative pathname
		expect(within(popover).getAllByText("/preview/demo/domains/rd_1")).toHaveLength(2);
		expect(popover.textContent).toContain('"kind": "endpoint"');
		expect(popover.textContent).toContain('"to": "/preview/demo/endpoints/ep_1"');
	});

	it("lists every match with its handle keys, and a dash for none", async () => {
		render(<Stub initialEntries={["/preview/demo/domains/rd_1"]} />);

		const popover = await openPopover();
		const matches = within(popover).getAllByRole("listitem");

		expect(matches.map((match) => match.textContent)).toEqual([
			"/preview/demoid: demo-shell · handle: —",
			"/preview/demo/domains/rd_1id: demo-domain · handle: breadcrumb, origin",
		]);
	});
});
