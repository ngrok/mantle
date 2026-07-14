import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { Alert } from "./alert.js";

function getAlertRoot(container: HTMLElement) {
	return container.querySelector('[data-slot="alert"]');
}

describe("Alert", () => {
	test("renders title and description", () => {
		render(
			<Alert.Root intent="info">
				<Alert.Content>
					<Alert.Title>Heads up</Alert.Title>
					<Alert.Description>Something happened.</Alert.Description>
				</Alert.Content>
			</Alert.Root>,
		);
		expect(screen.getByText("Heads up")).toBeInTheDocument();
		expect(screen.getByText("Something happened.")).toBeInTheDocument();
	});

	describe("intent", () => {
		test.each([
			["danger", "text-danger-700"],
			["important", "text-important-700"],
			["info", "text-info-700"],
			["success", "text-success-700"],
			["warning", "text-warning-700"],
		] as const)(`renders intent="%s" with tone class %s`, (intent, toneClass) => {
			const { container } = render(
				<Alert.Root intent={intent}>
					<Alert.Content>
						<Alert.Title>Title</Alert.Title>
					</Alert.Content>
				</Alert.Root>,
			);
			expect(getAlertRoot(container)).toHaveClass(toneClass);
		});

		test("`intent` is required at the type level", () => {
			const missingIntent = (
				// @ts-expect-error -- intent is required on Alert.Root
				<Alert.Root>
					<Alert.Content>
						<Alert.Title>Title</Alert.Title>
					</Alert.Content>
				</Alert.Root>
			);
			expect(missingIntent).toBeDefined();
		});
	});

	describe("Icon", () => {
		test("renders a default icon for the intent", () => {
			const { container } = render(
				<Alert.Root intent="danger">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>Title</Alert.Title>
					</Alert.Content>
				</Alert.Root>,
			);
			expect(container.querySelector('[data-slot="alert-icon"]')).toBeInTheDocument();
		});

		test("renders a custom svg in place of the default icon", () => {
			const { container } = render(
				<Alert.Root intent="info">
					<Alert.Icon svg={<svg data-testid="custom-icon" />} />
					<Alert.Content>
						<Alert.Title>Title</Alert.Title>
					</Alert.Content>
				</Alert.Root>,
			);
			expect(container.querySelector('[data-testid="custom-icon"]')).toBeInTheDocument();
		});
	});

	describe("DismissIconButton", () => {
		test("renders a neutral ghost icon button with an accessible label and fires onClick", async () => {
			const onDismiss = vi.fn<() => void>();
			render(
				<Alert.Root intent="warning">
					<Alert.Content>
						<Alert.Title>Title</Alert.Title>
						<Alert.DismissIconButton onClick={onDismiss} />
					</Alert.Content>
				</Alert.Root>,
			);
			const button = screen.getByRole("button", { name: "Dismiss Alert" });
			expect(button).toHaveAttribute("data-appearance", "ghost");
			expect(button).toHaveAttribute("data-intent", "neutral");
			await userEvent.click(button);
			expect(onDismiss).toHaveBeenCalledOnce();
		});
	});

	describe("appearance", () => {
		test(`appearance="banner" removes the rounded corners`, () => {
			const { container } = render(
				<Alert.Root intent="info" appearance="banner">
					<Alert.Content>
						<Alert.Title>Title</Alert.Title>
					</Alert.Content>
				</Alert.Root>,
			);
			expect(getAlertRoot(container)).toHaveClass("rounded-none");
		});
	});
});
