import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { MouseEvent } from "react";
import { createRef } from "react";
import { describe, expect, test, vi } from "vitest";
import { MediaObject } from "./media-object.js";

/**
 * The three parts share one implementation shape, so the structural contracts
 * (`data-slot`, rest spread, `asChild`, `ref`) are asserted table-driven over all
 * of them. Each entry pairs the part with the `data-slot` value it documents as
 * public API.
 */
const parts = [
	{ name: "Root", Part: MediaObject.Root, slot: "media-object" },
	{ name: "Media", Part: MediaObject.Media, slot: "media-object-media" },
	{ name: "Content", Part: MediaObject.Content, slot: "media-object-content" },
] as const;

describe("MediaObject", () => {
	test("renders the documented composition, each part in its documented slot", () => {
		render(
			<MediaObject.Root aria-label="Comment by Ada">
				<MediaObject.Media>
					<img alt="Ada" src="/avatar.png" />
				</MediaObject.Media>
				<MediaObject.Content>
					<p>Ea culpa id id ea minim labore.</p>
				</MediaObject.Content>
			</MediaObject.Root>,
		);

		const root = screen.getByLabelText("Comment by Ada");
		expect(root).toHaveAttribute("data-slot", "media-object");

		const media = root.querySelector("[data-slot='media-object-media']");
		const content = root.querySelector("[data-slot='media-object-content']");
		expect(media).toContainElement(screen.getByRole("img", { name: "Ada" }));
		expect(content).toHaveTextContent("Ea culpa id id ea minim labore.");
		// The two slots are siblings, not nested — the content must not land inside media.
		expect(media).not.toHaveTextContent("Ea culpa");
	});

	describe.each(parts)("MediaObject.$name", ({ Part, slot }) => {
		test("renders a div carrying its data-slot and children", () => {
			render(<Part data-testid="part">content</Part>);

			const part = screen.getByTestId("part");
			expect(part.tagName).toBe("DIV");
			expect(part).toHaveAttribute("data-slot", slot);
			expect(part).toHaveTextContent("content");
		});

		// Regression: every part previously destructured only asChild/className/
		// children/style/ref with no rest spread, so these props were silently
		// dropped even though `ComponentProps<"div">` and the docs page promise
		// "all props from div".
		test("forwards arbitrary div props to the rendered element", () => {
			render(
				<Part
					aria-describedby="hint"
					data-analytics-id="media-row"
					id="part-id"
					role="group"
					style={{ marginTop: "2px" }}
					tabIndex={-1}
					title="a title"
				>
					content
				</Part>,
			);

			const part = screen.getByRole("group");
			expect(part).toHaveAttribute("id", "part-id");
			expect(part).toHaveAttribute("data-analytics-id", "media-row");
			expect(part).toHaveAttribute("aria-describedby", "hint");
			expect(part).toHaveAttribute("title", "a title");
			expect(part).toHaveAttribute("tabindex", "-1");
			expect(part).toHaveStyle({ marginTop: "2px" });
		});

		test("forwards event handlers so the rendered element is interactive", async () => {
			const user = userEvent.setup();
			// React nulls out `currentTarget` once the handler returns, so it has to be
			// captured while the event is still being dispatched.
			const clickedElements: (EventTarget | null)[] = [];
			const onClick = vi.fn<(event: MouseEvent<HTMLDivElement>) => void>((event) => {
				clickedElements.push(event.currentTarget);
			});
			render(
				<Part data-testid="part" onClick={onClick}>
					<span>content</span>
				</Part>,
			);

			await user.click(screen.getByText("content"));

			expect(onClick).toHaveBeenCalledTimes(1);
			expect(clickedElements).toEqual([screen.getByTestId("part")]);
		});

		test("asChild renders the caller's element, keeping the data-slot and forwarded props", () => {
			render(
				<Part asChild data-analytics-id="media-row" id="part-id">
					<section data-testid="part">content</section>
				</Part>,
			);

			const part = screen.getByTestId("part");
			expect(part.tagName).toBe("SECTION");
			expect(part).toHaveAttribute("data-slot", slot);
			expect(part).toHaveAttribute("id", "part-id");
			expect(part).toHaveAttribute("data-analytics-id", "media-row");
		});

		test("forwards ref to the rendered element", () => {
			const ref = createRef<HTMLDivElement>();
			render(
				<Part data-testid="part" ref={ref}>
					content
				</Part>,
			);

			expect(ref.current).toBe(screen.getByTestId("part"));
		});

		test("forwards ref to the caller's element when asChild", () => {
			const ref = createRef<HTMLDivElement>();
			render(
				<Part asChild ref={ref}>
					<section data-testid="part">content</section>
				</Part>,
			);

			expect(ref.current).toBe(screen.getByTestId("part"));
			expect(ref.current?.tagName).toBe("SECTION");
		});
	});

	// The docs advertise overriding the spacing by passing a different `gap-*`
	// class to Root; that contract is tailwind-merge dropping the conflicting
	// default rather than appending to it.
	test("a caller's gap-* class replaces the default gap-4 on Root", () => {
		render(
			<MediaObject.Root className="gap-8" data-testid="root">
				content
			</MediaObject.Root>,
		);

		const root = screen.getByTestId("root");
		expect(root).toHaveClass("gap-8");
		expect(root).not.toHaveClass("gap-4");
	});

	test("a caller's non-conflicting class is added without dropping the default gap", () => {
		render(
			<MediaObject.Root className="items-center" data-testid="root">
				content
			</MediaObject.Root>,
		);

		const root = screen.getByTestId("root");
		expect(root).toHaveClass("items-center", "gap-4");
	});

	test("a caller's flex-* class replaces the default flex-1 on Content", () => {
		render(
			<MediaObject.Content className="flex-none" data-testid="content">
				content
			</MediaObject.Content>,
		);

		const content = screen.getByTestId("content");
		expect(content).toHaveClass("flex-none");
		expect(content).not.toHaveClass("flex-1");
	});

	test("Root asChild makes the whole row a single link", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn<(event: MouseEvent<HTMLAnchorElement>) => void>((event) => {
			// happy-dom would otherwise warn about unimplemented navigation.
			event.preventDefault();
		});
		render(
			<MediaObject.Root asChild>
				<a href="https://ngrok.com" onClick={onClick}>
					<MediaObject.Media>
						<img alt="" src="/avatar.png" />
					</MediaObject.Media>
					<MediaObject.Content>Lorem ipsum</MediaObject.Content>
				</a>
			</MediaObject.Root>,
		);

		const link = screen.getByRole("link", { name: "Lorem ipsum" });
		expect(link).toHaveAttribute("data-slot", "media-object");
		expect(link).toHaveAttribute("href", "https://ngrok.com");

		await user.click(link);

		expect(onClick).toHaveBeenCalledTimes(1);
	});
});
