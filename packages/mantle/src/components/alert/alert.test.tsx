import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { $cssProperties } from "../../types/index.js";
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

	describe("ExpandButton", () => {
		test("reserves room for its count and rotates the caret when expanded", () => {
			const { container } = render(
				<Alert.Root
					intent="warning"
					style={$cssProperties({ "--alert-control-color": "var(--color-neutral-700)" })}
				>
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>Usage limit approaching</Alert.Title>
						<Alert.ExpandButton count={2} expanded />
					</Alert.Content>
				</Alert.Root>,
			);

			expect(container.querySelector('[data-slot="alert-expand-button"]')).toHaveAttribute(
				"aria-expanded",
				"true",
			);
			expect(container.querySelector('[data-slot="alert"]')).toHaveClass(
				"has-data-alert-expand:[&_[data-slot=alert-content]]:pr-12",
				"md:has-data-alert-expand:[&_[data-slot=alert-content]]:pr-[5.5rem]",
			);
			expect(container.querySelector('[data-slot="alert-content"]')).not.toHaveClass(
				"has-data-alert-expand:pr-12",
			);
			expect(container.querySelector('[data-slot="alert-expand-button"] svg')).toHaveClass(
				"-rotate-180",
				"duration-150",
			);
			expect(container.querySelector('[data-slot="alert-expand-button"]')).toHaveClass(
				"top-1.5",
				"text-(--alert-control-color)",
				"not-disabled:hover:bg-(--alert-control-hover-bg)",
				"not-disabled:hover:text-(--alert-control-hover-color)",
			);
			const root = container.querySelector('[data-slot="alert"]');
			expect(root?.getAttribute("style")).toContain("--alert-control-color");
			expect(root?.getAttribute("style")).toContain("--alert-control-hover-color");
			expect(root?.getAttribute("style")).toContain("--alert-control-hover-bg");
			expect(root?.getAttribute("style")).toContain(
				"--alert-control-color: var(--color-neutral-700)",
			);
		});

		test("positions dismiss to the left and reserves both controls when composed together", () => {
			const { container } = render(
				<Alert.Root intent="warning">
					<Alert.Content>
						<Alert.Title>Usage limit approaching</Alert.Title>
						<Alert.DismissIconButton />
						<Alert.ExpandButton count={2} expanded={false} />
					</Alert.Content>
				</Alert.Root>,
			);

			expect(container.querySelector('[data-slot="alert"]')).toHaveClass(
				"has-data-alert-dismiss:pr-10",
				"has-data-alert-expand:[&_[data-slot=alert-dismiss-icon-button]]:right-16",
				"md:has-data-alert-expand:[&_[data-slot=alert-dismiss-icon-button]]:right-24",
				"has-data-alert-expand:[&_[data-slot=alert-content]]:pr-12",
				"md:has-data-alert-expand:[&_[data-slot=alert-content]]:pr-[5.5rem]",
			);
			expect(container.querySelector('[data-slot="alert-dismiss-icon-button"]')).toHaveClass(
				"top-1.5",
				"text-(--alert-control-color)",
				"not-disabled:hover:bg-(--alert-control-hover-bg)",
				"not-disabled:hover:text-(--alert-control-hover-color)",
			);
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
