import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { type ReactNode, useState } from "react";
import { expect, test } from "vitest";
import { findTranslatedFont, translateTextNodes } from "../../test-utils/translate-text-nodes.js";
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
