import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import * as ToolCall from "./tool-call-parts.js";
import type { ToolCallStatus } from "./tool-call.js";

function Call({ status, name = "list_endpoints" }: { status: ToolCallStatus; name?: string }) {
	return (
		<ToolCall.Root status={status}>
			<ToolCall.Trigger>
				<ToolCall.Name>{name}</ToolCall.Name>
			</ToolCall.Trigger>
			<ToolCall.Content>
				<pre>{'{"limit":5}'}</pre>
			</ToolCall.Content>
		</ToolCall.Root>
	);
}

describe("ToolCall", () => {
	test.each([
		{ status: "running", label: "Running" },
		{ status: "done", label: "Done" },
		{ status: "failed", label: "Failed" },
		{ status: "interrupted", label: "Interrupted" },
	] as const)("names the $status state as $label and stamps data-status", ({ status, label }) => {
		const { container } = render(<Call status={status} />);

		expect(screen.getByRole("button", { name: `list_endpoints ${label}` })).toBeInTheDocument();
		expect(container.querySelector('[data-slot~="tool-call"]')).toHaveAttribute(
			"data-status",
			status,
		);
	});

	test("starts closed and opens on a click", async () => {
		const user = userEvent.setup();
		render(<Call status="done" />);
		const trigger = screen.getByRole("button", { name: "list_endpoints Done" });
		expect(trigger).toHaveAttribute("aria-expanded", "false");

		await user.click(trigger);

		expect(trigger).toHaveAttribute("aria-expanded", "true");
	});

	test("the name never translates, even when a consumer passes translate", () => {
		render(
			<ToolCall.Root status="done">
				<ToolCall.Trigger>
					{/* @ts-expect-error `translate` is not part of the API. */}
					<ToolCall.Name translate="yes">list_endpoints</ToolCall.Name>
				</ToolCall.Trigger>
			</ToolCall.Root>,
		);

		expect(screen.getByText("list_endpoints")).toHaveAttribute("translate", "no");
	});

	test("Name with asChild renders the child and merges props", () => {
		const ref = vi.fn<(node: HTMLElement | null) => void>();
		render(
			<ToolCall.Root status="done">
				<ToolCall.Trigger>
					<ToolCall.Name asChild ref={ref} className="name-class">
						<kbd className="child-class">list_endpoints</kbd>
					</ToolCall.Name>
				</ToolCall.Trigger>
			</ToolCall.Root>,
		);

		const name = screen.getByText("list_endpoints");
		expect(name).toHaveClass("name-class", "child-class");
		expect(name).toHaveAttribute("data-slot", "tool-call-name");
		expect(name).toHaveAttribute("translate", "no");
		expect(ref).toHaveBeenLastCalledWith(name);
	});

	test("the trigger survives a translated page when the state changes", () => {
		const { container, rerender } = render(<Call status="running" />);
		translateTextNodes(container);

		rerender(<Call status="failed" />);

		expect(screen.getByRole("button")).toHaveTextContent("Failed");
	});

	test("a part outside Root throws", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<ToolCall.Trigger />)).toThrow(
			"ToolCall.Trigger must be rendered inside ToolCall.Root.",
		);
	});
});
