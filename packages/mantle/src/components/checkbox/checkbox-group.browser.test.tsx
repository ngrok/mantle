import { render, screen } from "@testing-library/react";
import { userEvent as testingLibraryUserEvent } from "@testing-library/user-event";
import axe from "axe-core";
import type { MouseEvent } from "react";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { commands, page, userEvent } from "vitest/browser";
import mantleCss from "../../mantle.css?raw";
import * as Choice from "../choice/choice-parts.js";
import * as CheckboxGroup from "./checkbox-group-parts.js";

let styleElement: HTMLStyleElement;

/** The `mantle.css` rule that lifts the controls in a card's content over its checkbox. */
function coveredItemContentRule(): string {
	const rule = /:where\(\.covered-item-content\)[^{]*\{[^}]*\}/.exec(mantleCss)?.[0];
	if (rule == null) {
		throw new Error("mantle.css holds no covered-item-content rule.");
	}
	return rule;
}

// Why the compiled CSS: which element takes a click depends on the real layout of the card and
// its checkbox. Without the utilities, the checkbox is in the flow and every click reaches it.
beforeAll(async () => {
	styleElement = document.createElement("style");
	styleElement.textContent = [
		await commands.tailwindCss("./checkbox.tsx"),
		await commands.tailwindCss("./checkbox-group.tsx"),
		await commands.tailwindCss("../choice/choice.tsx"),
		coveredItemContentRule(),
	].join("\n");
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

/** Renders a button, Tunnels, Gateway (disabled), and Agents cards, and a second button. */
function renderInterests() {
	const onValueChange = vi.fn<(value: string[]) => void>();
	render(
		<div style={{ width: 400 }}>
			<button type="button">Before</button>
			<CheckboxGroup.Root aria-label="Interests" onValueChange={onValueChange}>
				<CheckboxGroup.Card value="tunnels">Tunnels</CheckboxGroup.Card>
				<CheckboxGroup.Card value="gateway" disabled>
					Gateway
				</CheckboxGroup.Card>
				<CheckboxGroup.Card value="agents">Agents</CheckboxGroup.Card>
			</CheckboxGroup.Root>
			<button type="button">After</button>
		</div>,
	);
	return { onValueChange };
}

// Why role queries only: a test finds a checkbox by its role, as it finds a native one, and it
// must not need to know which element of the card takes the click.
describe("checkbox cards found by their role", () => {
	test("a Playwright click and a Testing Library click toggle the checkbox itself", async () => {
		const onValueChange = vi.fn<(value: string[]) => void>();
		render(
			<div style={{ width: 400 }}>
				<CheckboxGroup.Root aria-label="Interests" onValueChange={onValueChange}>
					<CheckboxGroup.Card value="tunnels">
						<Choice.Root>
							<Choice.Content>
								<Choice.Title>Tunnels</Choice.Title>
								<Choice.Description>Put a local service online.</Choice.Description>
							</Choice.Content>
							<Choice.Indicator>
								<CheckboxGroup.Indicator />
							</Choice.Indicator>
						</Choice.Root>
					</CheckboxGroup.Card>
					<CheckboxGroup.Card value="agents">
						<CheckboxGroup.ItemContent>Agents</CheckboxGroup.ItemContent>
						<CheckboxGroup.Indicator />
					</CheckboxGroup.Card>
				</CheckboxGroup.Root>
			</div>,
		);

		await page.getByRole("checkbox", { name: "Tunnels" }).click();
		await testingLibraryUserEvent.setup().click(screen.getByRole("checkbox", { name: "Agents" }));
		await userEvent.click(screen.getByRole("checkbox", { name: "Tunnels" }));
		// Why: Testing Library sends a click to the element it names, so a click on the text still toggles.
		await testingLibraryUserEvent.setup().click(screen.getByText("Agents"));

		expect(screen.getByRole("checkbox", { name: "Tunnels" })).not.toBeChecked();
		expect(screen.getByRole("checkbox", { name: "Agents" })).not.toBeChecked();
		expect(onValueChange.mock.calls.map(([value]) => value)).toEqual([
			["tunnels"],
			["tunnels", "agents"],
			["agents"],
			[],
		]);
	});

	test("each checkbox covers its card, so assistive technology outlines the whole card", () => {
		renderInterests();

		const checkbox = screen.getByRole("checkbox", { name: "Tunnels" });
		const checkboxBox = checkbox.getBoundingClientRect();
		// Why the client size: the checkbox covers the card inside its border.
		const card = checkbox.parentElement;
		expect([checkboxBox.width, checkboxBox.height]).toEqual([
			card?.clientWidth,
			card?.clientHeight,
		]);
		expect(checkboxBox.width).toBeGreaterThan(300);
	});

	test("a pointer click on a card's edge toggles it, and links in a card keep their clicks", async () => {
		const onLinkClick = vi.fn<(event: MouseEvent) => void>((event) => event.preventDefault());
		render(
			<div style={{ width: 400 }}>
				<CheckboxGroup.Root aria-label="Interests">
					<CheckboxGroup.Card value="tunnels" data-testid="tunnels">
						Tunnels{" "}
						<a href="#tunnels" onClick={onLinkClick}>
							tunnel docs
						</a>
					</CheckboxGroup.Card>
					<CheckboxGroup.Card value="gateway" disabled>
						Gateway{" "}
						<a href="#gateway" onClick={onLinkClick}>
							gateway docs
						</a>
					</CheckboxGroup.Card>
				</CheckboxGroup.Root>
			</div>,
		);

		await page.getByRole("link", { name: "tunnel docs" }).click();
		await page.getByRole("link", { name: "gateway docs" }).click();
		expect(onLinkClick).toHaveBeenCalledTimes(2);
		expect(screen.getByRole("checkbox", { name: /Tunnels/ })).not.toBeChecked();

		await page.getByTestId("tunnels").click({ position: { x: 380, y: 4 } });
		expect(screen.getByRole("checkbox", { name: /Tunnels/ })).toBeChecked();
	});
});

describe("CheckboxGroup keyboard", () => {
	test("each enabled checkbox is its own Tab stop, and Space toggles it", async () => {
		const { onValueChange } = renderInterests();
		screen.getByRole("button", { name: "Before" }).focus();

		await userEvent.keyboard("{Tab}");
		expect(screen.getByRole("checkbox", { name: "Tunnels" })).toHaveFocus();
		await userEvent.keyboard(" ");
		await userEvent.keyboard("{Tab}");
		expect(screen.getByRole("checkbox", { name: "Agents" })).toHaveFocus();
		await userEvent.keyboard(" ");
		await userEvent.keyboard("{Tab}");
		expect(screen.getByRole("button", { name: "After" })).toHaveFocus();

		expect(onValueChange).toHaveBeenCalledTimes(2);
		expect(onValueChange).toHaveBeenLastCalledWith(["tunnels", "agents"]);
	});

	test("a click on the card focuses its checkbox", async () => {
		renderInterests();

		await page.getByRole("checkbox", { name: "Agents" }).click();

		expect(screen.getByRole("checkbox", { name: "Agents" })).toHaveFocus();
	});
});

describe("CheckboxGroup reset", () => {
	test("a reset button returns an uncontrolled group to defaultValue", async () => {
		const onValueChange = vi.fn<(value: string[]) => void>();
		render(
			<form aria-label="Survey">
				<CheckboxGroup.Root
					aria-label="Interests"
					name="interests"
					defaultValue={["agents"]}
					onValueChange={onValueChange}
				>
					<CheckboxGroup.Card value="tunnels">Tunnels</CheckboxGroup.Card>
					<CheckboxGroup.Card value="agents">Agents</CheckboxGroup.Card>
				</CheckboxGroup.Root>
				<button type="reset">Reset</button>
			</form>,
		);
		await userEvent.click(screen.getByRole("checkbox", { name: "Tunnels" }));
		await userEvent.click(screen.getByRole("checkbox", { name: "Agents" }));

		await userEvent.click(screen.getByRole("button", { name: "Reset" }));

		await vi.waitFor(() => {
			expect(screen.getByRole("checkbox", { name: "Agents" })).toBeChecked();
		});
		expect(screen.getByRole("checkbox", { name: "Tunnels" })).not.toBeChecked();
		expect(onValueChange).toHaveBeenLastCalledWith(["agents"]);
	});

	test("a reset button reports defaultValue to a controlled group and keeps its value", async () => {
		const onValueChange = vi.fn<(value: string[]) => void>();
		function Controlled({ value }: { value: string[] }) {
			return (
				<form aria-label="Survey">
					<CheckboxGroup.Root
						aria-label="Interests"
						name="interests"
						value={value}
						onValueChange={onValueChange}
					>
						<CheckboxGroup.Card value="tunnels">Tunnels</CheckboxGroup.Card>
						<CheckboxGroup.Card value="agents">Agents</CheckboxGroup.Card>
					</CheckboxGroup.Root>
					<button type="reset">Reset</button>
				</form>
			);
		}
		const { rerender } = render(<Controlled value={[]} />);
		rerender(<Controlled value={["tunnels", "agents"]} />);

		await userEvent.click(screen.getByRole("button", { name: "Reset" }));

		await vi.waitFor(() => {
			expect(onValueChange).toHaveBeenCalledTimes(1);
		});
		expect(onValueChange).toHaveBeenLastCalledWith([]);
		expect(screen.getByRole("checkbox", { name: "Tunnels" })).toBeChecked();
		expect(screen.getByRole("checkbox", { name: "Agents" })).toBeChecked();
	});
});

test("cards with a disabled card have no axe violations", async () => {
	const { container } = render(
		<CheckboxGroup.Root aria-label="Interests" defaultValue={["tunnels"]} name="interests">
			<CheckboxGroup.Card value="tunnels">
				<CheckboxGroup.ItemContent>Tunnels</CheckboxGroup.ItemContent>
				<CheckboxGroup.Indicator />
			</CheckboxGroup.Card>
			<CheckboxGroup.Card value="gateway" disabled>
				<CheckboxGroup.ItemContent>Gateway</CheckboxGroup.ItemContent>
				<CheckboxGroup.Indicator />
			</CheckboxGroup.Card>
		</CheckboxGroup.Root>,
	);
	const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
	expect(results.violations).toEqual([]);
});
