import { act, render, screen } from "@testing-library/react";
import { userEvent as testingLibraryUserEvent } from "@testing-library/user-event";
import axe from "axe-core";
import { useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { commands, page, userEvent } from "vitest/browser";
import mantleCss from "../../mantle.css?raw";
import * as Choice from "../choice/choice-parts.js";
import * as SegmentedControl from "../segmented-control/segmented-control-parts.js";
import * as RadioGroup from "./radio-group-parts.js";

let styleElement: HTMLStyleElement;

/** The `mantle.css` rule that lifts the controls in an item's content over its radio. */
function radioItemContentRule(): string {
	const rule = /:where\(\.radio-item-content\)[^{]*\{[^}]*\}/.exec(mantleCss)?.[0];
	if (rule == null) {
		throw new Error("mantle.css holds no radio-item-content rule.");
	}
	return rule;
}

// Why the compiled CSS: which element takes a click depends on the real layout of the item and
// its radio. Without the utilities, the radio is in the flow and every click reaches it.
beforeAll(async () => {
	styleElement = document.createElement("style");
	styleElement.textContent = [
		await commands.tailwindCss("./primitive.tsx"),
		await commands.tailwindCss("./radio-group.tsx"),
		await commands.tailwindCss("../choice/choice.tsx"),
		await commands.tailwindCss("../segmented-control/segmented-control.tsx"),
		radioItemContentRule(),
	].join("\n");
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

/** Renders a button, a group of four plans with "Team" disabled, and a second button. */
function renderPlans({ defaultValue }: { defaultValue?: string } = {}) {
	const onChange = vi.fn<(value: string) => void>();
	render(
		<>
			<button type="button">Before</button>
			<RadioGroup.Root aria-label="Plan" defaultValue={defaultValue} onValueChange={onChange}>
				<RadioGroup.Item value="free">Free</RadioGroup.Item>
				<RadioGroup.Item value="pro">Pro</RadioGroup.Item>
				<RadioGroup.Item value="team" disabled>
					Team
				</RadioGroup.Item>
				<RadioGroup.Item value="enterprise">Enterprise</RadioGroup.Item>
			</RadioGroup.Root>
			<button type="button">After</button>
		</>,
	);
	return { onChange };
}

// Why role queries only: a test finds a radio by its role, as it finds a native one, and it
// must not need to know which element of the item takes the click.
describe("radios found by their role", () => {
	test("a Playwright click and a Testing Library click check the radio itself", async () => {
		const onChange = vi.fn<(value: string) => void>();
		render(
			<RadioGroup.Root aria-label="Plan" defaultValue="free" onValueChange={onChange}>
				<RadioGroup.Item value="free">
					<RadioGroup.Indicator />
					Free
				</RadioGroup.Item>
				<RadioGroup.Card value="pro">
					<Choice.Root>
						<Choice.Indicator>
							<RadioGroup.Indicator />
						</Choice.Indicator>
						<Choice.Content>
							<Choice.Title>Pro</Choice.Title>
							<Choice.Description>For teams that ship every day.</Choice.Description>
						</Choice.Content>
					</Choice.Root>
				</RadioGroup.Card>
				<RadioGroup.Item value="team">
					<RadioGroup.ItemContent>Team</RadioGroup.ItemContent>
				</RadioGroup.Item>
			</RadioGroup.Root>,
		);

		await page.getByRole("radio", { name: "Pro" }).click();
		expect(screen.getByRole("radio", { name: "Pro" })).toBeChecked();

		await testingLibraryUserEvent.setup().click(screen.getByRole("radio", { name: "Team" }));
		expect(screen.getByRole("radio", { name: "Team" })).toBeChecked();

		await userEvent.click(screen.getByRole("radio", { name: "Free" }));
		expect(screen.getByRole("radio", { name: "Free" })).toBeChecked();

		// Why: Testing Library sends a click to the element it names, so a click on the text still checks.
		await testingLibraryUserEvent.setup().click(screen.getByText("Pro"));
		expect(screen.getByRole("radio", { name: "Pro" })).toBeChecked();
		expect(onChange.mock.calls.map(([value]) => value)).toEqual(["pro", "team", "free", "pro"]);
	});

	test("each radio covers its item, so assistive technology outlines the whole item", () => {
		render(
			<div style={{ width: 300 }}>
				<RadioGroup.Root aria-label="Plan" defaultValue="free">
					<RadioGroup.Item value="free">
						<RadioGroup.Indicator />
						Free
					</RadioGroup.Item>
				</RadioGroup.Root>
				<SegmentedControl.Root aria-label="Environment" defaultValue="dev">
					<SegmentedControl.Item value="dev">Dev</SegmentedControl.Item>
				</SegmentedControl.Root>
			</div>,
		);

		for (const name of ["Free", "Dev"]) {
			const radio = screen.getByRole("radio", { name });
			const radioBox = radio.getBoundingClientRect();
			const itemBox = radio.parentElement?.getBoundingClientRect();
			expect([radioBox.width, radioBox.height]).toEqual([itemBox?.width, itemBox?.height]);
			expect(radioBox.width).toBeGreaterThan(20);
		}
	});

	test("a SegmentedControl radio takes a Playwright click", async () => {
		render(
			<div style={{ width: 300 }}>
				<SegmentedControl.Root aria-label="Environment" defaultValue="prod">
					<SegmentedControl.Item value="dev">Dev</SegmentedControl.Item>
					<SegmentedControl.Item value="prod">Prod</SegmentedControl.Item>
				</SegmentedControl.Root>
			</div>,
		);

		await page.getByRole("radio", { name: "Dev" }).click();

		expect(screen.getByRole("radio", { name: "Dev" })).toBeChecked();
	});
});

describe("RadioGroup keyboard", () => {
	test("Tab enters on the checked radio, arrows check and wrap past a disabled one, and Tab leaves", async () => {
		const { onChange } = renderPlans({ defaultValue: "pro" });
		screen.getByRole("button", { name: "Before" }).focus();

		await userEvent.keyboard("{Tab}");
		expect(screen.getByRole("radio", { name: "Pro" })).toHaveFocus();

		await userEvent.keyboard("{ArrowDown}");
		expect(screen.getByRole("radio", { name: "Enterprise" })).toHaveFocus();
		expect(screen.getByRole("radio", { name: "Enterprise" })).toBeChecked();

		await userEvent.keyboard("{ArrowRight}");
		expect(screen.getByRole("radio", { name: "Free" })).toBeChecked();

		await userEvent.keyboard("{ArrowUp}");
		expect(screen.getByRole("radio", { name: "Enterprise" })).toBeChecked();
		expect(onChange.mock.calls.map(([value]) => value)).toEqual([
			"enterprise",
			"free",
			"enterprise",
		]);

		await userEvent.keyboard("{Tab}");
		expect(screen.getByRole("button", { name: "After" })).toHaveFocus();

		await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
		expect(screen.getByRole("radio", { name: "Enterprise" })).toHaveFocus();
	});

	test("in right-to-left text, ArrowLeft moves forward and ArrowRight moves back and wraps", async () => {
		render(
			<RadioGroup.Root aria-label="Plan" defaultValue="free" dir="rtl">
				<RadioGroup.Item value="free">Free</RadioGroup.Item>
				<RadioGroup.Item value="pro">Pro</RadioGroup.Item>
				<RadioGroup.Item value="team">Team</RadioGroup.Item>
			</RadioGroup.Root>,
		);
		screen.getByRole("radio", { name: "Free" }).focus();

		await userEvent.keyboard("{ArrowLeft}");
		expect(screen.getByRole("radio", { name: "Pro" })).toBeChecked();

		await userEvent.keyboard("{ArrowRight}{ArrowRight}");
		expect(screen.getByRole("radio", { name: "Team" })).toBeChecked();
	});

	test("an arrow key with Control, Alt, or Meta keeps the checked radio", async () => {
		renderPlans({ defaultValue: "enterprise" });
		screen.getByRole("radio", { name: "Enterprise" }).focus();

		await userEvent.keyboard(
			"{Control>}{ArrowDown}{/Control}{Alt>}{ArrowRight}{/Alt}{Meta>}{ArrowDown}{/Meta}",
		);

		expect(screen.getByRole("radio", { name: "Enterprise" })).toBeChecked();
	});

	test("with nothing checked, Tab lands on the first radio and Space checks it", async () => {
		const { onChange } = renderPlans();
		screen.getByRole("button", { name: "Before" }).focus();

		await userEvent.keyboard("{Tab}");
		expect(screen.getByRole("radio", { name: "Free" })).toHaveFocus();
		expect(screen.getByRole("radio", { name: "Free" })).not.toBeChecked();

		await userEvent.keyboard(" ");
		expect(screen.getByRole("radio", { name: "Free" })).toBeChecked();
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenLastCalledWith("free");

		await userEvent.keyboard("{ArrowLeft}");
		expect(screen.getByRole("radio", { name: "Enterprise" })).toBeChecked();
		expect(onChange).toHaveBeenLastCalledWith("enterprise");
	});

	test("a click on the item text checks and focuses its radio, so arrows continue from it", async () => {
		renderPlans({ defaultValue: "free" });

		// Why force: the radio covers the text, so the pointer lands on the radio, as a user's does.
		// Playwright's check that the text itself takes the click would fail.
		await userEvent.click(screen.getByText("Pro"), { force: true });
		expect(screen.getByRole("radio", { name: "Pro" })).toBeChecked();

		await userEvent.keyboard("{ArrowDown}");
		expect(screen.getByRole("radio", { name: "Enterprise" })).toBeChecked();
	});
});

describe("RadioGroup item clicks", () => {
	test("a click on item text checks and focuses the radio; a link and a label keep their clicks", async () => {
		const onItemClick = vi.fn<(event: MouseEvent) => void>();
		const onLinkClick = vi.fn<(event: MouseEvent) => void>((event) => event.preventDefault());
		render(
			<RadioGroup.Root aria-label="Plan" defaultValue="free">
				<RadioGroup.Card value="free">Free</RadioGroup.Card>
				<RadioGroup.Card value="pro" id="pro-radio" onClick={onItemClick}>
					<RadioGroup.ItemContent>
						<label htmlFor="pro-radio">Pro</label>
						<p>
							Read the{" "}
							<a href="#terms" onClick={onLinkClick}>
								terms
							</a>
							.
						</p>
					</RadioGroup.ItemContent>
				</RadioGroup.Card>
			</RadioGroup.Root>,
		);
		const pro = screen.getByRole("radio", { name: "Pro" });

		await userEvent.click(screen.getByRole("link", { name: "terms" }));
		expect(onLinkClick).toHaveBeenCalledTimes(1);
		expect(screen.getByRole("radio", { name: "Free" })).toBeChecked();

		// Why force: see "a click on the item text checks and focuses its radio".
		await userEvent.click(screen.getByText("Read the", { exact: false }), { force: true });
		expect(pro).toBeChecked();
		expect(pro).toHaveFocus();
		expect(onItemClick).toHaveBeenCalledTimes(2);

		await userEvent.click(screen.getByText("Free"), { force: true });
		await userEvent.click(screen.getByText("Pro"));
		expect(pro).toBeChecked();
	});
});

describe("RadioGroup forms", () => {
	test("required blocks the form until a radio is checked", async () => {
		render(
			<form aria-label="Plan form">
				<RadioGroup.Root aria-label="Plan" name="plan" required>
					<RadioGroup.Item value="free">Free</RadioGroup.Item>
					<RadioGroup.Item value="pro">Pro</RadioGroup.Item>
				</RadioGroup.Root>
			</form>,
		);
		const form = screen.getByRole<HTMLFormElement>("form", { name: "Plan form" });
		expect(form.checkValidity()).toBe(false);

		await userEvent.click(screen.getByRole("radio", { name: "Pro" }));

		expect(form.checkValidity()).toBe(true);
		expect(new FormData(form).getAll("plan")).toEqual(["pro"]);
	});

	test("a group with no name submits nothing, and its radios still move together", async () => {
		render(
			<form aria-label="Plan form">
				<RadioGroup.Root aria-label="Plan" defaultValue="free">
					<RadioGroup.Item value="free">Free</RadioGroup.Item>
					<RadioGroup.Item value="pro">Pro</RadioGroup.Item>
				</RadioGroup.Root>
			</form>,
		);
		const form = screen.getByRole<HTMLFormElement>("form", { name: "Plan form" });

		await userEvent.click(screen.getByRole("radio", { name: "Free" }));
		await userEvent.keyboard("{ArrowDown}");

		expect(screen.getByRole("radio", { name: "Pro" })).toBeChecked();
		expect(screen.getByRole("radio", { name: "Free" })).not.toBeChecked();
		expect([...new FormData(form).keys()]).toEqual([]);
	});

	test("a group with an empty name submits nothing, like no name", () => {
		render(
			<form aria-label="Plan form">
				<RadioGroup.Root aria-label="Plan" name="" defaultValue="free">
					<RadioGroup.Item value="free">Free</RadioGroup.Item>
				</RadioGroup.Root>
			</form>,
		);
		const form = screen.getByRole<HTMLFormElement>("form", { name: "Plan form" });

		expect([...new FormData(form).keys()]).toEqual([]);
	});

	test("a group outside its form joins it through form", async () => {
		render(
			<>
				<form aria-label="Plan form" id="plan-form" />
				<RadioGroup.Root aria-label="Plan" name="plan" form="plan-form" defaultValue="free">
					<RadioGroup.Item value="free">Free</RadioGroup.Item>
					<RadioGroup.Item value="pro">Pro</RadioGroup.Item>
				</RadioGroup.Root>
			</>,
		);
		const form = screen.getByRole<HTMLFormElement>("form", { name: "Plan form" });

		await userEvent.click(screen.getByRole("radio", { name: "Pro" }));
		expect(new FormData(form).getAll("plan")).toEqual(["pro"]);

		form.reset();
		await vi.waitFor(() => {
			expect(screen.getByRole("radio", { name: "Free" })).toBeChecked();
		});
		expect(new FormData(form).getAll("plan")).toEqual(["free"]);
	});
});

describe("RadioGroup reset", () => {
	test("a reset button keeps a controlled group on its value", async () => {
		const onChange = vi.fn<(value: string) => void>();
		function Controlled({ value }: { value: string }) {
			return (
				<form aria-label="Plan form">
					<RadioGroup.Root aria-label="Plan" name="plan" value={value} onValueChange={onChange}>
						<RadioGroup.Item value="basic">Basic</RadioGroup.Item>
						<RadioGroup.Item value="pro">Pro</RadioGroup.Item>
					</RadioGroup.Root>
					<button type="reset">Reset</button>
				</form>
			);
		}
		const { rerender } = render(<Controlled value="basic" />);
		rerender(<Controlled value="pro" />);

		await userEvent.click(screen.getByRole("button", { name: "Reset" }));

		expect(screen.getByRole("radio", { name: "Pro" })).toBeChecked();
		expect(onChange).not.toHaveBeenCalled();
	});

	test("a reset button returns an uncontrolled group to a defaultValue set after mount", async () => {
		function Uncontrolled({ defaultValue }: { defaultValue?: string }) {
			return (
				<form aria-label="Plan form">
					<RadioGroup.Root aria-label="Plan" name="plan" defaultValue={defaultValue}>
						<RadioGroup.Item value="basic">Basic</RadioGroup.Item>
						<RadioGroup.Item value="pro">Pro</RadioGroup.Item>
					</RadioGroup.Root>
					<button type="reset">Reset</button>
				</form>
			);
		}
		const { rerender } = render(<Uncontrolled />);
		rerender(<Uncontrolled defaultValue="pro" />);
		await userEvent.click(screen.getByRole("radio", { name: "Basic" }));

		await userEvent.click(screen.getByRole("button", { name: "Reset" }));

		await vi.waitFor(() => {
			expect(screen.getByRole("radio", { name: "Pro" })).toBeChecked();
		});
	});

	test("a parent onReset that sets the value checks that radio and submits it", async () => {
		function ResetToBasic() {
			const [value, setValue] = useState("basic");
			return (
				<form aria-label="Plan form" onReset={() => setValue("basic")}>
					<RadioGroup.Root aria-label="Plan" name="plan" value={value} onValueChange={setValue}>
						<RadioGroup.Item value="basic">Basic</RadioGroup.Item>
						<RadioGroup.Item value="pro">Pro</RadioGroup.Item>
					</RadioGroup.Root>
					<button type="reset">Reset</button>
				</form>
			);
		}
		render(<ResetToBasic />);
		const form = screen.getByRole<HTMLFormElement>("form", { name: "Plan form" });
		await userEvent.click(screen.getByRole("radio", { name: "Pro" }));

		await userEvent.click(screen.getByRole("button", { name: "Reset" }));

		await vi.waitFor(() => {
			expect(screen.getByRole("radio", { name: "Basic" })).toBeChecked();
		});
		expect(new FormData(form).getAll("plan")).toEqual(["basic"]);
	});

	test("a reset that a later handler cancels keeps the checked value", async () => {
		const onChange = vi.fn<(value: string) => void>();
		render(
			<form aria-label="Plan form">
				<RadioGroup.Root
					aria-label="Plan"
					name="plan"
					defaultValue="basic"
					onValueChange={onChange}
				>
					<RadioGroup.Item value="basic">Basic</RadioGroup.Item>
					<RadioGroup.Item value="pro">Pro</RadioGroup.Item>
				</RadioGroup.Root>
			</form>,
		);
		const form = screen.getByRole<HTMLFormElement>("form", { name: "Plan form" });
		await userEvent.click(screen.getByRole("radio", { name: "Pro" }));
		form.addEventListener("reset", (event) => event.preventDefault());
		vi.useFakeTimers({ toFake: ["setTimeout"] });

		form.reset();
		act(() => {
			vi.runAllTimers();
		});
		vi.useRealTimers();

		expect(screen.getByRole("radio", { name: "Pro" })).toBeChecked();
		expect(onChange.mock.calls).toEqual([["pro"]]);
	});
});

describe("RadioGroup.InputSandbox clicks", () => {
	/** Renders a "Fixed" item and a "Custom" item whose sandbox holds `control`. */
	function renderAmount(control: ReactNode, onClick?: (event: MouseEvent) => void) {
		render(
			<RadioGroup.Root aria-label="Amount" defaultValue="fixed">
				<RadioGroup.Item value="fixed">Fixed</RadioGroup.Item>
				<RadioGroup.Item aria-label="Custom" value="custom">
					<RadioGroup.ItemContent>
						<RadioGroup.InputSandbox data-testid="sandbox" onClick={onClick}>
							{control}
						</RadioGroup.InputSandbox>
					</RadioGroup.ItemContent>
				</RadioGroup.Item>
			</RadioGroup.Root>,
		);
	}

	test("a caller's onClick that prevents the default keeps the radio unchecked", async () => {
		renderAmount(<input aria-label="Custom amount" />, (event) => event.preventDefault());

		await userEvent.click(screen.getByLabelText("Custom amount"));

		expect(screen.getByRole("radio", { name: "Fixed" })).toBeChecked();
	});

	test("a click on a contenteditable control checks the radio and focuses the control", async () => {
		renderAmount(<div aria-label="Custom note" contentEditable role="textbox" tabIndex={0} />);

		await userEvent.click(screen.getByRole("textbox", { name: "Custom note" }));

		expect(screen.getByRole("radio", { name: "Custom" })).toBeChecked();
		expect(screen.getByRole("textbox", { name: "Custom note" })).toHaveFocus();
	});

	test("a click on the sandbox around a control checks the radio and leaves focus off it", async () => {
		renderAmount(
			<div style={{ padding: 16 }}>
				<input aria-label="Custom amount" />
			</div>,
		);

		await userEvent.click(screen.getByTestId("sandbox"), { position: { x: 4, y: 4 } });

		expect(screen.getByRole("radio", { name: "Custom" })).toBeChecked();
		expect(screen.getByRole("radio", { name: "Custom" })).not.toHaveFocus();
	});
});

test("plain items, a disabled item, and a SegmentedControl have no axe violations", async () => {
	const { container } = render(
		<>
			<RadioGroup.Root aria-label="Plan" defaultValue="free" name="plan">
				<RadioGroup.Item value="free">
					<RadioGroup.Indicator />
					Free
				</RadioGroup.Item>
				<RadioGroup.Item value="pro" disabled>
					<RadioGroup.Indicator />
					Pro
				</RadioGroup.Item>
			</RadioGroup.Root>
			<SegmentedControl.Root aria-label="View" defaultValue="list">
				<SegmentedControl.Item value="list">List</SegmentedControl.Item>
				<SegmentedControl.Item value="grid">Grid</SegmentedControl.Item>
			</SegmentedControl.Root>
		</>,
	);
	const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
	expect(results.violations).toEqual([]);
});
