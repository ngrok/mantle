import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import * as ToolCall from "./tool-call-parts.js";
import type { ToolCallStatus } from "./tool-call.js";

function Call({ status, name = "list_endpoints" }: { status: ToolCallStatus; name?: string }) {
	return (
		<ToolCall.Root status={status} data-status="running">
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
		{ status: "requested", label: "Requested" },
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

	test.each(["yes", undefined] as const)(
		"Name with asChild locks translate=%s and merges props",
		(translate) => {
			const ref = vi.fn<(node: HTMLElement | null) => void>();
			render(
				<ToolCall.Root status="done">
					<ToolCall.Trigger>
						<ToolCall.Name asChild ref={ref} className="name-class">
							<kbd className="child-class" translate={translate} data-slot="consumer-name">
								list_endpoints
							</kbd>
						</ToolCall.Name>
					</ToolCall.Trigger>
				</ToolCall.Root>,
			);

			const name = screen.getByText("list_endpoints");
			expect(name).toHaveClass("name-class", "child-class");
			expect(name.tagName).toBe("KBD");
			expect(name).toHaveAttribute("data-slot", "tool-call-name consumer-name");
			expect(name).toHaveAttribute("translate", "no");
			translateTextNodes(name);
			expect(name).toHaveTextContent(/^list_endpoints$/);
			expect(ref).toHaveBeenCalledTimes(1);
			expect(ref).toHaveBeenLastCalledWith(name);
		},
	);

	test("the trigger survives a translated page when the state changes", async () => {
		const user = userEvent.setup();
		const { container, rerender } = render(<Call status="running" />);
		translateTextNodes(container);
		await user.click(screen.getByRole("button"));
		expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");

		rerender(<Call status="failed" />);

		expect(screen.getByRole("button")).toHaveTextContent("Failed");
	});

	test("the trigger survives translated children changing from text to an element", () => {
		const { container, rerender } = render(
			<ToolCall.Root status="running">
				<ToolCall.Trigger>Looking up endpoints</ToolCall.Trigger>
			</ToolCall.Root>,
		);
		translateTextNodes(container);

		rerender(
			<ToolCall.Root status="done">
				<ToolCall.Trigger>
					<span>Found endpoints</span>
				</ToolCall.Trigger>
			</ToolCall.Root>,
		);

		expect(screen.getByRole("button", { name: "Found endpoints Done" })).toBeInTheDocument();
	});

	test("a part outside Root throws", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<ToolCall.Trigger />)).toThrow(
			"ToolCall.Trigger must be rendered inside ToolCall.Root.",
		);
	});

	test("parts forward className, ref, and data attributes to their elements", () => {
		const refs = [0, 1, 2].map(() => vi.fn<(node: HTMLElement | null) => void>());
		render(
			<ToolCall.Root status="done" ref={refs[0]} className="class-0" data-testid="part-0">
				<ToolCall.Trigger ref={refs[1]} className="class-1" data-testid="part-1">
					<ToolCall.Name>list_endpoints</ToolCall.Name>
				</ToolCall.Trigger>
				<ToolCall.Content ref={refs[2]} className="class-2" data-testid="part-2">
					No endpoints.
				</ToolCall.Content>
			</ToolCall.Root>,
		);
		for (const [index, slot] of ["tool-call", "tool-call-trigger", "tool-call-content"].entries()) {
			const element = document.querySelector(`[data-slot~="${slot}"]`);
			expect(element).toHaveClass(`class-${index}`);
			expect(element).toHaveAttribute("data-testid", `part-${index}`);
			expect(refs[index]).toHaveBeenLastCalledWith(element);
		}
	});
});
