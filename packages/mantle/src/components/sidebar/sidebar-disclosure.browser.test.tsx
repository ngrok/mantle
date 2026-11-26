import { act, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { renderToString } from "react-dom/server";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { commands, page, userEvent } from "vitest/browser";
import { findTranslatedFont, translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import { TooltipProvider } from "../tooltip/index.js";
import * as Sidebar from "./sidebar-parts.js";

/**
 * `Sidebar.Disclosure` in a real browser: the flyout is a native `popover`
 * in the top layer, find in page reads `hidden="until-found"`, and hover
 * needs real pointer events. happy-dom has none of them.
 */

let style: HTMLStyleElement;

beforeAll(async () => {
	// Why: the default viewport is below `sm`, where the panel is the mobile sheet.
	await page.viewport(1280, 800);
	// Why the compiled CSS: the desktop panel is a `<dialog>` that only CSS shows,
	// and the flyout's hide and placement come from its classes.
	style = document.createElement("style");
	style.textContent = [
		await commands.tailwindCss("./sidebar.tsx"),
		await commands.tailwindCss("../sheet/presentation.tsx"),
		await commands.tailwindCss("../dialog/native-primitive.tsx"),
		await commands.tailwindCss("../../utils/float/use-float.ts"),
	].join("\n");
	document.head.append(style);
});

afterAll(() => {
	style.remove();
});

afterEach(() => {
	for (const dialog of document.querySelectorAll("dialog")) {
		dialog.close();
	}
});

const pages = ["Overview", "Servers", "Usage"];

function Nav({ expanded = false, initialPath = "/mcp/servers" }) {
	const [path, setPath] = useState(initialPath);
	return (
		<TooltipProvider>
			<Sidebar.Root defaultOpen={expanded} mobileBreakpoint="sm">
				<div style={{ display: "flex", height: 400 }}>
					<Sidebar.Nav aria-label="Main">
						<Sidebar.Body>
							<Sidebar.Group>
								<Sidebar.List>
									<Sidebar.Item>
										<Sidebar.ItemButton
											current={path === "/setup"}
											onClick={() => setPath("/setup")}
										>
											Setup guide
										</Sidebar.ItemButton>
									</Sidebar.Item>
									{["AI Gateway", "MCP Gateway"].map((group) => {
										const base = group === "AI Gateway" ? "/ai" : "/mcp";
										return (
											<Sidebar.Disclosure
												key={group}
												defaultOpen={initialPath.startsWith(`${base}/`)}
											>
												<Sidebar.DisclosureTrigger>{group}</Sidebar.DisclosureTrigger>
												<Sidebar.DisclosureList>
													{pages.map((page) => {
														const to = `${base}/${page.toLowerCase()}`;
														return (
															<Sidebar.Item key={to}>
																<Sidebar.ItemButton
																	current={path === to}
																	onClick={() => setPath(to)}
																>
																	{page}
																</Sidebar.ItemButton>
															</Sidebar.Item>
														);
													})}
												</Sidebar.DisclosureList>
											</Sidebar.Disclosure>
										);
									})}
								</Sidebar.List>
							</Sidebar.Group>
						</Sidebar.Body>
					</Sidebar.Nav>
					<div>
						<Sidebar.Trigger />
						<button type="button" onClick={() => setPath("/ai/usage")}>
							Go to AI usage
						</button>
					</div>
				</div>
			</Sidebar.Root>
		</TooltipProvider>
	);
}

const nav = () => screen.getByRole("navigation", { name: "Main" });
const listOf = (trigger: HTMLElement) =>
	document.getElementById(trigger.getAttribute("aria-controls") ?? "") as HTMLElement;

describe("Sidebar.Disclosure in the expanded sidebar", () => {
	test("folds its list in place, and a closed list waits for find in page", async () => {
		render(<Nav expanded />);
		const ai = screen.getByRole("button", { name: "AI Gateway", expanded: false });
		const mcp = screen.getByRole("button", { name: "MCP Gateway", expanded: true });
		expect(screen.getByRole("list", { name: "MCP Gateway" })).toBeInTheDocument();
		expect(screen.queryByRole("list", { name: "AI Gateway" })).toBeNull();
		// Why null without support: there `inert` keeps the closed list out of reach.
		const findable = "onbeforematch" in document.body;
		expect(listOf(ai).getAttribute("hidden")).toBe(findable ? "until-found" : null);

		await userEvent.click(ai);
		expect(ai.getAttribute("aria-expanded")).toBe("true");
		expect(listOf(ai).hasAttribute("hidden")).toBe(false);
		// Why: groups are independent, so opening one leaves the other open.
		expect(mcp.getAttribute("aria-expanded")).toBe("true");
		expect(listOf(ai).hasAttribute("popover")).toBe(false);
	});

	test("opens the group of a row that becomes current, and marks a closed group", async () => {
		render(<Nav expanded />);
		const ai = screen.getByRole("button", { name: "AI Gateway" });
		const mcp = screen.getByRole("button", { name: "MCP Gateway" });
		expect(ai.getAttribute("aria-expanded")).toBe("false");

		await userEvent.click(screen.getByRole("button", { name: "Go to AI usage" }));
		expect(ai.getAttribute("aria-expanded")).toBe("true");
		expect(ai.hasAttribute("data-current")).toBe(false);

		await userEvent.click(ai);
		expect(ai.hasAttribute("data-current")).toBe(true);
		expect(mcp.hasAttribute("data-current")).toBe(false);
	});
});

describe("Sidebar.Disclosure in the collapsed sidebar", () => {
	test("a click opens the same list as a flyout of links, and Escape returns focus", async () => {
		render(<Nav />);
		const mcp = screen.getByRole("button", { name: "MCP Gateway", expanded: false });
		expect(mcp.hasAttribute("data-current")).toBe(true);

		await userEvent.click(mcp);
		const list = listOf(mcp);
		expect(mcp.getAttribute("aria-expanded")).toBe("true");
		await waitFor(() => expect(list.matches(":popover-open")).toBe(true));
		expect(nav().contains(list)).toBe(true);
		expect(list.querySelector("[role=menu], [role=menuitem]")).toBeNull();
		expect(list.querySelector("[data-slot=sidebar-disclosure-list-label]")?.textContent).toBe(
			"MCP Gateway",
		);

		await userEvent.keyboard("{Tab}");
		expect(document.activeElement?.textContent).toBe("Overview");
		await userEvent.keyboard("{Escape}");
		expect(mcp.getAttribute("aria-expanded")).toBe("false");
		await waitFor(() => expect(document.activeElement).toBe(mcp));
		await waitFor(() => expect(list.matches(":popover-open")).toBe(false));
	});

	test("a press on a row navigates and closes the flyout", async () => {
		render(<Nav />);
		const mcp = screen.getByRole("button", { name: "MCP Gateway" });
		await userEvent.click(mcp);
		await userEvent.click(screen.getByRole("button", { name: "Usage" }));
		expect(mcp.getAttribute("aria-expanded")).toBe("false");
		expect(
			within(listOf(mcp))
				.getByRole("button", { name: "Usage", hidden: true })
				.getAttribute("aria-current"),
		).toBe("page");
	});

	test("a mouse hover opens it after a rest, switches between groups, and closes when it leaves", async () => {
		render(<Nav />);
		const ai = screen.getByRole("button", { name: "AI Gateway" });
		const mcp = screen.getByRole("button", { name: "MCP Gateway" });

		await userEvent.hover(ai);
		await waitFor(() => expect(ai.getAttribute("aria-expanded")).toBe("true"));
		await userEvent.hover(mcp);
		await waitFor(() => expect(mcp.getAttribute("aria-expanded")).toBe("true"));
		expect(ai.getAttribute("aria-expanded")).toBe("false");

		await userEvent.unhover(mcp);
		await waitFor(() => expect(mcp.getAttribute("aria-expanded")).toBe("false"), { timeout: 1000 });
	});

	test("expanding the sidebar drops the flyout and shows the in-place state", async () => {
		render(<Nav />);
		const ai = screen.getByRole("button", { name: "AI Gateway" });
		await userEvent.click(ai);
		await waitFor(() => expect(listOf(ai).matches(":popover-open")).toBe(true));

		await act(async () => {
			screen.getByRole("button", { name: /sidebar/i, hidden: true }).click();
		});
		expect(ai.getAttribute("aria-expanded")).toBe("false");
		expect(listOf(ai).hasAttribute("popover")).toBe(false);
		expect(screen.getByRole("button", { name: "MCP Gateway" }).getAttribute("aria-expanded")).toBe(
			"true",
		);
	});
});

test("the server renders the open state, with no popover", () => {
	const expanded = renderToString(<Nav expanded />);
	expect(expanded).toContain('aria-expanded="true"');
	expect(expanded).not.toContain("popover=");
	const collapsed = new DOMParser().parseFromString(renderToString(<Nav />), "text/html");
	const lists = collapsed.querySelectorAll("[data-slot~=sidebar-disclosure-list]");
	expect(lists).toHaveLength(2);
	for (const list of lists) {
		expect(list.hasAttribute("popover")).toBe(false);
		expect(list.hasAttribute("data-open")).toBe(false);
		expect(list.hasAttribute("data-flyout")).toBe(true);
	}
});

test("a translated trigger name survives the consumer's swap", async () => {
	function Swap() {
		const [name, setName] = useState("MCP Gateway");
		return (
			<TooltipProvider>
				<Sidebar.Root>
					<div style={{ display: "flex", height: 400 }}>
						<Sidebar.Nav aria-label="Main">
							<Sidebar.List>
								<Sidebar.Disclosure>
									<Sidebar.DisclosureTrigger>{name}</Sidebar.DisclosureTrigger>
									<Sidebar.DisclosureList />
								</Sidebar.Disclosure>
							</Sidebar.List>
						</Sidebar.Nav>
						<button type="button" onClick={() => setName("MCP")}>
							Rename
						</button>
					</div>
				</Sidebar.Root>
			</TooltipProvider>
		);
	}
	const { container } = render(<Swap />);
	translateTextNodes(container);
	expect(findTranslatedFont(container)).not.toBeNull();
	await userEvent.click(screen.getByRole("button", { name: /Rename/ }));
	expect(container.querySelector("[data-slot=sidebar-disclosure-trigger-label]")).not.toBeNull();
});
