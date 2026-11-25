import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import * as Conversation from "./conversation-parts.js";

function Transcript({ streaming }: { streaming?: boolean }) {
	return (
		<Conversation.Root streaming={streaming}>
			<Conversation.Viewport>
				<Conversation.Content aria-label="Messages" />
			</Conversation.Viewport>
			<Conversation.ScrollButton />
		</Conversation.Root>
	);
}

describe("Conversation", () => {
	test("Root survives a translated loading message changing to a transcript", () => {
		const { container, rerender } = render(<Conversation.Root>Loading messages</Conversation.Root>);
		translateTextNodes(container);

		rerender(
			<Conversation.Root streaming>
				<Conversation.Viewport>
					<Conversation.Content aria-label="Conversation" />
				</Conversation.Viewport>
			</Conversation.Root>,
		);

		expect(screen.getByRole("feed", { name: "Conversation" })).toBeInTheDocument();
		expect(screen.getByRole("status")).toHaveTextContent("Answering…");
	});

	test("announces nothing before the first answer, then the start and the end of each answer", () => {
		const { rerender } = render(<Transcript />);
		const status = screen.getByRole("status");
		expect(status).toHaveTextContent(/^$/);

		rerender(<Transcript streaming />);
		expect(status).toHaveTextContent("Answering…");

		rerender(<Transcript streaming={false} />);
		expect(status).toHaveTextContent("Answer ended.");

		rerender(<Transcript streaming />);
		expect(status).toHaveTextContent("Answering…");
	});

	test("Root stamps data-streaming only while streaming", () => {
		const { container, rerender } = render(<Transcript streaming />);
		const root = container.querySelector('[data-slot="conversation"]');
		expect(root).toHaveAttribute("data-streaming", "");

		rerender(<Transcript />);
		expect(root).not.toHaveAttribute("data-streaming");
	});

	test("each part forwards className, ref, and data attributes, and joins data-slot", () => {
		const rootRef = vi.fn<(node: HTMLDivElement | null) => void>();
		const viewportRef = vi.fn<(node: HTMLDivElement | null) => void>();
		const { container } = render(
			<Conversation.Root ref={rootRef} className="root-class" data-testid="root">
				<Conversation.Viewport ref={viewportRef} className="viewport-class" data-slot="outer">
					<Conversation.Content aria-label="Messages" className="content-class" />
				</Conversation.Viewport>
				<Conversation.ScrollButton className="button-class" />
			</Conversation.Root>,
		);

		const root = container.querySelector('[data-slot="conversation"]');
		expect(rootRef).toHaveBeenLastCalledWith(root);
		expect(root).toHaveClass("root-class");
		expect(root).toHaveAttribute("data-testid", "root");
		const viewport = screen.getByRole("feed", { name: "Messages" }).parentElement;
		expect(viewportRef).toHaveBeenLastCalledWith(viewport);
		expect(viewport).toHaveAttribute("data-slot", "outer conversation-viewport");
		expect(viewport).toHaveAttribute("tabindex", "-1");
		expect(screen.getByRole("feed", { name: "Messages" })).toHaveAttribute(
			"data-slot",
			"conversation-content",
		);
		expect(screen.getByRole("button", { name: "Scroll to the latest message" })).toHaveClass(
			"button-class",
		);
	});

	test("Content with asChild renders the child and merges props", () => {
		const ref = vi.fn<(node: HTMLDivElement | null) => void>();
		render(
			<Conversation.Root>
				<Conversation.Viewport>
					<Conversation.Content asChild ref={ref} className="content-class" data-testid="content">
						<section aria-label="Messages" className="child-class" />
					</Conversation.Content>
				</Conversation.Viewport>
			</Conversation.Root>,
		);

		const list = screen.getByRole("feed", { name: "Messages" });
		expect(list).toHaveClass("content-class", "child-class");
		expect(list).toHaveAttribute("data-testid", "content");
		expect(list).toHaveAttribute("data-slot", "conversation-content");
		expect(ref).toHaveBeenLastCalledWith(list);
	});

	test("Content keeps a consumer's description ids beside the hint, even ones that look like classes", () => {
		render(
			<Conversation.Root>
				<Conversation.Viewport>
					<Conversation.Content aria-label="Messages" aria-describedby="hidden block" />
				</Conversation.Viewport>
			</Conversation.Root>,
		);
		const ids = screen
			.getByRole("feed", { name: "Messages" })
			.getAttribute("aria-describedby")
			?.split(" ");
		expect(ids?.slice(1)).toEqual(["hidden", "block"]);
	});

	test("a part outside Root throws", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<Conversation.ScrollButton />)).toThrow(
			"Conversation.ScrollButton must be rendered inside Conversation.Root.",
		);
	});
});
