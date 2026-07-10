import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import type { ComponentProps, ReactNode } from "react";
import { describe, expect, test } from "vitest";
import { Input } from "../input/input.js";
import type { FieldControlAriaProps } from "./field-context.js";
import { Field } from "./field.js";

const MockControl = (props: ComponentProps<"input">) => <input {...props} />;
MockControl.displayName = "Input";

const MockWrapper = ({ children }: { children: ReactNode }) => children;

describe("Field", () => {
	test("renders a label that defaults htmlFor from the surrounding Field.Item", () => {
		render(<Field.Label htmlFor="email">Email</Field.Label>);
		expect(screen.getByText("Email").tagName).toBe("LABEL");
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

			render(
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

			expect(setRef.current?.tagName).toBe("FIELDSET");
			expect(legendRef.current?.tagName).toBe("LEGEND");
			expect(groupRef.current?.tagName).toBe("DIV");
			expect(itemRef.current?.tagName).toBe("DIV");
			expect(labelRowRef.current?.tagName).toBe("DIV");
			expect(optionalRef.current?.tagName).toBe("SPAN");
			expect(descriptionRef.current?.tagName).toBe("P");
			expect(errorListRef.current?.tagName).toBe("UL");
			expect(errorRef.current?.tagName).toBe("LI");
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
		test("renders a plain div with no implicit role", () => {
			render(
				<Field.Item data-testid="root" name="example">
					content
				</Field.Item>,
			);
			const root = screen.getByTestId("root");
			expect(root.tagName).toBe("DIV");
			expect(root).not.toHaveAttribute("role");
			expect(root).toHaveTextContent("content");
		});

		test("forwards data-slot=field-item", () => {
			render(<Field.Item data-testid="root" name="example" />);
			expect(screen.getByTestId("root")).toHaveAttribute("data-slot", "field-item");
		});

		test("merges custom className while keeping default layout classes", () => {
			render(<Field.Item className="custom-class" data-testid="root" name="example" />);
			const root = screen.getByTestId("root");
			expect(root.className).toContain("custom-class");
			expect(root.className).toContain("flex");
			expect(root.className).toContain("flex-col");
			expect(root.className).toContain("gap-1.5");
		});

		test("forwards arbitrary data-* attributes", () => {
			render(<Field.Item data-custom="hello" data-testid="root" name="example" />);
			expect(screen.getByTestId("root")).toHaveAttribute("data-custom", "hello");
		});

		test("allows opting in to a role when needed", () => {
			render(<Field.Item data-testid="root" name="example" role="group" />);
			expect(screen.getByTestId("root")).toHaveAttribute("role", "group");
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

		test("does not mark a control invalid for an empty Field.ErrorList", () => {
			render(
				<Field.Item name="example">
					<Field.Control>
						<input aria-label="Email" />
					</Field.Control>
					<Field.ErrorList>{[]}</Field.ErrorList>
				</Field.Item>,
			);

			const input = screen.getByRole("textbox", { name: "Email" });
			expect(input).not.toHaveAttribute("aria-errormessage");
			expect(input).not.toHaveAttribute("aria-invalid");
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

		test("does not mark a control invalid when Field.ErrorList contains only an empty fragment", () => {
			render(
				<Field.Item name="example">
					<Field.Control>
						<input aria-label="Email" />
					</Field.Control>
					<Field.ErrorList>
						{/* oxlint-disable-next-line jsx-no-useless-fragment */}
						<></>
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

		test("does not mark a control invalid for empty Field.Errors messages", () => {
			render(
				<Field.Item name="example">
					<Field.Control>
						<input aria-label="Email" />
					</Field.Control>
					<Field.Errors messages={[undefined, "  ", false]} />
				</Field.Item>,
			);

			const input = screen.getByRole("textbox", { name: "Email" });
			expect(input).not.toHaveAttribute("aria-errormessage");
			expect(input).not.toHaveAttribute("aria-invalid");
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
					<Field.Control>
						{(controlProps) => (
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

		test("render-prop variant rejects extra DOM props at the type level", () => {
			// The render-prop form does not render `Slot`, so DOM props and a
			// forwarded ref have nowhere to land. The discriminated union
			// keeps those off the render-prop variant; the element-child form
			// still accepts them.
			const renderPropWithClassName = (
				// @ts-expect-error -- className is not allowed alongside a render-prop child
				<Field.Control className="should-not-typecheck">
					{(controlProps: FieldControlAriaProps) => <input {...controlProps} />}
				</Field.Control>
			);

			const elementWithClassName = (
				<Field.Control className="ok-on-element-form">
					<input />
				</Field.Control>
			);

			expect(renderPropWithClassName).toBeTruthy();
			expect(elementWithClassName).toBeTruthy();
		});

		test("supports custom wrappers with the render prop API", () => {
			render(
				<Field.Item name="example">
					<Field.Control>
						{(controlProps) => (
							<MockWrapper>
								<MockControl aria-label="Wrapped control" {...controlProps} />
							</MockWrapper>
						)}
					</Field.Control>
					<Field.Description>Wrapped help.</Field.Description>
				</Field.Item>,
			);

			const input = screen.getByRole("textbox", { name: "Wrapped control" });
			const description = screen.getByText("Wrapped help.");
			expect(input.getAttribute("aria-describedby")).toContain(description.id);
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
		test("renders a div with data-slot=field-group", () => {
			render(<Field.Group data-testid="group">content</Field.Group>);
			const group = screen.getByTestId("group");
			expect(group.tagName).toBe("DIV");
			expect(group).toHaveAttribute("data-slot", "field-group");
			expect(group.className).toContain("gap-4");
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

	describe("Field.Set", () => {
		test("renders a fieldset with data-slot=field-set", () => {
			render(<Field.Set data-testid="set">content</Field.Set>);
			const set = screen.getByTestId("set");
			expect(set.tagName).toBe("FIELDSET");
			expect(set).toHaveAttribute("data-slot", "field-set");
		});

		test("applies fieldset reset classes", () => {
			render(<Field.Set data-testid="set" />);
			const set = screen.getByTestId("set");
			expect(set.className).toContain("border-0");
			expect(set.className).toContain("p-0");
			expect(set.className).toContain("min-w-0");
		});
	});

	describe("Field.Legend", () => {
		test("renders a legend with data-slot=field-legend", () => {
			render(
				<Field.Set>
					<Field.Legend data-testid="legend">Title</Field.Legend>
				</Field.Set>,
			);
			const legend = screen.getByTestId("legend");
			expect(legend.tagName).toBe("LEGEND");
			expect(legend).toHaveAttribute("data-slot", "field-legend");
			expect(legend).toHaveTextContent("Title");
		});

		test("merges custom className while keeping label typography", () => {
			render(
				<Field.Set>
					<Field.Legend className="text-base" data-testid="legend">
						Title
					</Field.Legend>
				</Field.Set>,
			);
			const legend = screen.getByTestId("legend");
			expect(legend.className).toContain("text-base");
			expect(legend.className).toContain("text-strong");
			expect(legend.className).toContain("font-medium");
		});

		test("has a default mb-1.5 so the legend sits 6px above its next sibling", () => {
			// `<legend>` ignores the parent fieldset's flex `gap`, so the legend
			// owns its own bottom-margin. The default keeps Field.Set / RadioGroup
			// rhythm matching the figma without extra wiring at the call site.
			render(
				<Field.Set>
					<Field.Legend data-testid="legend">Title</Field.Legend>
				</Field.Set>,
			);
			expect(screen.getByTestId("legend").className).toContain("mb-1.5");
		});

		test("user-supplied mb-* overrides the default mb-1.5", () => {
			render(
				<Field.Set>
					<Field.Legend className="mb-0" data-testid="legend">
						Title
					</Field.Legend>
				</Field.Set>,
			);
			const legend = screen.getByTestId("legend");
			expect(legend.className).toContain("mb-0");
			expect(legend.className).not.toContain("mb-1.5");
		});
	});

	describe("Field.Description", () => {
		test("renders a p with data-slot=field-description", () => {
			render(<Field.Description data-testid="desc">help</Field.Description>);
			const description = screen.getByTestId("desc");
			expect(description.tagName).toBe("P");
			expect(description).toHaveAttribute("data-slot", "field-description");
			expect(description).toHaveTextContent("help");
		});

		test("applies muted body color and small text by default", () => {
			render(<Field.Description data-testid="desc">help</Field.Description>);
			const description = screen.getByTestId("desc");
			expect(description.className).toContain("text-body");
			expect(description.className).toContain("text-sm");
		});

		test("merges custom className", () => {
			render(
				<Field.Description className="text-xs" data-testid="desc">
					help
				</Field.Description>,
			);
			const description = screen.getByTestId("desc");
			expect(description.className).toContain("text-xs");
			expect(description.className).toContain("text-body");
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
			expect(description.className).toContain("text-body");
		});

		test("carries the auto -mt-1.5 collapse rule for following a Field.ErrorList", () => {
			render(<Field.Description data-testid="desc">help</Field.Description>);
			expect(screen.getByTestId("desc").className).toContain(
				"[:where([data-slot=field-error-list]+&)]:-mt-1.5",
			);
		});
	});

	describe("Field.ErrorItem", () => {
		test("renders an li with data-slot=field-error", () => {
			render(<Field.ErrorItem data-testid="err">Required</Field.ErrorItem>);
			const error = screen.getByTestId("err");
			expect(error.tagName).toBe("LI");
			expect(error).toHaveAttribute("data-slot", "field-error");
			expect(error).toHaveTextContent("Required");
		});

		test("applies danger color and small text by default", () => {
			render(<Field.ErrorItem data-testid="err">Required</Field.ErrorItem>);
			const error = screen.getByTestId("err");
			expect(error.className).toContain("text-danger-600");
			expect(error.className).toContain("text-sm");
		});

		test("merges custom className", () => {
			render(
				<Field.ErrorItem className="font-bold" data-testid="err">
					Required
				</Field.ErrorItem>,
			);
			const error = screen.getByTestId("err");
			expect(error.className).toContain("font-bold");
			expect(error.className).toContain("text-danger-600");
		});

		test("renders nothing for empty or blank children", () => {
			const { container } = render(<Field.ErrorItem> </Field.ErrorItem>);
			expect(container).toBeEmptyDOMElement();
		});
	});

	describe("Field.LabelRow", () => {
		test("renders a div with data-slot=field-label-row", () => {
			render(<Field.LabelRow data-testid="row">content</Field.LabelRow>);
			const row = screen.getByTestId("row");
			expect(row.tagName).toBe("DIV");
			expect(row).toHaveAttribute("data-slot", "field-label-row");
		});

		test("applies horizontal flex layout with center alignment and gap-1", () => {
			render(<Field.LabelRow data-testid="row" />);
			const row = screen.getByTestId("row");
			expect(row.className).toContain("flex");
			expect(row.className).toContain("items-center");
			expect(row.className).toContain("gap-1");
		});

		test("merges custom className", () => {
			render(<Field.LabelRow className="justify-between" data-testid="row" />);
			const row = screen.getByTestId("row");
			expect(row.className).toContain("justify-between");
			expect(row.className).toContain("gap-1");
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
			expect(trigger.className).toContain("text-body");
		});

		test("HelpTrigger forwards a custom label and merges className", () => {
			render(
				<Field.Help defaultOpen={false}>
					<Field.HelpTrigger label="What is this?" className="ml-2" />
					<Field.HelpContent>help body</Field.HelpContent>
				</Field.Help>,
			);
			const trigger = screen.getByRole("button", { name: "What is this?" });
			expect(trigger.className).toContain("ml-2");
			expect(trigger.className).toContain("text-body");
		});

		test("HelpTrigger trims its flex-line contribution with a default -my-0.5", () => {
			// Without the negative y-margin the 24px (`size-6`) `xs` IconButton
			// drives the LabelRow to 24px and pushes the 20px label text down 2px.
			// The negative margin keeps the click target while contributing only
			// 20px to the flex line so the label stays vertically centered.
			render(
				<Field.Help defaultOpen={false}>
					<Field.HelpTrigger label="What is this?" />
					<Field.HelpContent>help body</Field.HelpContent>
				</Field.Help>,
			);
			expect(screen.getByRole("button", { name: "What is this?" }).className).toContain("-my-0.5");
		});

		test("user-supplied my-* overrides the default -my-0.5", () => {
			render(
				<Field.Help defaultOpen={false}>
					<Field.HelpTrigger label="What is this?" className="my-0" />
					<Field.HelpContent>help body</Field.HelpContent>
				</Field.Help>,
			);
			const trigger = screen.getByRole("button", { name: "What is this?" });
			expect(trigger.className).toContain("my-0");
			expect(trigger.className).not.toContain("-my-0.5");
		});

		test("HelpContent renders the popover body when open", () => {
			render(
				<Field.Help defaultOpen>
					<Field.HelpTrigger label="What is this field?" />
					<Field.HelpContent>Copy this from the dashboard.</Field.HelpContent>
				</Field.Help>,
			);
			expect(screen.getByText("Copy this from the dashboard.")).toBeInTheDocument();
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
		test("renders a span with default '(Optional)' content and data-slot", () => {
			render(<Field.Optional data-testid="opt" />);
			const optional = screen.getByTestId("opt");
			expect(optional.tagName).toBe("SPAN");
			expect(optional).toHaveAttribute("data-slot", "field-optional");
			expect(optional).toHaveTextContent("(Optional)");
		});

		test("applies muted color and small normal-weight typography", () => {
			render(<Field.Optional data-testid="opt" />);
			const optional = screen.getByTestId("opt");
			expect(optional.className).toContain("text-muted");
			expect(optional.className).toContain("text-sm");
			expect(optional.className).toContain("font-normal");
		});

		test("renders custom children when provided (e.g. for translation)", () => {
			render(<Field.Optional data-testid="opt">(Optionnel)</Field.Optional>);
			const optional = screen.getByTestId("opt");
			expect(optional).toHaveTextContent("(Optionnel)");
			expect(optional).not.toHaveTextContent("(Optional)");
		});

		test("merges custom className", () => {
			render(<Field.Optional className="italic" data-testid="opt" />);
			const optional = screen.getByTestId("opt");
			expect(optional.className).toContain("italic");
			expect(optional.className).toContain("text-muted");
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
			expect(optional.className).toContain("text-muted");
		});
	});

	describe("Field.LabelText", () => {
		test("renders a <p> with data-slot and label typography", () => {
			render(<Field.LabelText data-testid="lt">Owner</Field.LabelText>);
			const labelText = screen.getByTestId("lt");
			expect(labelText.tagName).toBe("P");
			expect(labelText).toHaveAttribute("data-slot", "field-label-text");
			expect(labelText).toHaveTextContent("Owner");
			expect(labelText.className).toContain("text-strong");
			expect(labelText.className).toContain("text-sm");
			expect(labelText.className).toContain("font-medium");
		});

		test("merges custom className", () => {
			render(
				<Field.LabelText className="italic" data-testid="lt">
					Owner
				</Field.LabelText>,
			);
			const labelText = screen.getByTestId("lt");
			expect(labelText.className).toContain("italic");
			expect(labelText.className).toContain("text-strong");
		});

		test("does not render a <label> — has no focusable control to caption", () => {
			const { container } = render(<Field.LabelText>Owner</Field.LabelText>);
			expect(container.querySelector("label")).toBeNull();
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
			expect(labelText.className).toContain("text-strong");
		});
	});

	describe("Field.ErrorList", () => {
		test("renders a ul with data-slot=field-error-list", () => {
			render(
				<Field.ErrorList data-testid="list">
					<Field.ErrorItem>Required</Field.ErrorItem>
				</Field.ErrorList>,
			);
			const list = screen.getByTestId("list");
			expect(list.tagName).toBe("UL");
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

		test("strips default ul styling so it composes inside Field.Item", () => {
			render(
				<Field.ErrorList data-testid="list">
					<Field.ErrorItem>Required</Field.ErrorItem>
				</Field.ErrorList>,
			);
			const list = screen.getByTestId("list");
			expect(list.className).toContain("list-none");
			expect(list.className).toContain("p-0");
			expect(list.className).toContain("m-0");
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
			const errors = screen.getAllByText(/error$/);
			expect(errors).toHaveLength(3);
			for (const error of errors) {
				expect(error.tagName).toBe("LI");
				expect(error).toHaveAttribute("data-slot", "field-error");
			}
		});

		test("renders nothing when given no children", () => {
			const { container } = render(<Field.ErrorList />);
			expect(container).toBeEmptyDOMElement();
		});

		test("renders nothing when an empty array is passed as children", () => {
			const { container } = render(<Field.ErrorList>{[]}</Field.ErrorList>);
			expect(container).toBeEmptyDOMElement();
		});

		test("renders nothing when conditional children resolve to false", () => {
			const { container } = render(<Field.ErrorList>{false}</Field.ErrorList>);
			expect(container).toBeEmptyDOMElement();
		});

		test("renders nothing when an empty fragment is passed as children", () => {
			const { container } = render(
				<Field.ErrorList>
					{/* oxlint-disable-next-line jsx-no-useless-fragment */}
					<></>
				</Field.ErrorList>,
			);
			expect(container).toBeEmptyDOMElement();
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
			expect(list.tagName).toBe("UL");
			expect(list).toHaveAttribute("data-slot", "field-error-list");
			expect(list).toHaveAttribute("role", "list");
			expect(screen.getByText("Required").tagName).toBe("LI");
			expect(screen.getByText("Too short").tagName).toBe("LI");
			expect(screen.getAllByRole("listitem")).toHaveLength(2);
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

	describe("composition", () => {
		test("renders a full Set + Legend + Group + Item tree", () => {
			render(
				<Field.Set data-testid="set">
					<Field.Legend data-testid="legend">Account</Field.Legend>
					<Field.Group data-testid="group">
						<Field.Item data-testid="root-1" name="email">
							<label htmlFor="email">Email</label>
							<input id="email" name="email" />
							<Field.ErrorList data-testid="errs">
								<Field.ErrorItem data-testid="err">Email is required.</Field.ErrorItem>
							</Field.ErrorList>
							<Field.Description data-testid="desc">
								We&apos;ll never share your email.
							</Field.Description>
						</Field.Item>
						<Field.Item data-testid="root-2" name="password">
							<label htmlFor="password">Password</label>
							<input id="password" name="password" type="password" />
						</Field.Item>
					</Field.Group>
				</Field.Set>,
			);

			expect(screen.getByTestId("set").tagName).toBe("FIELDSET");
			expect(screen.getByTestId("legend").tagName).toBe("LEGEND");
			expect(screen.getByTestId("group").tagName).toBe("DIV");
			expect(screen.getByTestId("root-1").tagName).toBe("DIV");
			expect(screen.getByTestId("root-2").tagName).toBe("DIV");
			expect(screen.getByTestId("errs").tagName).toBe("UL");
			expect(screen.getByTestId("err").tagName).toBe("LI");
			expect(screen.getByTestId("err")).toHaveTextContent("Email is required.");
			expect(screen.getByTestId("desc")).toHaveTextContent("We'll never share your email.");
		});
	});
});
