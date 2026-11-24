import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, test, vi } from "vitest";
import * as Work from "./work-parts.js";

function Answer({ streaming }: { streaming?: boolean }) {
	return (
		<Work.Root streaming={streaming}>
			<Work.Trigger />
			<Work.Content>
				<button type="button">list_endpoints</button>
			</Work.Content>
		</Work.Root>
	);
}

describe("Work", () => {
	test("shows the work while the answer streams and folds it when the answer ends", () => {
		const { rerender } = render(<Answer streaming />);
		expect(screen.getByRole("button", { name: "Hide work" })).toHaveAttribute(
			"aria-expanded",
			"true",
		);

		rerender(<Answer />);

		expect(screen.getByRole("button", { name: "Show work" })).toHaveAttribute(
			"aria-expanded",
			"false",
		);
	});

	test("the reader's toggle wins over streaming", async () => {
		const user = userEvent.setup();
		const { rerender } = render(<Answer streaming />);

		await user.click(screen.getByRole("button", { name: "Hide work" }));
		rerender(<Answer streaming />);
		expect(screen.getByRole("button", { name: "Show work" })).toHaveAttribute(
			"aria-expanded",
			"false",
		);

		await user.click(screen.getByRole("button", { name: "Show work" }));
		rerender(<Answer />);
		expect(screen.getByRole("button", { name: "Hide work" })).toHaveAttribute(
			"aria-expanded",
			"true",
		);
	});

	test("a step the reader used while it streamed stays open when the answer ends", async () => {
		const user = userEvent.setup();
		const { rerender } = render(<Answer streaming />);

		await user.click(screen.getByRole("button", { name: "list_endpoints" }));
		rerender(<Answer />);

		expect(screen.getByRole("button", { name: "Hide work" })).toHaveAttribute(
			"aria-expanded",
			"true",
		);
		expect(screen.getByRole("button", { name: "list_endpoints" })).toHaveFocus();
	});

	test("Root owns data-streaming, and parts join data-slot and pass props through", () => {
		const ref = createRef<HTMLDivElement>();
		const { container, rerender } = render(
			<Work.Root streaming className="mt-2" data-testid="work" ref={ref}>
				<Work.Trigger data-slot="answer-work-trigger" />
				<Work.Content className="gap-2">steps</Work.Content>
			</Work.Root>,
		);
		const root = screen.getByTestId("work");
		expect(root).toBe(ref.current);
		expect(root).toHaveAttribute("data-slot", "work accordion");
		expect(root).toHaveAttribute("data-streaming", "");
		expect(root).toHaveClass("mt-2");
		expect(screen.getByRole("button")).toHaveAttribute(
			"data-slot",
			"answer-work-trigger work-trigger accordion-trigger",
		);
		expect(container.querySelector('[data-slot~="work-content"]')).toHaveClass("gap-2");

		rerender(
			<Work.Root>
				<Work.Trigger />
				<Work.Content>steps</Work.Content>
			</Work.Root>,
		);
		expect(container.querySelector('[data-slot~="work"]')).not.toHaveAttribute("data-streaming");
	});

	test("parts throw outside Work.Root", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<Work.Trigger />)).toThrow(
			"Work.Trigger must be rendered inside Work.Root.",
		);
		expect(() => render(<Work.Content />)).toThrow(
			"Work.Content must be rendered inside Work.Root.",
		);
	});
});
