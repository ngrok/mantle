import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { type ReactNode, useEffect, useState } from "react";
import { expect, test } from "vitest";
import { findTranslatedFont, translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import * as DropdownMenu from "../dropdown-menu/dropdown-menu-parts.js";
import { TooltipProvider } from "../tooltip/index.js";
import * as Sidebar from "./sidebar-parts.js";

test("a translated trigger name survives the consumer's swap from text to an element", async () => {
	const user = userEvent.setup();
	function Page() {
		const [name, setName] = useState<ReactNode>("MCP Gateway");
		return (
			<TooltipProvider>
				<Sidebar.Root>
					<Sidebar.Nav aria-label="Main">
						<Sidebar.List>
							<Sidebar.Disclosure>
								<Sidebar.DisclosureTrigger>{name}</Sidebar.DisclosureTrigger>
								<Sidebar.DisclosureList />
							</Sidebar.Disclosure>
						</Sidebar.List>
					</Sidebar.Nav>
					<button type="button" onClick={() => setName(<strong>MCP</strong>)}>
						Rename
					</button>
				</Sidebar.Root>
			</TooltipProvider>
		);
	}
	render(<Page />);
	const trigger = screen.getByRole("button", { name: "MCP Gateway" });
	translateTextNodes(trigger);
	expect(findTranslatedFont(trigger)).not.toBeNull();

	// The caret never unmounts. Without the label span, the bare name is not a
	// lone child, and React throws when it removes the text node that the
	// translation engine moved into a `<font>`.
	await user.click(screen.getByRole("button", { name: "Rename" }));

	expect(trigger.querySelector("strong")).toHaveTextContent("MCP");
});

test("a row's translated name survives an icon that mounts before it", async () => {
	const user = userEvent.setup();
	function Page() {
		const [icon, setIcon] = useState(false);
		return (
			<Sidebar.Root>
				<Sidebar.Nav aria-label="Main">
					<Sidebar.List>
						<Sidebar.Item>
							<Sidebar.ItemButton>
								{icon && <svg aria-hidden />}
								Servers
							</Sidebar.ItemButton>
						</Sidebar.Item>
					</Sidebar.List>
				</Sidebar.Nav>
				<button type="button" onClick={() => setIcon(true)}>
					Show icon
				</button>
			</Sidebar.Root>
		);
	}
	render(<Page />);
	const row = screen.getByRole("button", { name: "Servers" });
	translateTextNodes(row);
	expect(findTranslatedFont(row)).not.toBeNull();

	// The name sits in its own span, so React inserts the icon before an
	// element. Before a bare text node that the engine moved, it throws.
	await user.click(screen.getByRole("button", { name: "Show icon" }));

	expect(row.querySelector("svg")).not.toBeNull();
});

test("a row slotted through a menu trigger renders one button with its name in the label", () => {
	const html = renderToString(
		<DropdownMenu.Root>
			<Sidebar.ItemButton asChild>
				<DropdownMenu.Trigger asChild>
					<button type="button">Actions</button>
				</DropdownMenu.Trigger>
			</Sidebar.ItemButton>
		</DropdownMenu.Root>,
	);
	const host = document.createElement("div");
	host.innerHTML = html;

	expect(host.querySelectorAll("button")).toHaveLength(1);
	expect(host.querySelector("button [data-slot=sidebar-item-button-label]")).toHaveTextContent(
		"Actions",
	);
});

test("a row's translated name in a fragment survives an icon that mounts before it", async () => {
	const user = userEvent.setup();
	function Page() {
		const [icon, setIcon] = useState(false);
		return (
			<Sidebar.Root>
				<Sidebar.Nav aria-label="Main">
					<Sidebar.List>
						<Sidebar.Item>
							<Sidebar.ItemButton>
								<>
									{icon && <svg aria-hidden />}
									Servers
								</>
							</Sidebar.ItemButton>
						</Sidebar.Item>
					</Sidebar.List>
				</Sidebar.Nav>
				<button type="button" onClick={() => setIcon(true)}>
					Show icon
				</button>
			</Sidebar.Root>
		);
	}
	render(<Page />);
	const row = screen.getByRole("button", { name: "Servers" });
	translateTextNodes(row);

	await user.click(screen.getByRole("button", { name: "Show icon" }));

	expect(row.querySelector("svg")).not.toBeNull();
});

test("a row's keyed sibling keeps its state when the name comes and goes", async () => {
	const user = userEvent.setup();
	let mounts = 0;
	function Count() {
		useEffect(() => {
			mounts += 1;
		}, []);
		return <svg aria-hidden />;
	}
	function Page() {
		const [label, setLabel] = useState(true);
		return (
			<Sidebar.Root>
				<Sidebar.Nav aria-label="Main">
					<Sidebar.List>
						<Sidebar.Item>
							<Sidebar.ItemButton aria-label="Inbox">
								<Count key="count" />
								{label && "Inbox"}
							</Sidebar.ItemButton>
						</Sidebar.Item>
					</Sidebar.List>
				</Sidebar.Nav>
				<button type="button" onClick={() => setLabel(false)}>
					Hide name
				</button>
			</Sidebar.Root>
		);
	}
	render(<Page />);

	await user.click(screen.getByRole("button", { name: "Hide name" }));

	expect(mounts).toBe(1);
});
