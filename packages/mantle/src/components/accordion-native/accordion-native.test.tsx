import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import * as Accordion from "./accordion-native-parts.js";

const sections = (
	<>
		<Accordion.Item value="a">
			<Accordion.Trigger>
				Trigger A
				<Accordion.TriggerIcon />
			</Accordion.Trigger>
			<Accordion.Content>
				<Accordion.Body>Body of section A</Accordion.Body>
			</Accordion.Content>
		</Accordion.Item>
		<Accordion.Item value="b">
			<Accordion.Trigger>Trigger B</Accordion.Trigger>
			<Accordion.Content>
				<Accordion.Body>Body of section B</Accordion.Body>
			</Accordion.Content>
		</Accordion.Item>
	</>
);

/** Parses server HTML into a detached container, so the test reads the markup React sent. */
const parse = (html: string) => {
	const container = document.createElement("div");
	container.innerHTML = html;
	return container;
};

describe("native Accordion", () => {
	test('server HTML opens the default item, and type="single" gives every item one shared name', () => {
		const container = parse(
			renderToString(
				<Accordion.Root type="single" defaultValue="b">
					{sections}
				</Accordion.Root>,
			),
		);
		const [itemA, itemB] = container.querySelectorAll("details");

		expect(itemA).not.toHaveAttribute("open");
		expect(itemB).toHaveAttribute("open");
		// Why a shared name: `<details name>` is what keeps one item open, before and after hydration.
		expect(itemA?.getAttribute("name")).toMatch(/.+/);
		expect(itemB).toHaveAttribute("name", itemA?.getAttribute("name") ?? "");
	});

	test("multiple mode (the default) sets no name, so items open independently", () => {
		const container = parse(
			renderToString(<Accordion.Root defaultValue={["a", "b"]}>{sections}</Accordion.Root>),
		);
		const items = [...container.querySelectorAll("details")];

		expect(items.map((item) => item.hasAttribute("open"))).toEqual([true, true]);
		expect(items.some((item) => item.hasAttribute("name"))).toBe(false);
	});

	test("every part carries the data-slot of its Accordion counterpart", () => {
		render(
			<Accordion.Root defaultValue={["a"]} data-testid="root">
				{sections}
			</Accordion.Root>,
		);
		const trigger = screen.getByText("Trigger A").closest("summary");
		const item = trigger?.parentElement;
		const content = screen.getByText("Body of section A").parentElement;

		expect(screen.getByTestId("root")).toHaveAttribute("data-slot", "accordion");
		expect(item).toHaveAttribute("data-slot", "accordion-item");
		expect(trigger).toHaveAttribute("data-slot", "accordion-trigger");
		expect(trigger?.querySelector("svg")).toHaveAttribute("data-slot", "accordion-trigger-icon");
		expect(content).toHaveAttribute("data-slot", "accordion-content");
		expect(screen.getByText("Body of section A")).toHaveAttribute("data-slot", "accordion-body");
	});

	test("Root asChild renders the given container and forwards DOM props without accordion props", () => {
		render(
			<Accordion.Root
				type="single"
				defaultValue="a"
				onValueChange={() => {}}
				aria-label="Questions"
				asChild
			>
				<section>{sections}</section>
			</Accordion.Root>,
		);
		const root = screen.getByRole("region", { name: "Questions" });

		expect(root).toHaveAttribute("data-slot", "accordion");
		for (const attribute of ["type", "value", "defaultvalue", "onvaluechange"]) {
			expect(root).not.toHaveAttribute(attribute);
		}
	});

	test("TriggerIcon keeps a custom svg's own class and hides it from assistive technology", () => {
		render(
			<Accordion.Root>
				<Accordion.Item value="a">
					<Accordion.Trigger>
						Custom icon
						<Accordion.TriggerIcon svg={<svg data-testid="custom-icon" className="custom" />} />
					</Accordion.Trigger>
				</Accordion.Item>
			</Accordion.Root>,
		);
		const icon = screen.getByTestId("custom-icon");

		expect(icon).toHaveClass("custom");
		expect(icon).toHaveAttribute("aria-hidden", "true");
		expect(icon).toHaveAttribute("data-slot", "accordion-trigger-icon");
	});

	test("TriggerIcon keeps a named svg announced and merges its inline style", () => {
		render(
			<Accordion.Root>
				<Accordion.Item value="a">
					<Accordion.Trigger>
						Named icon
						<Accordion.TriggerIcon
							style={{ opacity: 0.5 }}
							svg={<svg aria-label="Expand" style={{ color: "red" }} />}
						/>
					</Accordion.Trigger>
				</Accordion.Item>
			</Accordion.Root>,
		);
		const icon = screen.getByLabelText("Expand");

		expect(icon).not.toHaveAttribute("aria-hidden");
		expect(icon).toHaveStyle({ opacity: "0.5", color: "red" });
	});

	test("Item throws outside of Root", () => {
		expect(() => render(<Accordion.Item value="orphan">orphan</Accordion.Item>)).toThrow(
			/must be rendered within `Accordion.Root`/,
		);
	});
});
