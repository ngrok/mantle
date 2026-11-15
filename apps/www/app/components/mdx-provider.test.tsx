// @vitest-environment happy-dom
import { useMDXComponents } from "@mdx-js/react";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { expect, it } from "vitest";
import { MdxProvider } from "./mdx-provider";

function PlainFence() {
	const { pre: Pre } = useMDXComponents();
	if (typeof Pre !== "function") {
		throw new Error("expected MdxProvider to supply a pre component");
	}
	return (
		<Pre>
			<code>plain text in a fence with no highlighting</code>
		</Pre>
	);
}

it("puts a code fence with no highlighting in the Tab order, so a keyboard can scroll it", async () => {
	const user = userEvent.setup();
	render(
		<MemoryRouter>
			<MdxProvider>
				<PlainFence />
			</MdxProvider>
		</MemoryRouter>,
	);

	await user.tab();

	expect(document.activeElement).toBe(
		screen.getByText("plain text in a fence with no highlighting").parentElement,
	);
});
