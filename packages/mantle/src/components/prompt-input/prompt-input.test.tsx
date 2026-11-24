import { fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { type ComponentProps, useState } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import * as PromptInput from "./prompt-input-parts.js";

type ComposerProps = {
	onSubmit: (message: string) => void;
	onStop?: () => void;
	streaming?: boolean;
	submitProps?: Omit<ComponentProps<typeof PromptInput.Submit>, "children">;
	textAreaProps?: Omit<ComponentProps<typeof PromptInput.TextArea>, "value" | "onChange">;
};

/** The documented composer: the app owns the draft and reads it on submit. */
function Composer({
	onSubmit,
	onStop = () => {},
	streaming = false,
	submitProps,
	textAreaProps,
}: ComposerProps) {
	const [draft, setDraft] = useState("");
	return (
		<PromptInput.Root
			streaming={streaming}
			onStop={onStop}
			onSubmit={(event) => {
				event.preventDefault();
				onSubmit(draft);
			}}
		>
			<PromptInput.TextArea
				aria-label="Message"
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
				{...textAreaProps}
			/>
			<PromptInput.Footer>
				<PromptInput.Submit {...submitProps} />
			</PromptInput.Footer>
		</PromptInput.Root>
	);
}

describe("PromptInput", () => {
	test("Enter submits the form with the typed message", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn<(message: string) => void>();
		render(<Composer onSubmit={onSubmit} />);

		await user.type(screen.getByRole("textbox", { name: "Message" }), "what's live?{Enter}");

		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit).toHaveBeenLastCalledWith("what's live?");
		expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue("what's live?");
	});

	test("Shift+Enter adds a line and does not submit", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn<(message: string) => void>();
		render(<Composer onSubmit={onSubmit} />);

		await user.type(
			screen.getByRole("textbox", { name: "Message" }),
			"one{Shift>}{Enter}{/Shift}two",
		);

		expect(onSubmit).toHaveBeenCalledTimes(0);
		expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue("one\ntwo");
	});

	test.each([
		{ name: "isComposing", init: { isComposing: true } },
		{ name: "Safari keyCode 229", init: { keyCode: 229 } },
	])("the Enter that confirms an IME candidate does not submit ($name)", ({ init }) => {
		const onSubmit = vi.fn<(message: string) => void>();
		render(<Composer onSubmit={onSubmit} />);

		const textbox = screen.getByRole("textbox", { name: "Message" });
		const notPrevented = fireEvent.keyDown(textbox, { key: "Enter", ...init });

		expect(onSubmit).toHaveBeenCalledTimes(0);
		expect(notPrevented).toBe(true);
	});

	test("the send button submits the form", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn<(message: string) => void>();
		render(<Composer onSubmit={onSubmit} />);

		await user.type(screen.getByRole("textbox", { name: "Message" }), "hi");
		await user.click(screen.getByRole("button", { name: "Send message" }));

		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit).toHaveBeenLastCalledWith("hi");
	});

	test("while streaming, the same button stops the answer and keeps focus", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn<(message: string) => void>();
		const onStop = vi.fn<() => void>();
		const { rerender } = render(<Composer onSubmit={onSubmit} onStop={onStop} />);
		const sendButton = screen.getByRole("button", { name: "Send message" });
		sendButton.focus();

		rerender(<Composer onSubmit={onSubmit} onStop={onStop} streaming />);
		const stopButton = screen.getByRole("button", { name: "Stop answer" });
		expect(stopButton).toBe(sendButton);
		expect(stopButton).toHaveFocus();

		await user.click(stopButton);

		expect(onStop).toHaveBeenCalledTimes(1);
		expect(onStop).toHaveBeenLastCalledWith();
		expect(onSubmit).toHaveBeenCalledTimes(0);
	});

	test("while streaming, Enter keeps the draft and does not submit", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn<(message: string) => void>();
		render(<Composer onSubmit={onSubmit} streaming />);

		await user.type(screen.getByRole("textbox", { name: "Message" }), "next question{Enter}");

		expect(onSubmit).toHaveBeenCalledTimes(0);
		expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue("next question");
	});

	test("Enter does not submit when the default button is disabled", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn<(message: string) => void>();
		render(<Composer onSubmit={onSubmit} submitProps={{ disabled: true }} />);

		await user.type(screen.getByRole("textbox", { name: "Message" }), "hi{Enter}");

		expect(onSubmit).toHaveBeenCalledTimes(0);
	});

	test.each(["onKeyDown", "onClick"])(
		"a consumer %s can cancel Enter submission",
		async (handler) => {
			const user = userEvent.setup();
			const onSubmit = vi.fn<(message: string) => void>();
			render(
				<Composer
					onSubmit={onSubmit}
					submitProps={{
						onClick: (event) => {
							if (handler === "onClick") {
								event.preventDefault();
							}
						},
					}}
					textAreaProps={{
						onKeyDown: (event) => {
							if (handler === "onKeyDown" && event.key === "Enter") {
								event.preventDefault();
							}
						},
					}}
				/>,
			);

			await user.type(screen.getByRole("textbox", { name: "Message" }), "hi{Enter}");

			expect(onSubmit).toHaveBeenCalledTimes(0);
		},
	);

	test("Enter submits without a submit button", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn<() => void>();
		render(
			<PromptInput.Root
				onSubmit={(event) => {
					event.preventDefault();
					onSubmit();
				}}
			>
				<PromptInput.TextArea aria-label="Message" />
			</PromptInput.Root>,
		);
		await user.type(screen.getByRole("textbox", { name: "Message" }), "hello{Enter}");
		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit).toHaveBeenLastCalledWith();
	});

	test("the server renders a streaming composer as a stop button", () => {
		const container = document.createElement("div");
		container.innerHTML = renderToString(<Composer onSubmit={() => {}} streaming />);
		expect(container.querySelector("form")).toHaveAttribute("data-streaming", "");
		expect(container.querySelector("button")).toHaveAttribute("type", "button");
		expect(container.querySelector("button")).toHaveAttribute("aria-label", "Stop answer");
	});

	test("Root stamps data-streaming only while streaming", () => {
		const { container, rerender } = render(<Composer onSubmit={() => {}} streaming />);
		const root = container.querySelector('[data-slot="prompt-input"]');
		expect(root).toHaveAttribute("data-streaming", "");

		rerender(<Composer onSubmit={() => {}} />);
		expect(root).not.toHaveAttribute("data-streaming");
	});

	test("each part forwards className, ref, and data attributes, and joins data-slot", () => {
		const rootRef = vi.fn<(node: HTMLFormElement | null) => void>();
		render(
			<PromptInput.Root
				ref={rootRef}
				className="root-class"
				data-testid="root"
				aria-label="Composer"
			>
				<PromptInput.TextArea aria-label="Message" className="field-class" data-slot="outer" />
				<PromptInput.Footer className="footer-class" data-testid="footer">
					<PromptInput.Submit className="submit-class" />
				</PromptInput.Footer>
			</PromptInput.Root>,
		);

		const root = screen.getByRole("form", { name: "Composer" });
		expect(rootRef).toHaveBeenLastCalledWith(root);
		expect(root).toHaveClass("root-class");
		expect(root).toHaveAttribute("data-testid", "root");
		expect(root).toHaveAttribute("data-slot", "prompt-input");
		expect(screen.getByRole("textbox", { name: "Message" })).toHaveAttribute(
			"data-slot",
			"outer prompt-input-text-area text-area",
		);
		expect(screen.getByTestId("footer")).toHaveAttribute("data-slot", "prompt-input-footer");
		expect(screen.getByRole("button", { name: "Send message" })).toHaveAttribute(
			"data-slot",
			expect.stringContaining("prompt-input-submit"),
		);
	});

	test("Root with asChild renders the child form and merges props", () => {
		const ref = vi.fn<(node: HTMLFormElement | null) => void>();
		render(
			<PromptInput.Root asChild ref={ref} className="root-class" data-testid="root">
				<form aria-label="Router form" className="child-class">
					<PromptInput.TextArea aria-label="Message" />
				</form>
			</PromptInput.Root>,
		);

		const form = screen.getByRole("form", { name: "Router form" });
		expect(form).toHaveClass("root-class", "child-class");
		expect(form).toHaveAttribute("data-testid", "root");
		expect(form).toHaveAttribute("data-slot", "prompt-input");
		expect(ref).toHaveBeenLastCalledWith(form);
	});

	test("Footer with asChild merges classes, data attributes, and the ref", () => {
		const ref = vi.fn<(node: HTMLDivElement | null) => void>();
		render(
			<PromptInput.Footer asChild ref={ref} className="footer-class" data-testid="footer">
				<div className="child-class" data-slot="child">
					Controls
				</div>
			</PromptInput.Footer>,
		);
		const footer = screen.getByTestId("footer");
		expect(footer).toHaveClass("footer-class", "child-class");
		expect(footer).toHaveAttribute("data-slot", "prompt-input-footer child");
		expect(ref).toHaveBeenLastCalledWith(footer);
	});

	test("a part outside Root throws", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<PromptInput.Submit />)).toThrow(
			"PromptInput.Submit must be rendered inside PromptInput.Root.",
		);
	});
});
