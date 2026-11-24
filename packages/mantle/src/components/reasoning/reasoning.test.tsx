import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import * as Reasoning from "./reasoning-parts.js";

function Thoughts({ streaming, label }: { streaming?: boolean; label?: ReactNode }) {
	return (
		<Reasoning.Root streaming={streaming} data-streaming="">
			<Reasoning.Trigger>{label}</Reasoning.Trigger>
			<Reasoning.Content>The user wants endpoints with no policy.</Reasoning.Content>
		</Reasoning.Root>
	);
}

describe("Reasoning", () => {
	test("reads Thinking… while it streams, then its children, and Reasoning with no children", () => {
		const { rerender } = render(<Thoughts streaming label="Thought for 4 seconds" />);
		expect(screen.getByRole("button", { name: "Thinking…" })).toBeInTheDocument();

		rerender(<Thoughts label="Thought for 4 seconds" />);
		expect(screen.getByRole("button", { name: "Thought for 4 seconds" })).toBeInTheDocument();

		rerender(<Thoughts />);
		expect(screen.getByRole("button", { name: "Reasoning" })).toBeInTheDocument();
	});

	test.each([false, ""])("keeps a fallback name for empty children (%s)", (label) => {
		const { container, rerender } = render(<Thoughts streaming label={label} />);
		translateTextNodes(container);

		rerender(<Thoughts label={label} />);

		expect(screen.getByRole("button", { name: "Reasoning" })).toBeInTheDocument();
		rerender(<Thoughts label={0} />);
		expect(screen.getByRole("button", { name: "0" })).toBeInTheDocument();
	});

	test("starts closed and opens on a click", async () => {
		const user = userEvent.setup();
		render(<Thoughts />);
		const trigger = screen.getByRole("button", { name: "Reasoning" });
		expect(trigger).toHaveAttribute("aria-expanded", "false");

		await user.click(trigger);

		expect(trigger).toHaveAttribute("aria-expanded", "true");
	});

	test("Root owns data-streaming even with a conflicting attribute, and parts join data-slot", () => {
		const { container, rerender } = render(<Thoughts streaming />);
		const root = container.querySelector('[data-slot~="reasoning"]');
		expect(root).toHaveAttribute("data-streaming", "");
		expect(screen.getByRole("button")).toHaveAttribute(
			"data-slot",
			"reasoning-trigger accordion-trigger",
		);
		expect(container.querySelector('[data-slot~="reasoning-content"]')).toHaveTextContent(
			"The user wants endpoints with no policy.",
		);

		rerender(<Thoughts />);
		expect(root).not.toHaveAttribute("data-streaming");
	});

	test("the trigger survives a translated page when the label changes", async () => {
		const user = userEvent.setup();
		const { container, rerender } = render(<Thoughts streaming />);
		translateTextNodes(container);
		await user.click(screen.getByRole("button"));
		expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");

		rerender(<Thoughts label="Thought for 4 seconds" />);

		expect(screen.getByRole("button")).toHaveTextContent("Thought for 4 seconds");
		translateTextNodes(container);
		rerender(<Thoughts label={<span>Thought for 8 seconds</span>} />);
		expect(screen.getByRole("button", { name: "Thought for 8 seconds" })).toBeInTheDocument();
	});

	test("a translated multi-node label survives a new streaming turn", () => {
		const seconds = 4;
		const { container, rerender } = render(<Thoughts label={<>Thought for {seconds} seconds</>} />);
		translateTextNodes(container);

		rerender(<Thoughts streaming label={<>Thought for {seconds} seconds</>} />);

		expect(screen.getByRole("button")).toHaveTextContent("Thinking…");
	});

	test("a part outside Root throws", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<Reasoning.Trigger />)).toThrow(
			"Reasoning.Trigger must be rendered inside Reasoning.Root.",
		);
	});
});
