import { act, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, test } from "vitest";
import { useInertSiblings } from "./use-inert-siblings.js";

function Row({ active = true, extra = false }: { active?: boolean; extra?: boolean }) {
	const ref = useRef<HTMLDivElement>(null);
	useInertSiblings(ref, { active });
	return (
		<div>
			<div data-testid="rail" />
			<div data-testid="card" />
			<div ref={ref} data-testid="panel" />
			{extra && <div data-testid="late" />}
		</div>
	);
}

describe("useInertSiblings", () => {
	test("makes every other child of the parent inert and leaves the element itself alone", () => {
		render(<Row />);
		expect(screen.getByTestId("rail").inert).toBe(true);
		expect(screen.getByTestId("card").inert).toBe(true);
		expect(screen.getByTestId("panel").inert).toBe(false);
	});

	test("an inactive hook sets nothing", () => {
		render(<Row active={false} />);
		expect(screen.getByTestId("card").inert).toBe(false);
	});

	test("releasing the hook clears inert from the siblings it set", () => {
		const { rerender } = render(<Row />);
		rerender(<Row active={false} />);
		expect(screen.getByTestId("rail").inert).toBe(false);
		expect(screen.getByTestId("card").inert).toBe(false);
	});

	test("a sibling that was inert already stays inert on release", () => {
		const { rerender } = render(<Row active={false} />);
		screen.getByTestId("card").inert = true;
		rerender(<Row />);
		rerender(<Row active={false} />);
		expect(screen.getByTestId("card").inert).toBe(true);
		expect(screen.getByTestId("rail").inert).toBe(false);
	});

	test("a sibling that mounts while active goes inert and is released with the others", async () => {
		const { rerender } = render(<Row />);
		rerender(<Row extra />);
		// Why wait: a MutationObserver delivers its records in a microtask.
		await act(async () => {
			await Promise.resolve();
		});
		expect(screen.getByTestId("late").inert).toBe(true);
		rerender(<Row active={false} extra />);
		expect(screen.getByTestId("late").inert).toBe(false);
	});
});
