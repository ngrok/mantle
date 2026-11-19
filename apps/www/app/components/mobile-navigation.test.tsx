// @vitest-environment happy-dom
import { ThemeProvider } from "@ngrok/mantle/theme";
import { fireEvent, render, screen } from "@testing-library/react";
import { createRoutesStub, Outlet, useNavigate } from "react-router";
import { expect, test } from "vitest";
import { Header } from "./header";
import { MantleVersionProvider } from "./mantle-version-provider";
import { MobileNavigation } from "./mobile-navigation";
import { NavigationProvider } from "./navigation-context";
import { sidebarFromMatches, type SectionHandle } from "./page-layout";

/** Stands in for the back and forward buttons of the browser. */
function HistoryButtons() {
	const navigate = useNavigate();
	return (
		<>
			<button type="button" onClick={() => void navigate(-1)}>
				Back
			</button>
			<button type="button" onClick={() => void navigate(1)}>
				Forward
			</button>
		</>
	);
}

/** The chrome that `root.tsx` renders around each route. */
function Chrome() {
	return (
		<ThemeProvider>
			<MantleVersionProvider mantleVersion="4.2.0">
				<NavigationProvider>
					<Header />
					<MobileNavigation />
					<HistoryButtons />
					<Outlet />
				</NavigationProvider>
			</MantleVersionProvider>
		</ThemeProvider>
	);
}

function renderAt(path: string) {
	const Stub = createRoutesStub([
		{
			Component: Chrome,
			children: [
				{
					handle: { sidebar: <a href="/philosophy">Philosophy</a> } satisfies SectionHandle,
					children: [{ path: "/docs", Component: () => <p>Docs page</p> }],
				},
				{ path: "/", Component: () => <p>Home page</p> },
				{ path: "/mcp", Component: () => <p>Setup page</p> },
				{ path: "/migrations", Component: () => <p>Migrations page</p> },
			],
		},
	]);
	return render(<Stub initialEntries={[path]} />);
}

test("the menu button opens the drawer on a page outside a section", () => {
	renderAt("/mcp");
	// Why 1: the header nav always links to Recipes. The drawer adds the second link.
	expect(screen.getAllByRole("link", { name: "Recipes" })).toHaveLength(1);

	fireEvent.click(screen.getByRole("button", { name: "Menu" }));

	expect(screen.getAllByRole("link", { name: "Recipes" })).toHaveLength(2);
	expect(screen.queryByRole("link", { name: "Philosophy" })).toBeNull();
});

test("the drawer adds the sidebar of the matched section", () => {
	renderAt("/docs");

	fireEvent.click(screen.getByRole("button", { name: "Menu" }));

	expect(screen.getByRole("link", { name: "Philosophy" }).getAttribute("href")).toBe("/philosophy");
});

test("a drawer link closes the drawer", () => {
	renderAt("/mcp");
	fireEvent.click(screen.getByRole("button", { name: "Menu" }));

	const [, drawerLink] = screen.getAllByRole("link", { name: "Migrations" });
	if (drawerLink == null) {
		throw new Error("expected a Migrations link in the drawer");
	}
	fireEvent.click(drawerLink);

	expect(screen.getAllByRole("link", { name: "Migrations" })).toHaveLength(1);
});

test("a navigation from outside the drawer closes the drawer", async () => {
	renderAt("/mcp");
	fireEvent.click(screen.getByRole("button", { name: "Menu" }));

	fireEvent.click(screen.getByRole("link", { name: /mantle/ }));

	await screen.findByText("Home page");
	expect(screen.getAllByRole("link", { name: "Recipes" })).toHaveLength(1);
});

test("the forward button does not open the drawer again", async () => {
	renderAt("/mcp");
	fireEvent.click(screen.getByRole("link", { name: /mantle/ }));
	await screen.findByText("Home page");
	fireEvent.click(screen.getByRole("button", { name: "Menu" }));

	fireEvent.click(screen.getByRole("button", { name: "Back" }));
	await screen.findByText("Setup page");
	fireEvent.click(screen.getByRole("button", { name: "Forward" }));
	await screen.findByText("Home page");

	expect(screen.getAllByRole("link", { name: "Recipes" })).toHaveLength(1);
});

test("sidebarFromMatches skips matches with no sidebar", () => {
	expect(
		sidebarFromMatches([undefined, { handle: { toc: [] } }, { handle: { sidebar: "Docs" } }]),
	).toBe("Docs");
	expect(sidebarFromMatches([{ handle: undefined }])).toBeUndefined();
});
