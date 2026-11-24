import { act, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef, useState } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import * as Choice from "../choice/choice-parts.js";
import * as CheckboxGroup from "./checkbox-group-parts.js";

/** A state mark that a render-props indicator draws, so a test reads React's view of a card. */
const stateMark = ({ checked, disabled }: { checked: boolean; disabled: boolean }) =>
	`${checked ? "on" : "off"}${disabled ? " disabled" : ""}`;

/** Renders an "interests" group of Tunnels, Gateway, and Agents cards inside a form. */
function renderInterests(groupProps: ComponentProps<typeof CheckboxGroup.Root> = {}) {
	render(
		<form aria-label="Survey">
			<CheckboxGroup.Root aria-label="Interests" {...groupProps}>
				{["Tunnels", "Gateway", "Agents"].map((label) => (
					<CheckboxGroup.Card key={label} value={label.toLowerCase()}>
						<CheckboxGroup.ItemContent>{label}</CheckboxGroup.ItemContent>
						<CheckboxGroup.Indicator aria-hidden data-testid={`${label.toLowerCase()}-mark`}>
							{stateMark}
						</CheckboxGroup.Indicator>
					</CheckboxGroup.Card>
				))}
			</CheckboxGroup.Root>
		</form>,
	);
	const form = screen.getByRole("form", { name: "Survey" });
	if (!(form instanceof HTMLFormElement)) {
		throw new Error("The survey did not render a <form>.");
	}
	return form;
}

/** The marks of the three cards, in order. */
const marks = () =>
	["tunnels", "gateway", "agents"].map((value) => screen.getByTestId(`${value}-mark`).textContent);

describe("CheckboxGroup value", () => {
	test("uncontrolled: each click adds or removes one value, and several cards stay checked", async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn<(value: string[]) => void>();
		renderInterests({ defaultValue: ["gateway"], onValueChange });

		await user.click(screen.getByRole("checkbox", { name: "Agents" }));
		await user.click(screen.getByRole("checkbox", { name: "Tunnels" }));
		await user.click(screen.getByRole("checkbox", { name: "Gateway" }));

		expect(onValueChange.mock.calls.map(([value]) => value)).toEqual([
			["gateway", "agents"],
			["gateway", "agents", "tunnels"],
			["agents", "tunnels"],
		]);
		expect(screen.getByRole("checkbox", { name: "Tunnels" })).toBeChecked();
		expect(screen.getByRole("checkbox", { name: "Gateway" })).not.toBeChecked();
		expect(screen.getByRole("checkbox", { name: "Agents" })).toBeChecked();
		expect(marks()).toEqual(["on", "off", "on"]);
	});

	test("controlled: a click reports the next value, and the cards follow the value prop", async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn<(value: string[]) => void>();
		function Controlled() {
			const [value, setValue] = useState(["tunnels"]);
			return (
				<>
					<button type="button" onClick={() => setValue(["agents"])}>
						Only agents
					</button>
					<CheckboxGroup.Root
						aria-label="Interests"
						value={value}
						onValueChange={(next) => {
							onValueChange(next);
							setValue(next);
						}}
					>
						<CheckboxGroup.Card value="tunnels">Tunnels</CheckboxGroup.Card>
						<CheckboxGroup.Card value="agents">Agents</CheckboxGroup.Card>
					</CheckboxGroup.Root>
				</>
			);
		}
		render(<Controlled />);

		await user.click(screen.getByRole("checkbox", { name: "Agents" }));
		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenLastCalledWith(["tunnels", "agents"]);

		await user.click(screen.getByRole("button", { name: "Only agents" }));
		expect(screen.getByRole("checkbox", { name: "Tunnels" })).not.toBeChecked();
		expect(screen.getByRole("checkbox", { name: "Agents" })).toBeChecked();
	});

	test("a controlled group that ignores the change keeps its checkboxes", async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn<(value: string[]) => void>();
		render(
			<CheckboxGroup.Root aria-label="Interests" value={["tunnels"]} onValueChange={onValueChange}>
				<CheckboxGroup.Card value="tunnels">Tunnels</CheckboxGroup.Card>
				<CheckboxGroup.Card value="agents">Agents</CheckboxGroup.Card>
			</CheckboxGroup.Root>,
		);

		await user.click(screen.getByRole("checkbox", { name: "Tunnels" }));

		expect(onValueChange).toHaveBeenLastCalledWith([]);
		expect(screen.getByRole("checkbox", { name: "Tunnels" })).toBeChecked();

		// Why: the next click builds on the value prop, not on the change the parent refused.
		await user.click(screen.getByRole("checkbox", { name: "Agents" }));
		expect(onValueChange).toHaveBeenLastCalledWith(["tunnels", "agents"]);
	});

	test("a script that clicks every card in one event checks them all", async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn<(value: string[]) => void>();
		render(
			<>
				<button
					type="button"
					onClick={() => {
						for (const input of screen.getAllByRole("checkbox")) {
							if (input instanceof HTMLInputElement && !input.checked) {
								input.click();
							}
						}
					}}
				>
					Select all
				</button>
				<CheckboxGroup.Root
					aria-label="Interests"
					defaultValue={["gateway"]}
					onValueChange={onValueChange}
				>
					<CheckboxGroup.Card value="tunnels">Tunnels</CheckboxGroup.Card>
					<CheckboxGroup.Card value="gateway">Gateway</CheckboxGroup.Card>
					<CheckboxGroup.Card value="agents">Agents</CheckboxGroup.Card>
				</CheckboxGroup.Root>
			</>,
		);

		await user.click(screen.getByRole("button", { name: "Select all" }));

		expect(onValueChange).toHaveBeenLastCalledWith(["gateway", "tunnels", "agents"]);
		for (const name of ["Tunnels", "Gateway", "Agents"]) {
			expect(screen.getByRole("checkbox", { name })).toBeChecked();
		}
	});

	test("a disabled group or card reports nothing on a click", async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn<(value: string[]) => void>();
		render(
			<>
				<CheckboxGroup.Root aria-label="Interests" onValueChange={onValueChange}>
					<CheckboxGroup.Card value="tunnels" disabled>
						Tunnels
					</CheckboxGroup.Card>
				</CheckboxGroup.Root>
				<CheckboxGroup.Root aria-label="More" disabled onValueChange={onValueChange}>
					<CheckboxGroup.Card value="agents">Agents</CheckboxGroup.Card>
				</CheckboxGroup.Root>
			</>,
		);

		for (const name of ["Tunnels", "Agents"]) {
			const checkbox = screen.getByRole("checkbox", { name });
			expect(checkbox).toBeDisabled();
			await user.click(screen.getByText(name));
			expect(checkbox).not.toBeChecked();
		}
		expect(onValueChange).toHaveBeenCalledTimes(0);
	});

	test("a click on a card's text toggles its checkbox and focuses it", async () => {
		const user = userEvent.setup();
		renderInterests();

		await user.click(screen.getByText("Gateway"));

		const gateway = screen.getByRole("checkbox", { name: "Gateway" });
		expect(gateway).toBeChecked();
		expect(gateway).toHaveFocus();
	});

	test("a link in a card keeps its click and does not toggle the card", async () => {
		const user = userEvent.setup();
		const onLinkClick = vi.fn<(event: MouseEvent) => void>((event) => event.preventDefault());
		render(
			<CheckboxGroup.Root aria-label="Interests">
				<CheckboxGroup.Card value="tunnels">
					Tunnels{" "}
					<a href="#docs" onClick={onLinkClick}>
						docs
					</a>
				</CheckboxGroup.Card>
			</CheckboxGroup.Root>,
		);

		await user.click(screen.getByRole("link", { name: "docs" }));

		expect(onLinkClick).toHaveBeenCalledTimes(1);
		expect(screen.getByRole("checkbox")).not.toBeChecked();
	});

	test("Indicator render props receive the card's disabled state", () => {
		render(
			<CheckboxGroup.Root aria-label="Interests" defaultValue={["tunnels"]}>
				<CheckboxGroup.Card value="tunnels" disabled>
					<CheckboxGroup.Indicator data-testid="mark">{stateMark}</CheckboxGroup.Indicator>
					Tunnels
				</CheckboxGroup.Card>
			</CheckboxGroup.Root>,
		);

		expect(screen.getByTestId("mark")).toHaveTextContent("on disabled");
	});
});

describe("CheckboxGroup names", () => {
	test("plain content names the checkbox by the card text, and hides that text from browse mode", () => {
		render(
			<CheckboxGroup.Root aria-label="Interests">
				<CheckboxGroup.Card value="tunnels">
					<CheckboxGroup.ItemContent>
						<p>Tunnels</p>
						<p>Put a local service online.</p>
					</CheckboxGroup.ItemContent>
					<CheckboxGroup.Indicator />
				</CheckboxGroup.Card>
			</CheckboxGroup.Root>,
		);

		const checkbox = screen.getByRole("checkbox", { name: "Tunnels Put a local service online." });
		expect(checkbox).toHaveAccessibleDescription("");
		expect(checkbox.nextElementSibling).toHaveAttribute("aria-hidden", "true");
		expect(screen.getByRole("group", { name: "Interests" })).toContainElement(checkbox);
	});

	test("Choice.Title names the checkbox alone and Choice.Description describes it", () => {
		render(
			<CheckboxGroup.Root aria-label="Interests">
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
			</CheckboxGroup.Root>,
		);

		expect(screen.getByRole("checkbox", { name: "Tunnels" })).toHaveAccessibleDescription(
			"Put a local service online.",
		);
	});

	test("a label title line names the checkbox alone", () => {
		render(
			<CheckboxGroup.Root aria-label="Interests">
				<CheckboxGroup.Card value="tunnels" id="tunnels">
					<label htmlFor="tunnels">Tunnels</label>
					<p>Put a local service online.</p>
				</CheckboxGroup.Card>
			</CheckboxGroup.Root>,
		);

		expect(screen.getByRole("checkbox", { name: "Tunnels" })).toBeInTheDocument();
	});

	test("aria-label and aria-describedby on a card reach its checkbox", () => {
		render(
			<>
				<p id="hint">Pick any.</p>
				<CheckboxGroup.Root aria-label="Interests">
					<CheckboxGroup.Card value="tunnels" aria-label="Tunnels" aria-describedby="hint">
						<span aria-hidden>🚇</span>
					</CheckboxGroup.Card>
				</CheckboxGroup.Root>
			</>,
		);

		expect(screen.getByRole("checkbox", { name: "Tunnels" })).toHaveAccessibleDescription(
			"Pick any.",
		);
	});

	test("a card's text survives a browser translation and a later swap", () => {
		function Option({ label }: { label: ReactNode }) {
			return (
				<CheckboxGroup.Root aria-label="Interests" defaultValue={["tunnels"]}>
					<CheckboxGroup.Card value="tunnels" data-testid="card">
						{label}
					</CheckboxGroup.Card>
				</CheckboxGroup.Root>
			);
		}
		const { rerender } = render(<Option label="Tunnels" />);
		translateTextNodes(screen.getByTestId("card"));

		rerender(<Option label="Agents" />);
		expect(screen.getByRole("checkbox", { name: "Agents" })).toBeChecked();

		rerender(<Option label={<strong>Gateway</strong>} />);
		expect(screen.getByRole("checkbox", { name: "Gateway" })).toBeChecked();
	});
});

describe("CheckboxGroup forms", () => {
	test("with a name, the form submits one entry for each checked value", async () => {
		const user = userEvent.setup();
		const form = renderInterests({ name: "interests", defaultValue: ["agents"] });
		expect(new FormData(form).getAll("interests")).toEqual(["agents"]);

		await user.click(screen.getByText("Tunnels"));

		expect(new FormData(form).getAll("interests")).toEqual(["tunnels", "agents"]);
	});

	test("with no name, the form submits nothing", async () => {
		const user = userEvent.setup();
		const form = renderInterests({ defaultValue: ["agents"] });

		await user.click(screen.getByText("Tunnels"));

		expect([...new FormData(form).keys()]).toEqual([]);
	});

	test("a group outside its form joins it through form", () => {
		render(
			<>
				<form id="survey" aria-label="Survey" />
				<CheckboxGroup.Root
					aria-label="Interests"
					name="interests"
					form="survey"
					defaultValue={["tunnels"]}
				>
					<CheckboxGroup.Card value="tunnels">Tunnels</CheckboxGroup.Card>
				</CheckboxGroup.Root>
			</>,
		);
		const form = screen.getByRole("form", { name: "Survey" });
		if (!(form instanceof HTMLFormElement)) {
			throw new Error("The survey did not render a <form>.");
		}

		expect(new FormData(form).getAll("interests")).toEqual(["tunnels"]);
	});

	test("a form reset returns the cards to defaultValue and reports it", async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn<(value: string[]) => void>();
		const form = renderInterests({ name: "interests", defaultValue: ["gateway"], onValueChange });
		await user.click(screen.getByText("Tunnels"));
		await user.click(screen.getByText("Gateway"));
		expect(marks()).toEqual(["on", "off", "off"]);

		form.reset();

		await vi.waitFor(() => {
			expect(marks()).toEqual(["off", "on", "off"]);
		});
		expect(new FormData(form).getAll("interests")).toEqual(["gateway"]);
		expect(onValueChange).toHaveBeenLastCalledWith(["gateway"]);
	});

	test("checks and unchecks made before hydration become the value", async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn<(value: string[]) => void>();
		const interests = (
			<CheckboxGroup.Root
				aria-label="Interests"
				name="interests"
				defaultValue={["gateway"]}
				onValueChange={onValueChange}
			>
				{["tunnels", "gateway", "agents"].map((value) => (
					<CheckboxGroup.Card key={value} value={value}>
						<CheckboxGroup.Indicator aria-hidden data-testid={`${value}-mark`}>
							{stateMark}
						</CheckboxGroup.Indicator>
						{value}
					</CheckboxGroup.Card>
				))}
			</CheckboxGroup.Root>
		);
		const container = document.createElement("div");
		container.innerHTML = renderToString(interests);
		document.body.append(container);
		for (const [value, checked] of [
			["tunnels", true],
			["gateway", false],
			["agents", true],
		] as const) {
			const input = container.querySelector<HTMLInputElement>(`input[value=${value}]`);
			if (input == null) {
				throw new Error(`The server HTML has no ${value} checkbox.`);
			}
			input.checked = checked;
		}

		await act(async () => {
			hydrateRoot(container, interests);
		});

		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenLastCalledWith(["tunnels", "agents"]);
		expect(marks()).toEqual(["on", "off", "on"]);

		await user.click(screen.getByRole("checkbox", { name: "gateway" }));
		expect(onValueChange).toHaveBeenLastCalledWith(["tunnels", "agents", "gateway"]);
		container.remove();
	});

	test("the server HTML keeps a link in a card reachable, and hydration hides only text that names a checkbox", async () => {
		const interests = (
			<CheckboxGroup.Root aria-label="Interests">
				<CheckboxGroup.Card value="tunnels">Tunnels</CheckboxGroup.Card>
				<CheckboxGroup.Card value="agents">
					Agents <a href="#agents">details</a>
				</CheckboxGroup.Card>
			</CheckboxGroup.Root>
		);
		const container = document.createElement("div");
		container.innerHTML = renderToString(interests);
		document.body.append(container);
		expect(container.querySelector("[aria-hidden]")).toBeNull();

		await act(async () => {
			hydrateRoot(container, interests);
		});

		expect(screen.getByRole("link", { name: "details" })).toBeInTheDocument();
		expect(container.querySelectorAll("[aria-hidden=true]")).toHaveLength(1);
		container.remove();
	});
});

describe("CheckboxGroup parts", () => {
	test("each part carries its data-slot, and className, ref, and data-* reach the root and card", () => {
		const rootRef = createRef<HTMLDivElement>();
		render(
			<CheckboxGroup.Root aria-label="Interests" ref={rootRef} className="grid" data-testid="root">
				<CheckboxGroup.Card value="tunnels" className="flex" data-testid="card">
					<CheckboxGroup.ItemContent data-testid="content">Tunnels</CheckboxGroup.ItemContent>
					<CheckboxGroup.Indicator data-testid="indicator" />
				</CheckboxGroup.Card>
			</CheckboxGroup.Root>,
		);

		expect(rootRef.current).toBe(screen.getByRole("group", { name: "Interests" }));
		expect(screen.getByTestId("root")).toHaveClass("grid");
		expect(screen.getByTestId("card")).toHaveClass("flex");
		expect(
			Object.fromEntries(
				["root", "card", "content", "indicator"].map((id) => [
					id,
					screen.getByTestId(id).getAttribute("data-slot"),
				]),
			),
		).toEqual({
			root: "checkbox-group",
			card: "checkbox-group-card",
			content: "checkbox-group-item-content",
			indicator: "checkbox-group-indicator",
		});
		expect(screen.getByRole("checkbox").nextElementSibling).toHaveAttribute(
			"data-slot",
			"checkbox-group-card-label",
		);
	});

	test("ItemContent asChild renders the child with its data-slot, merged className, and ref", () => {
		const ref = createRef<HTMLParagraphElement>();
		render(
			<CheckboxGroup.Root aria-label="Interests">
				<CheckboxGroup.Card value="tunnels">
					<CheckboxGroup.ItemContent asChild className="flex-1" data-testid="content">
						<p ref={ref} className="text-strong">
							Tunnels
						</p>
					</CheckboxGroup.ItemContent>
				</CheckboxGroup.Card>
			</CheckboxGroup.Root>,
		);

		const content = screen.getByTestId("content");
		expect(content.tagName).toBe("P");
		expect(content).toBe(ref.current);
		expect(content).toHaveClass("flex-1", "text-strong");
		expect(content).toHaveAttribute("data-slot", "checkbox-group-item-content");
	});

	// Why a class assertion: a tailwind-merge contract. `cx` treats `bg-checked-icon` as a background
	// color and drops the fill beside it, so the checked box shows no color.
	test("the default indicator keeps both its checked fill and its check icon", () => {
		render(
			<CheckboxGroup.Root aria-label="Interests">
				<CheckboxGroup.Card value="tunnels">
					<CheckboxGroup.Indicator data-testid="mark" />
				</CheckboxGroup.Card>
			</CheckboxGroup.Root>,
		);

		expect(screen.getByTestId("mark").firstElementChild).toHaveClass(
			"group-has-[>input:checked]/checkbox:bg-accent-600",
			"group-has-[>input:checked]/checkbox:bg-checked-icon",
		);
	});

	test("a card outside a root throws", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<CheckboxGroup.Card value="tunnels">Tunnels</CheckboxGroup.Card>)).toThrow(
			"CheckboxGroup.Card must be rendered inside CheckboxGroup.Root.",
		);
	});
});
