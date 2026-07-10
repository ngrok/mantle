import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { isItemOpen, nextOpenValues, toOpenValues } from "./accordion-state.js";
import { Accordion } from "./accordion.js";

describe("isItemOpen", () => {
	test("returns true when the value is in the open set", () => {
		expect(isItemOpen(["a", "c"], "a")).toBe(true);
		expect(isItemOpen(["a", "c"], "c")).toBe(true);
	});

	test("returns false when the value is not in the open set", () => {
		expect(isItemOpen(["a", "c"], "b")).toBe(false);
		expect(isItemOpen([], "a")).toBe(false);
	});
});

describe("toOpenValues", () => {
	test("treats nullish and empty single values as nothing open", () => {
		expect(toOpenValues(undefined)).toEqual([]);
		expect(toOpenValues("")).toEqual([]);
	});

	test("wraps a non-empty single value", () => {
		expect(toOpenValues("a")).toEqual(["a"]);
	});

	test("passes an array value through by reference", () => {
		const values = ["a", "b"];
		expect(toOpenValues(values)).toBe(values);
	});
});

describe("nextOpenValues", () => {
	describe("single", () => {
		test("opening a different item replaces the open one", () => {
			expect(nextOpenValues(["a"], "b", true, "single")).toEqual(["b"]);
		});

		test("opening from empty opens the item", () => {
			expect(nextOpenValues([], "a", true, "single")).toEqual(["a"]);
		});

		test("opening the already-open item is a no-op (same reference)", () => {
			const open = ["a"];
			expect(nextOpenValues(open, "a", true, "single")).toBe(open);
		});

		test("closing the open item clears the set", () => {
			expect(nextOpenValues(["a"], "a", false, "single")).toEqual([]);
		});

		test("closing an item that is not open is a no-op (same reference)", () => {
			const open = ["a"];
			expect(nextOpenValues(open, "b", false, "single")).toBe(open);
		});
	});

	describe("multiple", () => {
		test("opening adds the item", () => {
			expect(nextOpenValues(["a"], "b", true, "multiple")).toEqual(["a", "b"]);
		});

		test("opening an already-open item is a no-op (same reference)", () => {
			const open = ["a", "b"];
			expect(nextOpenValues(open, "a", true, "multiple")).toBe(open);
		});

		test("closing removes only that item", () => {
			expect(nextOpenValues(["a", "b"], "a", false, "multiple")).toEqual(["b"]);
		});

		test("closing an item that is not open is a no-op (same reference)", () => {
			const open = ["a", "b"];
			expect(nextOpenValues(open, "c", false, "multiple")).toBe(open);
		});
	});
});

describe("Accordion", () => {
	const renderExample = (defaultValue: string) =>
		render(
			<Accordion.Root type="single" defaultValue={defaultValue}>
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
					<Accordion.Trigger>
						Trigger B
						<Accordion.TriggerIcon />
					</Accordion.Trigger>
					<Accordion.Content>
						<Accordion.Body>Body of section B</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>,
		);

	test("renders each item as a role=group with a <button> trigger (native <details>/<summary> a11y)", () => {
		renderExample("a");
		const triggerA = screen.getByRole("button", { name: /Trigger A/ });
		expect(triggerA.tagName).toBe("BUTTON");
		expect(triggerA.closest('[data-slot="accordion-item"]')).toHaveAttribute("role", "group");
	});

	test("trigger reflects open state via aria-expanded", () => {
		renderExample("a");
		expect(screen.getByRole("button", { name: /Trigger A/ })).toHaveAttribute(
			"aria-expanded",
			"true",
		);
		expect(screen.getByRole("button", { name: /Trigger B/ })).toHaveAttribute(
			"aria-expanded",
			"false",
		);
	});

	test("keeps collapsed content in the DOM so find-in-page can reveal it", () => {
		renderExample("a");
		// Section B is collapsed, but its body text must still exist in the DOM —
		// this is the entire point of the component (browser find-in-page support).
		expect(screen.getByText("Body of section B")).toBeInTheDocument();
	});

	test("throws when an item part is rendered outside of Root", () => {
		expect(() => render(<Accordion.Item value="orphan">orphan</Accordion.Item>)).toThrow(
			/must be rendered within `Accordion.Root`/,
		);
	});

	test("throws when a Trigger is rendered outside of Item", () => {
		expect(() => render(<Accordion.Trigger>orphan</Accordion.Trigger>)).toThrow(
			/must be rendered within `Accordion.Item`/,
		);
	});

	test("Root asChild renders the provided container element", () => {
		render(
			<Accordion.Root type="single" defaultValue="a" asChild>
				<section data-testid="root-section">
					<Accordion.Item value="a">
						<Accordion.Trigger>Trigger A</Accordion.Trigger>
						<Accordion.Content>
							<Accordion.Body>Body</Accordion.Body>
						</Accordion.Content>
					</Accordion.Item>
				</section>
			</Accordion.Root>,
		);
		const root = screen.getByTestId("root-section");
		expect(root.tagName).toBe("SECTION");
		expect(root).toHaveAttribute("data-slot", "accordion");
	});

	test("TriggerIcon renders a custom svg override, keeping its slot", () => {
		render(
			<Accordion.Root type="single" defaultValue="a">
				<Accordion.Item value="a">
					<Accordion.Trigger>
						Custom icon
						<Accordion.TriggerIcon svg={<svg data-testid="custom-trigger-icon" />} />
					</Accordion.Trigger>
					<Accordion.Content>
						<Accordion.Body>Body of section A</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>,
		);
		const icon = screen.getByTestId("custom-trigger-icon");
		expect(icon.tagName.toLowerCase()).toBe("svg");
		// The override still carries the part's data-slot for styling/targeting.
		expect(icon).toHaveAttribute("data-slot", "accordion-trigger-icon");
	});

	test("Root forwards arbitrary DOM props to the container without leaking accordion props", () => {
		render(
			<Accordion.Root
				type="single"
				defaultValue=""
				id="faq"
				aria-label="FAQ"
				data-testid="faq-root"
			>
				<Accordion.Item value="a">
					<Accordion.Trigger>Trigger A</Accordion.Trigger>
					<Accordion.Content>
						<Accordion.Body>Body of section A</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>,
		);
		const root = screen.getByTestId("faq-root");
		// Standard `<div>` props are forwarded to the container.
		expect(root).toHaveAttribute("data-slot", "accordion");
		expect(root).toHaveAttribute("id", "faq");
		expect(root).toHaveAttribute("aria-label", "FAQ");
		// Accordion-specific props must not leak onto the DOM element.
		expect(root).not.toHaveAttribute("type");
		expect(root).not.toHaveAttribute("defaultValue");
	});

	test("Body marks the content region with data-slot and forwards a consumer className", () => {
		render(
			<Accordion.Root type="single" defaultValue="a">
				<Accordion.Item value="a">
					<Accordion.Trigger>Trigger A</Accordion.Trigger>
					<Accordion.Content>
						<Accordion.Body className="custom-body-class" data-testid="body-a">
							Body of section A
						</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>,
		);
		const body = screen.getByTestId("body-a");
		// Assert the stable contract: Body is the styleable content slot and forwards
		// a consumer className. We deliberately avoid asserting specific Tailwind
		// utilities (e.g. `pb-4`) — those are implementation details that can change,
		// and `cx`'s last-wins merge has its own dedicated tests.
		expect(body).toHaveAttribute("data-slot", "accordion-body");
		expect(body).toHaveClass("custom-body-class");
	});

	test("defaults to multiple mode when `type` is omitted (sections open independently)", () => {
		render(
			<Accordion.Root defaultValue={["a", "b"]}>
				<Accordion.Item value="a">
					<Accordion.Trigger>Trigger A</Accordion.Trigger>
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
			</Accordion.Root>,
		);
		// Both sections open at once is only possible in multiple mode, so this proves
		// the omitted `type` defaults to "multiple" (and that `defaultValue` accepts a
		// `string[]` without `type` being set).
		const itemA = screen.getByText("Body of section A").closest('[data-slot="accordion-item"]');
		const itemB = screen.getByText("Body of section B").closest('[data-slot="accordion-item"]');
		expect(itemA).toHaveAttribute("data-state", "open");
		expect(itemB).toHaveAttribute("data-state", "open");
	});
});
