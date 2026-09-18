import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { MouseEvent, ReactNode } from "react";
import { toast as sonnerToast } from "sonner";
import { describe, expect, test, vi } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import { makeToast, resolveToastDuration, Toast, Toaster } from "./toast.js";

function getToastRoot(container: HTMLElement) {
	return container.querySelector('[data-slot="toast"]');
}

describe("Toast", () => {
	describe("intent", () => {
		// Why the class: the bar carries no data attribute, so its class is the only observable of the `intentBackgroundColor` lookup.
		test.each([
			["danger", "bg-danger-600"],
			["info", "bg-accent-600"],
			["success", "bg-success-600"],
			["warning", "bg-warning-600"],
		] as const)(`renders intent="%s" with the %s bar accent`, (intent, barClass) => {
			const { container } = render(
				<Toast.Root intent={intent}>
					<Toast.Message>message</Toast.Message>
				</Toast.Root>,
			);
			const bar = container.querySelector('[aria-hidden="true"]');
			expect(bar).not.toBeNull();
			expect(bar).toHaveClass(barClass);
		});
	});

	describe("Icon", () => {
		// Why the class: the icon carries no intent attribute, so its tone class is the only observable of the intent `switch`.
		test.each([
			["danger", "text-danger-600"],
			["warning", "text-warning-600"],
			["success", "text-success-600"],
			["info", "text-accent-600"],
		] as const)(`renders the default icon for intent="%s" with %s`, (intent, toneClass) => {
			const { container } = render(
				<Toast.Root intent={intent}>
					<Toast.Icon />
					<Toast.Message>message</Toast.Message>
				</Toast.Root>,
			);
			const icon = container.querySelector('[data-slot="toast-icon"]');
			expect(icon).not.toBeNull();
			expect(icon).toHaveClass(toneClass);
		});

		// Regression: the info branch rendered its default icon and ignored `svg`.
		test.each(["danger", "warning", "success", "info"] as const)(
			`renders a custom svg for intent="%s"`,
			(intent) => {
				render(
					<Toast.Root intent={intent}>
						<Toast.Icon svg={<svg data-testid="custom-icon" />} />
						<Toast.Message>message</Toast.Message>
					</Toast.Root>,
				);
				expect(screen.getByTestId("custom-icon")).toHaveAttribute("data-slot", "toast-icon");
			},
		);
	});

	describe("resolveToastDuration", () => {
		test.each([
			[0, Number.POSITIVE_INFINITY],
			[-1, Number.POSITIVE_INFINITY],
			[5000, 5000],
			[undefined, undefined],
		])("resolves %s to %s", (input, expected) => {
			expect(resolveToastDuration(input)).toBe(expected);
		});
	});
});

describe("Toast.Root label slot", () => {
	function Harness({ children }: { children: ReactNode }) {
		return <Toast.Root intent="info">{children}</Toast.Root>;
	}

	test("wraps children in a contents label div directly under the root", () => {
		const { container } = render(
			<Toast.Root intent="info">
				<Toast.Message>Saved</Toast.Message>
			</Toast.Root>,
		);

		const root = getToastRoot(container);
		const label = root?.querySelector('[data-slot="toast-label"]');
		expect(label).toHaveTextContent("Saved");
		expect(label?.parentElement).toBe(root);
		// A `<span>` may not contain the `<p>` that `Toast.Message` renders.
		expect(label?.tagName).toBe("DIV");
	});

	test("keeps rendering when a translated text child swaps to an element", () => {
		const { container, rerender } = render(<Harness>Saving…</Harness>);
		const root = getToastRoot(container);
		if (root == null) {
			throw new Error("expected a mounted toast root");
		}
		translateTextNodes(root);
		expect(root).toHaveTextContent("[Saving…-es]");

		rerender(
			<Harness>
				<Toast.Message>Saved</Toast.Message>
			</Harness>,
		);

		expect(root.querySelector("font")).toBeNull();
		expect(root).toHaveTextContent("Saved");
	});

	test("keeps rendering when a translated text child unmounts", () => {
		const { container, rerender } = render(<Harness>Saving…</Harness>);
		const root = getToastRoot(container);
		if (root == null) {
			throw new Error("expected a mounted toast root");
		}
		translateTextNodes(root);
		expect(root).toHaveTextContent("[Saving…-es]");

		rerender(<Harness>{null}</Harness>);

		expect(root).toHaveTextContent("");
	});
});

describe("Toast.Action", () => {
	function renderToast(message: string, action: ReactNode) {
		render(<Toaster />);
		makeToast(
			<Toast.Root intent="info">
				<Toast.Message>{message}</Toast.Message>
				{action}
			</Toast.Root>,
		);
	}

	test("dismisses the toast on click", async () => {
		const user = userEvent.setup();
		renderToast("Saved", <Toast.Action>Dismiss</Toast.Action>);

		await user.click(await screen.findByRole("button", { name: "Dismiss" }));

		// Why `waitFor`: sonner unmounts a dismissed toast on a timer.
		await waitFor(() => {
			expect(screen.queryByText("Saved")).toBeNull();
		});
	});

	test("keeps the toast when `onClick` calls `preventDefault`", async () => {
		const user = userEvent.setup();
		// Why the spy: a dismissed toast stays in the DOM until sonner's unmount
		// timer fires, so the skipped `dismiss` call is the only synchronous trace.
		const dismiss = vi.spyOn(sonnerToast, "dismiss");
		const handleClick = vi.fn<(event: MouseEvent<HTMLButtonElement>) => void>((event) => {
			event.preventDefault();
		});
		renderToast("Draft kept", <Toast.Action onClick={handleClick}>Keep</Toast.Action>);

		await user.click(await screen.findByRole("button", { name: "Keep" }));

		expect(handleClick).toHaveBeenCalledTimes(1);
		expect(dismiss).toHaveBeenCalledTimes(0);
	});
});

/**
 * Type-level contracts, owned by `pnpm typecheck` and not by a `test()`. A
 * `@ts-expect-error` that compiles is the assertion; a runtime `expect` beside
 * it reads as coverage the vitest run does not have.
 */
export function typeLevelContracts() {
	return (
		// @ts-expect-error -- intent is required on Toast.Root
		<Toast.Root>
			<Toast.Message>message</Toast.Message>
		</Toast.Root>
	);
}
