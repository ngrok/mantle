import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { ToastIntent } from "./toast.js";
import { Toast } from "./toast.js";

function getToastRoot(container: HTMLElement) {
	return container.querySelector('[data-slot="toast"]');
}

describe("Toast", () => {
	test("renders the message", () => {
		// `ToastIntent` is the public name for the toast tone union; annotating
		// the prop value here keeps the exported type exercised by tsc.
		const intent: ToastIntent = "success";
		render(
			<Toast.Root intent={intent}>
				<Toast.Message>Changes saved</Toast.Message>
			</Toast.Root>,
		);
		expect(screen.getByText("Changes saved")).toBeInTheDocument();
	});

	describe("intent", () => {
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

		test("`intent` is required at the type level", () => {
			const missingIntent = (
				// @ts-expect-error -- intent is required on Toast.Root
				<Toast.Root>
					<Toast.Message>message</Toast.Message>
				</Toast.Root>
			);
			expect(missingIntent).toBeDefined();
		});
	});

	describe("Icon", () => {
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
	});

	test("renders the toast container with the intent bar overlapping the border", () => {
		const { container } = render(
			<Toast.Root intent="info">
				<Toast.Message>message</Toast.Message>
			</Toast.Root>,
		);
		// The intent bar must overlap the toast border: overflow-hidden on the
		// root would clip the bar's -inset-px overhang (see the warning comment
		// in Toast.Root's className in toast.tsx).
		const root = getToastRoot(container);
		expect(root).toBeInTheDocument();
		expect(root).not.toHaveClass("overflow-hidden");
		const bar = container.querySelector('[aria-hidden="true"]');
		expect(bar).not.toBeNull();
		expect(bar).toHaveClass("-inset-px");
	});
});
