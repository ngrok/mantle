import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
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

	test("trigger's aria-controls points at its item's content", () => {
		renderExample("a");
		const triggerA = screen.getByRole("button", { name: /Trigger A/ });
		const contentA = screen
			.getByText("Body of section A")
			.closest('[data-slot="accordion-content"]');
		const contentB = screen
			.getByText("Body of section B")
			.closest('[data-slot="accordion-content"]');
		expect(contentA).toHaveAttribute("id");
		expect(triggerA).toHaveAttribute("aria-controls", contentA?.getAttribute("id") ?? "");
		expect(contentA?.getAttribute("id")).not.toBe(contentB?.getAttribute("id"));
	});

	test("Item owns the content id: a stray id on Content cannot break the aria-controls pair", () => {
		render(
			<Accordion.Root type="single" defaultValue="a">
				<Accordion.Item value="a">
					<Accordion.Trigger>Trigger A</Accordion.Trigger>
					<Accordion.Content
						// @ts-expect-error -- id is not an Accordion.Content prop; Accordion.Item owns it
						id="elsewhere"
					>
						<Accordion.Body>Body of section A</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>,
		);
		const content = screen
			.getByText("Body of section A")
			.closest('[data-slot="accordion-content"]');
		expect(content).not.toHaveAttribute("id", "elsewhere");
		expect(screen.getByRole("button", { name: /Trigger A/ })).toHaveAttribute(
			"aria-controls",
			content?.getAttribute("id") ?? "",
		);
	});

	// happy-dom has no `beforematch`, so this covers the fallback branch that a
	// browser without `hidden="until-found"` takes.
	test("without beforematch support, collapsed content is inert and open content is not", async () => {
		const user = userEvent.setup();
		renderExample("a");
		const contentA = screen
			.getByText("Body of section A")
			.closest('[data-slot="accordion-content"]');
		const contentB = screen
			.getByText("Body of section B")
			.closest('[data-slot="accordion-content"]');
		expect(contentA).not.toHaveAttribute("inert");
		expect(contentB).toHaveAttribute("inert");
		expect(contentB).not.toHaveAttribute("hidden");

		await user.click(screen.getByRole("button", { name: /Trigger B/ }));
		expect(contentB).not.toHaveAttribute("inert");
		expect(contentA).toHaveAttribute("inert");
	});

	test("server HTML marks collapsed content inert and pairs each trigger with its content", () => {
		const html = renderToString(
			<Accordion.Root type="single" defaultValue="a">
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
		const template = document.createElement("template");
		template.innerHTML = html;
		const root = template.content;
		const contents = root.querySelectorAll('[data-slot="accordion-content"]');
		const triggers = root.querySelectorAll('[data-slot="accordion-trigger"]');
		expect(contents).toHaveLength(2);
		expect(contents[0]).not.toHaveAttribute("inert");
		expect(contents[1]).toHaveAttribute("inert");
		expect(triggers[0]).toHaveAttribute("aria-controls", contents[0]?.getAttribute("id") ?? "");
		expect(triggers[1]).toHaveAttribute("aria-controls", contents[1]?.getAttribute("id") ?? "");
	});

	test("Enter and Space toggle the focused section", async () => {
		const user = userEvent.setup();
		renderExample("");
		const triggerA = screen.getByRole("button", { name: /Trigger A/ });
		triggerA.focus();

		await user.keyboard("{Enter}");
		expect(triggerA).toHaveAttribute("aria-expanded", "true");

		await user.keyboard(" ");
		expect(triggerA).toHaveAttribute("aria-expanded", "false");
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
		// This is the tailwind-merge override contract: it pins that Body forwards a
		// consumer `className`. Why no `pb-4` assertion: neither vitest project loads
		// Tailwind, so an internal utility is only a source literal here.
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

describe("Accordion Root context", () => {
	const Sections = ({
		controlled,
		onValueChange,
	}: {
		controlled: boolean;
		onValueChange?: (value: string) => void;
	}) => {
		const items = (
			<>
				<Accordion.Item value="a">
					<Accordion.Trigger>Trigger A</Accordion.Trigger>
					<Accordion.Content>
						<Accordion.Body>Body of section A</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
				<Accordion.Item value="b">
					<Accordion.Trigger>Trigger B</Accordion.Trigger>
					<Accordion.Content data-testid="content-b">
						<Accordion.Body>Body of section B</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
			</>
		);
		if (controlled) {
			return (
				<Accordion.Root type="single" value="a" onValueChange={onValueChange}>
					{items}
				</Accordion.Root>
			);
		}
		return (
			<Accordion.Root type="single" defaultValue="a" onValueChange={onValueChange}>
				{items}
			</Accordion.Root>
		);
	};

	test("onValueChange reads the callback from the latest render", async () => {
		const user = userEvent.setup();
		const first = vi.fn<(value: string) => void>();
		const second = vi.fn<(value: string) => void>();
		const { rerender } = render(<Sections controlled={false} onValueChange={first} />);
		rerender(<Sections controlled={false} onValueChange={second} />);

		await user.click(screen.getByRole("button", { name: /Trigger B/ }));
		expect(first).toHaveBeenCalledTimes(0);
		expect(second).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenLastCalledWith("b");
	});

	// happy-dom has no `beforematch`, so `supportsBeforeMatch()` reads false in
	// the tests above. An own `onbeforematch` property on `document.body` flips
	// the detection, which routes `Content` through its `beforematch`
	// subscription and `hidden="until-found"` branches.
	describe("with beforematch support", () => {
		beforeEach(() => {
			Object.defineProperty(document.body, "onbeforematch", { value: null, configurable: true });
		});

		// Why: Testing Library's cleanup keeps `document.body`, so without this the
		// property leaks into the fallback-branch tests above.
		afterEach(() => {
			Reflect.deleteProperty(document.body, "onbeforematch");
		});

		test.each([
			{ mode: "uncontrolled", controlled: false },
			{ mode: "controlled single", controlled: true },
		])(
			"$mode: a parent render with unchanged props does not re-subscribe Content to beforematch",
			({ controlled }) => {
				const { rerender } = render(<Sections controlled={controlled} />);
				const contentB = screen.getByTestId("content-b");
				// Precondition: the collapsed region took the `until-found` branch, so
				// the subscription the spy watches is live.
				expect(contentB).toHaveAttribute("hidden", "until-found");
				const addEventListener = vi.spyOn(contentB, "addEventListener");

				rerender(<Sections controlled={controlled} />);
				rerender(<Sections controlled={controlled} />);

				const beforeMatchSubscriptions = addEventListener.mock.calls.filter(
					([eventType]) => eventType === "beforematch",
				);
				expect(beforeMatchSubscriptions).toHaveLength(0);
			},
		);
	});
});
