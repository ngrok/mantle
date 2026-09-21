import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef, useContext } from "react";
import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { Checkbox } from "../checkbox/checkbox.js";
import { Input } from "../input/input.js";
import { Select } from "../select/select.js";
import { FieldItemContext, type FieldControlAriaProps } from "./field-context.js";
import { Field } from "./field.js";

describe("Field", () => {
	test("Field.Label outside a Field.Item renders a label with no for attribute", () => {
		render(<Field.Label>Email</Field.Label>);
		// Why tagName: the JSDoc promises a <label>, so the element is the contract.
		expect(screen.getByText("Email").tagName).toBe("LABEL");
		expect(screen.getByText("Email")).not.toHaveAttribute("for");
	});

	test("Field.Item owns the control id: a stray htmlFor or id cannot override it", () => {
		render(
			<Field.Item name="email" id="email">
				<Field.Label
					// @ts-expect-error -- htmlFor is not a Field.Label prop; Field.Item owns the control id
					htmlFor="elsewhere"
				>
					Email
				</Field.Label>
				<Field.Control
					// @ts-expect-error -- id is not a Field.Control prop; Field.Item owns the control id
					id="elsewhere"
				>
					<input />
				</Field.Control>
			</Field.Item>,
		);

		const input = screen.getByRole("textbox", { name: "Email" });
		expect(input).toHaveAttribute("id", "email");
		expect(screen.getByText("Email")).toHaveAttribute("for", "email");
	});

	test("Field.Label inherits htmlFor from the Field.Item control id when omitted", () => {
		render(
			<Field.Item name="email">
				<Field.Label>Email</Field.Label>
				<Field.Control>
					<input />
				</Field.Control>
			</Field.Item>,
		);

		const label = screen.getByText("Email");
		const input = label.parentElement?.querySelector("input");
		expect(input).not.toBeNull();
		expect(label).toHaveAttribute("for", input?.getAttribute("id") ?? "");
	});

	describe("refs", () => {
		test("forwards refs to the default rendered elements", () => {
			const setRef = createRef<HTMLFieldSetElement>();
			const legendRef = createRef<HTMLLegendElement>();
			const groupRef = createRef<HTMLDivElement>();
			const itemRef = createRef<HTMLDivElement>();
			const labelRowRef = createRef<HTMLDivElement>();
			const optionalRef = createRef<HTMLSpanElement>();
			const descriptionRef = createRef<HTMLParagraphElement>();
			const errorListRef = createRef<HTMLUListElement>();
			const errorRef = createRef<HTMLLIElement>();

			const { container } = render(
				<Field.Set ref={setRef}>
					<Field.Legend ref={legendRef}>Account</Field.Legend>
					<Field.Group ref={groupRef}>
						<Field.Item name="email" ref={itemRef}>
							<Field.LabelRow ref={labelRowRef}>
								<label htmlFor="email">
									Email <Field.Optional ref={optionalRef} />
								</label>
							</Field.LabelRow>
							<input id="email" />
							<Field.ErrorList ref={errorListRef}>
								<Field.ErrorItem ref={errorRef}>Required</Field.ErrorItem>
							</Field.ErrorList>
							<Field.Description ref={descriptionRef}>Use your work email.</Field.Description>
						</Field.Item>
					</Field.Group>
				</Field.Set>,
			);

			const bySlot = (slot: string) => {
				const element = container.querySelector(`[data-slot="${slot}"]`);
				if (element == null) {
					throw new Error(`no element carries data-slot="${slot}"`);
				}
				return element;
			};
			expect(setRef.current).toBe(screen.getByRole("group", { name: "Account" }));
			expect(legendRef.current).toBe(screen.getByText("Account"));
			expect(groupRef.current).toBe(bySlot("field-group"));
			expect(itemRef.current).toBe(bySlot("field-item"));
			expect(labelRowRef.current).toBe(bySlot("field-label-row"));
			expect(optionalRef.current).toBe(screen.getByText("(Optional)"));
			expect(descriptionRef.current).toBe(screen.getByText("Use your work email."));
			expect(errorListRef.current).toBe(screen.getByRole("list"));
			expect(errorRef.current).toBe(screen.getByRole("listitem"));
		});

		test("forwards refs through asChild parts", () => {
			const itemRef = createRef<HTMLDivElement>();
			const groupRef = createRef<HTMLDivElement>();
			const labelRowRef = createRef<HTMLDivElement>();

			render(
				<>
					<Field.Item asChild name="example" ref={itemRef}>
						<div data-testid="item-child">Item</div>
					</Field.Item>
					<Field.Group asChild ref={groupRef}>
						<div data-testid="group-child">Group</div>
					</Field.Group>
					<Field.LabelRow asChild ref={labelRowRef}>
						<div data-testid="label-row-child">Label row</div>
					</Field.LabelRow>
				</>,
			);

			expect(itemRef.current).toBe(screen.getByTestId("item-child"));
			expect(groupRef.current).toBe(screen.getByTestId("group-child"));
			expect(labelRowRef.current).toBe(screen.getByTestId("label-row-child"));
		});

		test("forwards refs through help trigger and content wrappers", () => {
			const triggerRef = createRef<HTMLButtonElement>();
			const contentRef = createRef<HTMLDivElement>();

			render(
				<Field.Help defaultOpen>
					<Field.HelpTrigger ref={triggerRef} label="What is this field?" />
					<Field.HelpContent ref={contentRef}>Help body</Field.HelpContent>
				</Field.Help>,
			);

			expect(triggerRef.current).toBe(screen.getByRole("button", { name: "What is this field?" }));
			expect(contentRef.current).toHaveTextContent("Help body");
		});

		test("forwards refs through Field.Control", () => {
			const controlRef = createRef<HTMLElement>();

			render(
				<Field.Control ref={controlRef}>
					<input aria-label="Email" />
				</Field.Control>,
			);

			expect(controlRef.current).toBe(screen.getByRole("textbox", { name: "Email" }));
		});
	});

	describe("Field.Item", () => {
		test("renders a plain container with no role", () => {
			render(
				<Field.Item data-testid="root" name="example">
					content
				</Field.Item>,
			);
			const root = screen.getByTestId("root");
			// Why the group query: a <fieldset> takes the group role, and `Field.Set` owns that element.
			expect(screen.queryByRole("group")).not.toBeInTheDocument();
			expect(root).not.toHaveAttribute("role");
			expect(root).toHaveTextContent("content");
		});

		test("forwards data-slot=field-item", () => {
			render(<Field.Item data-testid="root" name="example" />);
			expect(screen.getByTestId("root")).toHaveAttribute("data-slot", "field-item");
		});

		test("a consumer className lands on the item", () => {
			render(<Field.Item className="custom-class" data-testid="root" name="example" />);
			expect(screen.getByTestId("root")).toHaveClass("custom-class");
		});

		test("forwards arbitrary data-* attributes", () => {
			render(<Field.Item data-custom="hello" data-testid="root" name="example" />);
			expect(screen.getByTestId("root")).toHaveAttribute("data-custom", "hello");
		});

		test("renders as child element when asChild is true", () => {
			render(
				<Field.Item asChild name="example">
					<section data-testid="root">content</section>
				</Field.Item>,
			);
			const root = screen.getByTestId("root");
			expect(root.tagName).toBe("SECTION");
			expect(root).toHaveAttribute("data-slot", "field-item");
		});

		test("Field.Control wires Field.Description to the control", () => {
			render(
				<Field.Item name="email">
					<Field.Label>Email</Field.Label>
					<Field.Control>
						<input />
					</Field.Control>
					<Field.Description>We&apos;ll never share your email.</Field.Description>
				</Field.Item>,
			);

			const input = screen.getByRole("textbox", { name: "Email" });
			const description = screen.getByText("We'll never share your email.");
			expect(description).toHaveAttribute("id");
			expect(input.getAttribute("aria-describedby")).toContain(description.id);
			expect(input).toHaveAttribute("name", "email");
			expect(input).toHaveAttribute("id");
		});

		test("drops child-supplied aria-describedby and aria-errormessage in favor of Field-owned IDs", () => {
			// Field owns the ID contract. cloneElement overwrites any child-side
			// aria-describedby / aria-errormessage cleanly.
			render(
				<Field.Item name="example">
					<Field.Control>
						<input
							aria-label="Email"
							aria-describedby="child-help"
							aria-errormessage="child-error"
						/>
					</Field.Control>
					<Field.Errors messages={["Required."]} />
				</Field.Item>,
			);

			const input = screen.getByRole("textbox", { name: "Email" });
			const errors = screen.getByText("Required.").closest("ul");
			expect(errors).not.toBeNull();
			expect(input.getAttribute("aria-describedby")).toContain(errors?.id);
			expect(input).toHaveAttribute("aria-errormessage", errors?.id);
		});

		test("Field.Control wires rendered Field.ErrorList to the control and infers invalid state", () => {
			render(
				<Field.Item name="example">
					<Field.Control>
						<input aria-label="Email" />
					</Field.Control>
					<Field.ErrorList data-testid="errors">
						<Field.ErrorItem>Email is required.</Field.ErrorItem>
					</Field.ErrorList>
				</Field.Item>,
			);

			const input = screen.getByRole("textbox", { name: "Email" });
			const errorList = screen.getByTestId("errors");
			expect(errorList).toHaveAttribute("id");
			expect(input.getAttribute("aria-describedby")).toContain(errorList.id);
			expect(input).toHaveAttribute("aria-errormessage", errorList.id);
			expect(input).toHaveAttribute("aria-invalid", "true");
		});

		test("does not mark a control invalid when Field.ErrorItem children are empty", () => {
			render(
				<Field.Item name="example">
					<Field.Control>
						<input aria-label="Email" />
					</Field.Control>
					<Field.ErrorList>
						<Field.ErrorItem>{undefined}</Field.ErrorItem>
					</Field.ErrorList>
				</Field.Item>,
			);

			const input = screen.getByRole("textbox", { name: "Email" });
			expect(input).not.toHaveAttribute("aria-errormessage");
			expect(input).not.toHaveAttribute("aria-invalid");
		});

		test("Field.Control wires rendered Field.Errors to the control and infers invalid state", () => {
			render(
				<Field.Item name="example">
					<Field.Control>
						<input aria-label="Email" />
					</Field.Control>
					<Field.Errors data-testid="errors" messages={["Email is required."]} />
				</Field.Item>,
			);

			const input = screen.getByRole("textbox", { name: "Email" });
			const errors = screen.getByTestId("errors");
			expect(errors).toHaveAttribute("id");
			expect(input.getAttribute("aria-describedby")).toContain(errors.id);
			expect(input).toHaveAttribute("aria-errormessage", errors.id);
			expect(input).toHaveAttribute("aria-invalid", "true");
		});

		test("ignores child-supplied aria-invalid — Field.Item owns the contract", () => {
			// Field.Item is the single source of truth for aria-invalid. A
			// child-side aria-invalid="false" no longer overrides the inferred
			// error state; set validation on Field.Item to opt out.
			render(
				<Field.Item name="example">
					<Field.Control>
						<input aria-label="Email" aria-invalid="false" />
					</Field.Control>
					<Field.ErrorList>
						<Field.ErrorItem>Email is required.</Field.ErrorItem>
					</Field.ErrorList>
				</Field.Item>,
			);

			expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute(
				"aria-invalid",
				"true",
			);
		});

		test("lets Field.Item validation={false} override rendered errors", () => {
			render(
				<Field.Item name="example" validation={false}>
					<Field.Control>
						<input aria-label="Email" />
					</Field.Control>
					<Field.Errors messages={["Email is required."]} />
				</Field.Item>,
			);

			const input = screen.getByRole("textbox", { name: "Email" });
			expect(input).not.toHaveAttribute("aria-invalid");
			expect(input).not.toHaveAttribute("aria-errormessage");
		});

		test("supports render props for controls that need manual prop placement", () => {
			render(
				<Field.Item name="example">
					{/* @ts-expect-error -- className is not allowed alongside a render-prop child */}
					<Field.Control className="should-not-typecheck">
						{(controlProps: FieldControlAriaProps) => (
							<label>
								Accept terms
								<input type="checkbox" {...controlProps} />
							</label>
						)}
					</Field.Control>
					<Field.Description>Required to continue.</Field.Description>
				</Field.Item>,
			);

			const checkbox = screen.getByRole("checkbox", { name: "Accept terms" });
			const description = screen.getByText("Required to continue.");
			expect(checkbox.getAttribute("aria-describedby")).toContain(description.id);
		});

		test("splats Field.Item name and generated id onto the control, overriding child-supplied values", () => {
			// Field.Item owns the name + id contract — context wins so the
			// TanStack-friendly `name` only needs to live on Field.Item, and
			// any name/id passed on the child is intentionally overwritten.
			render(
				<Field.Item name="account.email">
					<Field.Label>Email</Field.Label>
					<Field.Control>
						<Input id="ignored-by-context" name="ignored-by-context" />
					</Field.Control>
					<Field.Description>Use your work email.</Field.Description>
				</Field.Item>,
			);

			const input = screen.getByRole("textbox", { name: "Email" });
			const description = screen.getByText("Use your work email.");
			expect(input.getAttribute("aria-describedby")).toContain(description.id);
			expect(input).toHaveAttribute("name", "account.email");
			expect(input.getAttribute("id")).not.toBe("ignored-by-context");
			expect(input).toHaveAttribute("id");
		});

		test("id on Field.Item lands on the control, not the wrapper, and on Field.Label's htmlFor", () => {
			render(
				<Field.Item data-testid="item" name="password" id="login-password">
					<Field.Label>Password</Field.Label>
					<Field.Control>
						<Input id="ignored-by-context" />
					</Field.Control>
				</Field.Item>,
			);

			const input = screen.getByRole("textbox", { name: "Password" });
			expect(input).toHaveAttribute("id", "login-password");
			expect(screen.getByTestId("item")).not.toHaveAttribute("id");
			expect(screen.getByText("Password")).toHaveAttribute("for", "login-password");
		});

		test("id reaches the render-prop form of Field.Control", () => {
			render(
				<Field.Item name="acceptTerms" id="accept-terms">
					<Field.Control>
						{(controlProps) => (
							<label>
								Accept terms
								<input type="checkbox" {...controlProps} />
							</label>
						)}
					</Field.Control>
				</Field.Item>,
			);

			const checkbox = screen.getByRole("checkbox", { name: "Accept terms" });
			expect(checkbox).toHaveAttribute("id", "accept-terms");
		});

		test("id reaches a compound trigger through FieldControlContext", () => {
			render(
				<Field.Item name="region" id="region-select">
					<Field.Label>Region</Field.Label>
					<Select.Root>
						<Field.Control>
							<Select.Trigger />
						</Field.Control>
					</Select.Root>
				</Field.Item>,
			);

			const trigger = screen.getByRole("combobox", { name: "Region" });
			expect(trigger).toHaveAttribute("id", "region-select");
		});

		test("provides validation from Field.Item to Mantle controls", () => {
			render(
				<Field.Item name="email" validation="success">
					<Field.Label>Email</Field.Label>
					<Field.Control>
						<Input />
					</Field.Control>
				</Field.Item>,
			);

			const input = screen.getByRole("textbox", { name: "Email" });
			expect(input).toHaveAttribute("aria-invalid", "false");
			expect(input).toHaveAttribute("data-validation", "success");
		});

		test("preserves child props when Field.Control is rendered outside Field.Item", () => {
			render(
				<Field.Control>
					<input
						aria-label="Email"
						aria-describedby="help"
						aria-errormessage="error"
						aria-invalid="true"
						id="email"
						name="email"
					/>
				</Field.Control>,
			);

			const input = screen.getByRole("textbox", { name: "Email" });
			expect(input).toHaveAttribute("aria-describedby", "help");
			expect(input).toHaveAttribute("aria-errormessage", "error");
			expect(input).toHaveAttribute("aria-invalid", "true");
			expect(input).toHaveAttribute("id", "email");
			expect(input).toHaveAttribute("name", "email");
		});

		test("forwards Slot props from the element form onto the child", () => {
			render(
				<Field.Control className="ok-on-element-form">
					<input aria-label="Email" />
				</Field.Control>,
			);
			expect(screen.getByRole("textbox", { name: "Email" })).toHaveClass("ok-on-element-form");
		});

		test("throws a descriptive error when children is not a valid element or function", () => {
			// The TS type forbids this, but JS callers can still pass strings
			// or arrays. Surface a clear error instead of crashing inside Slot.
			const consoleError = console.error;
			console.error = () => {};
			try {
				expect(() =>
					render(
						// @ts-expect-error - intentionally passing invalid children for the runtime guard
						<Field.Control>just a string</Field.Control>,
					),
				).toThrow(/Field\.Control/);
			} finally {
				console.error = consoleError;
			}
		});
	});

	describe("Field.Group", () => {
		test("carries data-slot=field-group", () => {
			render(<Field.Group data-testid="group">content</Field.Group>);
			const group = screen.getByTestId("group");
			expect(group).toHaveAttribute("data-slot", "field-group");
		});

		test("merges custom className", () => {
			render(<Field.Group className="custom-group" data-testid="group" />);
			expect(screen.getByTestId("group").className).toContain("custom-group");
		});

		test("renders as child element when asChild is true", () => {
			render(
				<Field.Group asChild>
					<section data-testid="group">content</section>
				</Field.Group>,
			);
			const group = screen.getByTestId("group");
			expect(group.tagName).toBe("SECTION");
			expect(group).toHaveAttribute("data-slot", "field-group");
		});
	});

	test("Field.Set renders a group with data-slot=field-set", () => {
		render(<Field.Set data-testid="set">content</Field.Set>);
		const set = screen.getByTestId("set");
		expect(screen.getByRole("group")).toBe(set);
		expect(set).toHaveAttribute("data-slot", "field-set");
	});

	describe("Field.Legend", () => {
		test("renders a legend with data-slot=field-legend", () => {
			render(
				<Field.Set>
					<Field.Legend data-testid="legend">Title</Field.Legend>
				</Field.Set>,
			);
			const legend = screen.getByTestId("legend");
			// A <legend> names its <fieldset>, so the group's accessible name is the element's observable.
			expect(screen.getByRole("group", { name: "Title" })).toContainElement(legend);
			expect(legend).toHaveAttribute("data-slot", "field-legend");
			expect(legend).toHaveTextContent("Title");
		});

		test("a consumer font size replaces the default text-sm", () => {
			// tailwind-merge override contract: the consumer's `text-base` replaces the
			// default `text-sm`, so the assertion reads the merge outcome.
			render(
				<Field.Set>
					<Field.Legend className="text-base" data-testid="legend">
						Title
					</Field.Legend>
				</Field.Set>,
			);
			const legend = screen.getByTestId("legend");
			expect(legend).toHaveClass("text-base");
			expect(legend).not.toHaveClass("text-sm");
		});

		test("user-supplied mb-* overrides the default mb-1.5", () => {
			// tailwind-merge override contract: a consumer `mb-*` replaces the default
			// `mb-1.5`, so the assertion reads the merge outcome.
			render(
				<Field.Set>
					<Field.Legend className="mb-0" data-testid="legend">
						Title
					</Field.Legend>
				</Field.Set>,
			);
			const legend = screen.getByTestId("legend");
			expect(legend).toHaveClass("mb-0");
			expect(legend).not.toHaveClass("mb-1.5");
		});
	});

	describe("Field.Description", () => {
		test("carries data-slot=field-description", () => {
			render(<Field.Description data-testid="desc">help</Field.Description>);
			const description = screen.getByTestId("desc");
			expect(description).toHaveAttribute("data-slot", "field-description");
			expect(description).toHaveTextContent("help");
		});

		test("merges custom className", () => {
			// tailwind-merge override contract: the consumer's `text-xs` replaces the
			// default `text-sm`, so the assertion reads the merge outcome.
			render(
				<Field.Description className="text-xs" data-testid="desc">
					help
				</Field.Description>,
			);
			const description = screen.getByTestId("desc");
			expect(description).toHaveClass("text-xs");
			expect(description).not.toHaveClass("text-sm");
		});

		test("renders as child element when asChild is true", () => {
			render(
				<Field.Description asChild>
					<span data-testid="desc">help</span>
				</Field.Description>,
			);
			const description = screen.getByTestId("desc");
			expect(description.tagName).toBe("SPAN");
			expect(description).toHaveAttribute("data-slot", "field-description");
		});

		test("the description's collapse selector spells the error list's data-slot", () => {
			// Cross-part spelling pin, asserting both sides together: the collapse selector
			// spells the list's `data-slot`, so a rename of either side alone turns this red.
			render(
				<Field.Item name="email">
					<Field.ErrorList data-testid="list">
						<Field.ErrorItem>Required</Field.ErrorItem>
					</Field.ErrorList>
					<Field.Description data-testid="desc">help</Field.Description>
				</Field.Item>,
			);
			expect(screen.getByTestId("list")).toHaveAttribute("data-slot", "field-error-list");
			expect(screen.getByTestId("desc")).toHaveClass(
				"[:where([data-slot=field-error-list]+&)]:-mt-1.5",
			);
		});
	});

	describe("Field.ErrorItem", () => {
		test("renders an li with data-slot=field-error", () => {
			render(<Field.ErrorItem data-testid="err">Required</Field.ErrorItem>);
			const error = screen.getByTestId("err");
			// Why tagName: a <ul> accepts only <li> children, so the element is the contract.
			expect(error.tagName).toBe("LI");
			expect(error).toHaveAttribute("data-slot", "field-error");
			expect(error).toHaveTextContent("Required");
		});

		test("merges custom className", () => {
			render(
				<Field.ErrorItem className="font-bold" data-testid="err">
					Required
				</Field.ErrorItem>,
			);
			// The tailwind-merge contract: the consumer's class survives the merge.
			expect(screen.getByTestId("err")).toHaveClass("font-bold");
		});

		test("renders nothing for empty or blank children", () => {
			const { container } = render(<Field.ErrorItem> </Field.ErrorItem>);
			expect(container).toBeEmptyDOMElement();
		});
	});

	describe("Field.LabelRow", () => {
		test("carries data-slot=field-label-row", () => {
			render(<Field.LabelRow data-testid="row">content</Field.LabelRow>);
			const row = screen.getByTestId("row");
			expect(row).toHaveAttribute("data-slot", "field-label-row");
		});

		test("merges custom className", () => {
			render(<Field.LabelRow className="justify-between" data-testid="row" />);
			// The tailwind-merge contract: the consumer's class survives the merge.
			expect(screen.getByTestId("row")).toHaveClass("justify-between");
		});

		test("renders as child element when asChild is true", () => {
			render(
				<Field.LabelRow asChild>
					<header data-testid="row">content</header>
				</Field.LabelRow>,
			);
			const row = screen.getByTestId("row");
			expect(row.tagName).toBe("HEADER");
			expect(row).toHaveAttribute("data-slot", "field-label-row");
		});
	});

	describe("Field.Help", () => {
		test("renders the default question-mark IconButton trigger", () => {
			render(
				<Field.Help defaultOpen={false}>
					<Field.HelpTrigger label="What is this field?" />
					<Field.HelpContent>help body</Field.HelpContent>
				</Field.Help>,
			);
			const trigger = screen.getByRole("button", { name: "What is this field?" });
			expect(trigger).toHaveAttribute("data-slot", "icon-button");
			expect(trigger).toHaveAttribute("data-size", "xs");
			expect(trigger).toHaveAttribute("data-appearance", "ghost");
			// tailwind-merge override contract: HelpTrigger's `text-body` replaces the ghost
			// IconButton's `text-strong` rest color, so the assertion reads the merge outcome.
			expect(trigger).toHaveClass("text-body");
			expect(trigger).not.toHaveClass("text-strong");
		});

		test("HelpTrigger forwards a custom label and merges className", () => {
			render(
				<Field.Help defaultOpen={false}>
					<Field.HelpTrigger label="What is this?" className="ml-2" />
					<Field.HelpContent>help body</Field.HelpContent>
				</Field.Help>,
			);
			// The tailwind-merge contract: the consumer's class survives the merge.
			expect(screen.getByRole("button", { name: "What is this?" })).toHaveClass("ml-2");
		});

		test("user-supplied my-* overrides the default -my-0.5", () => {
			// tailwind-merge override contract: a consumer `my-*` replaces the default
			// `-my-0.5`, so the assertion reads the merge outcome.
			render(
				<Field.Help defaultOpen={false}>
					<Field.HelpTrigger label="What is this?" className="my-0" />
					<Field.HelpContent>help body</Field.HelpContent>
				</Field.Help>,
			);
			const trigger = screen.getByRole("button", { name: "What is this?" });
			expect(trigger).toHaveClass("my-0");
			expect(trigger).not.toHaveClass("-my-0.5");
		});

		test("clicking Field.HelpTrigger opens the Field.Help popover", async () => {
			const user = userEvent.setup();
			render(
				<Field.Help>
					<Field.HelpTrigger label="What is this field?" />
					<Field.HelpContent>Copy this from the dashboard.</Field.HelpContent>
				</Field.Help>,
			);
			const trigger = screen.getByRole("button", { name: "What is this field?" });
			expect(trigger).toHaveAttribute("aria-expanded", "false");
			expect(screen.queryByText("Copy this from the dashboard.")).not.toBeInTheDocument();
			await user.click(trigger);
			expect(await screen.findByText("Copy this from the dashboard.")).toBeInTheDocument();
			expect(trigger).toHaveAttribute("aria-expanded", "true");
		});

		test("HelpContent overrides the inherited data-slot with field-help-content", () => {
			render(
				<Field.Help defaultOpen>
					<Field.HelpTrigger label="What is this field?" />
					<Field.HelpContent>Copy this from the dashboard.</Field.HelpContent>
				</Field.Help>,
			);
			expect(screen.getByText("Copy this from the dashboard.")).toHaveAttribute(
				"data-slot",
				"field-help-content",
			);
		});
	});

	describe("Field.Optional", () => {
		test("renders the default '(Optional)' content with data-slot", () => {
			render(<Field.Optional data-testid="opt" />);
			const optional = screen.getByTestId("opt");
			expect(optional).toHaveAttribute("data-slot", "field-optional");
			expect(optional).toHaveTextContent("(Optional)");
		});

		test("renders custom children when provided (e.g. for translation)", () => {
			render(<Field.Optional data-testid="opt">(Optionnel)</Field.Optional>);
			const optional = screen.getByTestId("opt");
			expect(optional).toHaveTextContent("(Optionnel)");
			expect(optional).not.toHaveTextContent("(Optional)");
		});

		test("merges custom className", () => {
			render(<Field.Optional className="italic" data-testid="opt" />);
			// The tailwind-merge contract: the consumer's class survives the merge.
			expect(screen.getByTestId("opt")).toHaveClass("italic");
		});

		test("renders as child element when asChild is true", () => {
			render(
				<Field.Optional asChild>
					<em data-testid="opt">(Optional)</em>
				</Field.Optional>,
			);
			const optional = screen.getByTestId("opt");
			expect(optional.tagName).toBe("EM");
			expect(optional).toHaveAttribute("data-slot", "field-optional");
		});
	});

	describe("Field.LabelText", () => {
		test("carries data-slot=field-label-text", () => {
			render(<Field.LabelText data-testid="lt">Owner</Field.LabelText>);
			const labelText = screen.getByTestId("lt");
			expect(labelText).toHaveAttribute("data-slot", "field-label-text");
			expect(labelText).toHaveTextContent("Owner");
		});

		test("merges custom className", () => {
			render(
				<Field.LabelText className="italic" data-testid="lt">
					Owner
				</Field.LabelText>,
			);
			// The tailwind-merge contract: the consumer's class survives the merge.
			expect(screen.getByTestId("lt")).toHaveClass("italic");
		});

		test("renders as child element when asChild is true", () => {
			render(
				<Field.LabelText asChild>
					<span data-testid="lt">Owner</span>
				</Field.LabelText>,
			);
			const labelText = screen.getByTestId("lt");
			expect(labelText.tagName).toBe("SPAN");
			expect(labelText).toHaveAttribute("data-slot", "field-label-text");
		});
	});

	describe("Field.ErrorList", () => {
		test("renders a list with data-slot=field-error-list", () => {
			render(
				<Field.ErrorList data-testid="list">
					<Field.ErrorItem>Required</Field.ErrorItem>
				</Field.ErrorList>,
			);
			const list = screen.getByTestId("list");
			expect(screen.getByRole("list")).toBe(list);
			expect(list).toHaveAttribute("data-slot", "field-error-list");
		});

		test("sets role=list by default", () => {
			render(
				<Field.ErrorList data-testid="list">
					<Field.ErrorItem>Required</Field.ErrorItem>
				</Field.ErrorList>,
			);
			expect(screen.getByTestId("list")).toHaveAttribute("role", "list");
		});

		test("allows overriding the default role", () => {
			render(
				<Field.ErrorList data-testid="list" role="presentation">
					<Field.ErrorItem>Required</Field.ErrorItem>
				</Field.ErrorList>,
			);
			expect(screen.getByTestId("list")).toHaveAttribute("role", "presentation");
		});

		test("merges custom className", () => {
			render(
				<Field.ErrorList className="custom-list" data-testid="list">
					<Field.ErrorItem>Required</Field.ErrorItem>
				</Field.ErrorList>,
			);
			expect(screen.getByTestId("list").className).toContain("custom-list");
		});

		test("renders each Field.ErrorItem child as a list item", () => {
			render(
				<Field.ErrorList>
					<Field.ErrorItem>First error</Field.ErrorItem>
					<Field.ErrorItem>Second error</Field.ErrorItem>
					<Field.ErrorItem>Third error</Field.ErrorItem>
				</Field.ErrorList>,
			);
			const errors = screen.getAllByRole("listitem");
			expect(errors.map((error) => error.textContent)).toEqual([
				"First error",
				"Second error",
				"Third error",
			]);
			for (const error of errors) {
				expect(error).toHaveAttribute("data-slot", "field-error");
			}
		});

		test("renders nothing when every Field.ErrorItem child is empty", () => {
			const { container } = render(
				<Field.ErrorList>
					<Field.ErrorItem>{undefined}</Field.ErrorItem>
					<Field.ErrorItem> </Field.ErrorItem>
				</Field.ErrorList>,
			);
			expect(container).toBeEmptyDOMElement();
		});

		test("renders as child element when asChild is true", () => {
			render(
				<Field.ErrorList asChild>
					<ol data-testid="list">
						<Field.ErrorItem>Required</Field.ErrorItem>
					</ol>
				</Field.ErrorList>,
			);
			const list = screen.getByTestId("list");
			expect(list.tagName).toBe("OL");
			expect(list).toHaveAttribute("data-slot", "field-error-list");
		});
	});

	describe("Field.Errors", () => {
		test("renders normalized string messages as a semantic error list", () => {
			render(
				<Field.Errors
					data-testid="errors"
					messages={[" Required ", undefined, "", "Required", "Too short", " Too short ", false]}
				/>,
			);

			const list = screen.getByTestId("errors");
			expect(screen.getByRole("list")).toBe(list);
			expect(list).toHaveAttribute("data-slot", "field-error-list");
			expect(list).toHaveAttribute("role", "list");
			expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
				"Required",
				"Too short",
			]);
		});

		test("renders nothing when all messages normalize away", () => {
			const { container } = render(<Field.Errors messages={[undefined, " ", false]} />);
			expect(container).toBeEmptyDOMElement();
		});

		test("forwards refs and list props to the rendered error list", () => {
			const errorListRef = createRef<HTMLUListElement>();

			render(
				<Field.Errors
					ref={errorListRef}
					className="custom-list"
					data-testid="errors"
					messages={["Required"]}
					role="presentation"
				/>,
			);

			const list = screen.getByTestId("errors");
			expect(errorListRef.current).toBe(list);
			expect(list.className).toContain("custom-list");
			expect(list).toHaveAttribute("role", "presentation");
		});
	});
});

describe("Field server render", () => {
	// Why a parsed container: `Field.Item` generates the slot ids, so the
	// assertions read them back from the HTML instead of matching a literal.
	const renderServerHtml = (element: ReactElement) => {
		const container = document.createElement("div");
		container.innerHTML = renderToString(element);
		return container;
	};

	test("an explicit validation puts the error state in the server HTML", () => {
		const messages = ["Required"];
		const container = renderServerHtml(
			<Field.Item name="email" validation={messages.length > 0 && "error"}>
				<Field.Control>
					<input aria-label="Email" />
				</Field.Control>
				<Field.Errors messages={messages} />
			</Field.Item>,
		);

		const errorListId = container.querySelector('[data-slot="field-error-list"]')?.id;
		expect(errorListId).toEqual(expect.any(String));
		expect(container.querySelector('[data-slot="field-item"]')).toHaveAttribute(
			"data-validation",
			"error",
		);
		const input = container.querySelector("input");
		expect(input).toHaveAttribute("aria-invalid", "true");
		expect(input).toHaveAttribute("aria-errormessage", errorListId);
		expect(input?.getAttribute("aria-describedby")).toContain(errorListId);
	});

	test("the inferred error state is absent from the server HTML", () => {
		// The inference runs after hydration, as the `Field.Item`, `Field.Errors`, and
		// `Field.ErrorList` docs state. A change in this output is a documented
		// contract change, not a side effect.
		const container = renderServerHtml(
			<Field.Item name="email">
				<Field.Control>
					<input aria-label="Email" />
				</Field.Control>
				<Field.Errors messages={["Required"]} />
			</Field.Item>,
		);

		expect(container.querySelector('[data-slot="field-error-list"]')).toHaveTextContent("Required");
		expect(container.querySelector('[data-slot="field-item"]')).not.toHaveAttribute(
			"data-validation",
		);
		const input = container.querySelector("input");
		expect(input).toHaveAttribute("aria-describedby");
		expect(input).not.toHaveAttribute("aria-invalid");
		expect(input).not.toHaveAttribute("aria-errormessage");
	});

	test("the documented validation idiom renders a neutral field on the server with no messages", () => {
		const messages: string[] = [];
		const container = renderServerHtml(
			<Field.Item name="email" validation={messages.length > 0 && "error"}>
				<Field.Control>
					<input aria-label="Email" />
				</Field.Control>
				<Field.Errors messages={messages} />
			</Field.Item>,
		);

		expect(container.querySelector('[data-slot="field-error-list"]')).toBeNull();
		expect(container.querySelector('[data-slot="field-item"]')).not.toHaveAttribute(
			"data-validation",
		);
		const input = container.querySelector("input");
		expect(input).not.toHaveAttribute("aria-invalid");
		expect(input).not.toHaveAttribute("aria-errormessage");
	});
});

test("an explicit validation keeps the Field.Item context stable while Field.Errors gains messages", () => {
	const probeRender = vi.fn<() => void>();
	const Probe = () => {
		useContext(FieldItemContext);
		probeRender();
		return null;
	};

	const { rerender } = render(
		<Field.Item name="email" validation="error">
			<Probe />
			<Field.Errors messages={[]} />
		</Field.Item>,
	);
	expect(probeRender).toHaveBeenCalledTimes(1);

	rerender(
		<Field.Item name="email" validation="error">
			<Probe />
			<Field.Errors messages={["Required"]} />
		</Field.Item>,
	);

	// One render for the parent update. A third would come from a new context
	// identity after the error list registers, which an explicit `validation`
	// cannot observe.
	expect(probeRender).toHaveBeenCalledTimes(2);
});

test("Field.Control keeps the control's own data-slot when it clones the child", () => {
	render(
		<Field.Item name="terms">
			<Field.Control>
				<Checkbox aria-label="Accept terms" />
			</Field.Control>
		</Field.Item>,
	);
	expect(screen.getByRole("checkbox")).toHaveAttribute("data-slot", "checkbox");
});
