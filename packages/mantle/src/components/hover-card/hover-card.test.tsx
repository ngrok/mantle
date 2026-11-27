import { act, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, onTestFinished, test, vi } from "vitest";
import * as HoverCard from "./hover-card-parts.js";

function renderHoverCard(arrow = <HoverCard.Arrow />) {
	render(
		<HoverCard.Root>
			<HoverCard.Trigger href="https://ngrok.com">@ngrok/mantle</HoverCard.Trigger>
			<HoverCard.Content>
				{arrow}
				<p>The Design System</p>
			</HoverCard.Content>
		</HoverCard.Root>,
	);
}

describe("HoverCard", () => {
	describe("timing and hold", () => {
		const isOpen = () =>
			document.querySelector("[data-slot='hover-card-content'][data-open]") != null;

		function setUp() {
			vi.useFakeTimers();
			onTestFinished(() => {
				vi.useRealTimers();
			});
			renderHoverCard();
			return screen.getByRole("link", { name: "@ngrok/mantle" });
		}

		test("opens 700ms after a hover", () => {
			const link = setUp();
			fireEvent.pointerEnter(link, { pointerType: "mouse" });
			act(() => {
				vi.advanceTimersByTime(699);
			});
			expect(isOpen()).toBe(false);
			act(() => {
				vi.advanceTimersByTime(1);
			});
			expect(isOpen()).toBe(true);
		});

		test("a pointer that leaves a focused link does not close the card, and the blur does", () => {
			const link = setUp();
			act(() => {
				link.focus();
				vi.advanceTimersByTime(700);
			});
			fireEvent.pointerEnter(link, { pointerType: "mouse" });
			fireEvent.pointerLeave(link, { pointerType: "mouse" });
			act(() => {
				vi.advanceTimersByTime(1000);
			});
			expect(isOpen()).toBe(true);

			act(() => {
				link.blur();
				vi.advanceTimersByTime(300);
			});
			expect(isOpen()).toBe(false);
		});

		test("a blur does not close the card while a pointer rests on it", () => {
			const link = setUp();
			act(() => {
				link.focus();
				vi.advanceTimersByTime(700);
			});
			const card = document.querySelector("[data-slot='hover-card-content']");
			if (card == null) {
				throw new Error("expected the open card");
			}
			fireEvent.pointerEnter(card, { pointerType: "mouse" });
			act(() => {
				link.blur();
				vi.advanceTimersByTime(1000);
			});
			expect(isOpen()).toBe(true);
		});

		test("a focus that joins a resting pointer keeps the first deadline", () => {
			const link = setUp();
			fireEvent.pointerEnter(link, { pointerType: "mouse" });
			act(() => {
				vi.advanceTimersByTime(550);
				link.focus();
				vi.advanceTimersByTime(150);
			});
			expect(isOpen()).toBe(true);
		});

		test("a touch gesture with no click leaves the next keyboard focus free", () => {
			const link = setUp();
			fireEvent.pointerDown(link, { pointerType: "touch", pointerId: 1 });
			fireEvent.pointerUp(link, { pointerType: "touch", pointerId: 1 });
			fireEvent.keyDown(window, { key: "Tab" });
			act(() => {
				link.focus();
				vi.advanceTimersByTime(700);
			});
			expect(isOpen()).toBe(true);
		});

		test("a link that loads into the open card leaves the Tab order", async () => {
			vi.useFakeTimers();
			onTestFinished(() => {
				vi.useRealTimers();
			});
			const tree = (loaded: boolean) => (
				<HoverCard.Root>
					<HoverCard.Trigger href="https://ngrok.com">@ngrok/mantle</HoverCard.Trigger>
					<HoverCard.Content>
						{loaded ? <a href="https://ngrok.com/docs">Docs</a> : "Loading"}
					</HoverCard.Content>
				</HoverCard.Root>
			);
			const { rerender } = render(tree(false));
			fireEvent.pointerEnter(screen.getByRole("link", { name: "@ngrok/mantle" }), {
				pointerType: "mouse",
			});
			act(() => {
				vi.advanceTimersByTime(700);
			});
			rerender(tree(true));
			await act(async () => {
				await Promise.resolve();
			});
			expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute("tabindex", "-1");
		});

		test("the keyboard never enters the card: its links leave the Tab order", () => {
			vi.useFakeTimers();
			onTestFinished(() => {
				vi.useRealTimers();
			});
			render(
				<HoverCard.Root>
					<HoverCard.Trigger href="https://ngrok.com">@ngrok/mantle</HoverCard.Trigger>
					<HoverCard.Content>
						<a href="https://ngrok.com/docs">Docs</a>
					</HoverCard.Content>
				</HoverCard.Root>,
			);
			fireEvent.pointerEnter(screen.getByRole("link", { name: "@ngrok/mantle" }), {
				pointerType: "mouse",
			});
			act(() => {
				vi.advanceTimersByTime(700);
			});
			expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute("tabindex", "-1");
		});
	});

	test("a touch that cancels does not let another touch's focus open the card", () => {
		vi.useFakeTimers();
		onTestFinished(() => {
			vi.useRealTimers();
		});
		renderHoverCard();
		const link = screen.getByRole("link", { name: "@ngrok/mantle" });

		fireEvent.pointerDown(link, { pointerType: "touch", pointerId: 1 });
		fireEvent.pointerDown(link, { pointerType: "touch", pointerId: 2 });
		fireEvent.pointerCancel(link, { pointerType: "touch", pointerId: 1 });
		act(() => {
			link.focus();
			vi.runAllTimers();
		});
		expect(screen.queryByText("The Design System")).toBeNull();
	});

	test("a tap whose click mantle swallows at the window leaves the next keyboard focus free", () => {
		vi.useFakeTimers();
		onTestFinished(() => {
			vi.useRealTimers();
		});
		const swallow = (event: MouseEvent) => event.stopPropagation();
		window.addEventListener("click", swallow, true);
		onTestFinished(() => {
			window.removeEventListener("click", swallow, true);
		});
		renderHoverCard();
		const link = screen.getByRole("link", { name: "@ngrok/mantle" });

		fireEvent.pointerDown(link, { pointerType: "touch", pointerId: 1 });
		fireEvent.pointerUp(link, { pointerType: "touch", pointerId: 1 });
		fireEvent.click(link);
		act(() => {
			link.focus();
			vi.runAllTimers();
		});
		expect(screen.getByText("The Design System")).toBeInTheDocument();
	});

	test("a tap's focus does not open the card, and the next keyboard focus does", () => {
		vi.useFakeTimers();
		onTestFinished(() => {
			vi.useRealTimers();
		});
		renderHoverCard();
		const link = screen.getByRole("link", { name: "@ngrok/mantle" });

		// Why this order: a tap focuses the link after `pointerup`.
		fireEvent.pointerDown(link, { pointerType: "touch" });
		fireEvent.pointerUp(link, { pointerType: "touch" });
		act(() => {
			link.focus();
			vi.runAllTimers();
		});
		expect(screen.queryByText("The Design System")).toBeNull();
		fireEvent.click(link);

		act(() => {
			link.blur();
			vi.runAllTimers();
			link.focus();
			vi.runAllTimers();
		});
		expect(screen.getByText("The Design System")).toBeInTheDocument();
	});

	describe("Arrow", () => {
		test("renders inside the content once hover opens it, with its data-slot", async () => {
			const user = userEvent.setup();
			renderHoverCard();

			await user.hover(screen.getByRole("link", { name: "@ngrok/mantle" }));

			expect(await screen.findByText("The Design System")).toBeInTheDocument();
			const arrow = document.querySelector("[data-slot='hover-card-arrow']");
			expect(arrow).toHaveAttribute("aria-hidden", "true");
		});

		test("sizes the svg so the float offsets the content by the arrow's real height", async () => {
			const user = userEvent.setup();
			renderHoverCard();

			await user.hover(screen.getByRole("link", { name: "@ngrok/mantle" }));
			await screen.findByText("The Design System");

			// `trackFloat` measures the rendered arrow and adds its height to `sideOffset`, so a
			// width/height that disagrees with the painted triangle detaches the tip.
			const arrow = document.querySelector("[data-slot='hover-card-arrow']");
			expect(arrow).toHaveAttribute("width", "14");
			expect(arrow).toHaveAttribute("height", "7");
			expect(arrow).toHaveAttribute("viewBox", "0 0 30 10");
		});

		test("strokes only the two slanted edges, so the base does not cut the content's border", async () => {
			const user = userEvent.setup();
			renderHoverCard();

			await user.hover(screen.getByRole("link", { name: "@ngrok/mantle" }));
			await screen.findByText("The Design System");

			const arrow = document.querySelector("[data-slot='hover-card-arrow']");
			// The filled polygon closes across the base; the stroked polyline does not.
			expect(arrow?.querySelector("polygon")).toHaveAttribute("points", "0,0 30,0 15,10");
			const border = arrow?.querySelector("polyline");
			expect(border).toHaveAttribute("points", "0,0 15,10 30,0");
			expect(border).toHaveAttribute("fill", "none");
			// Without this the 1px border scales with the 30x10 viewBox and reads as ~0.5px.
			expect(border).toHaveAttribute("vector-effect", "non-scaling-stroke");
		});

		test("takes a consumer className and forwards arbitrary props", async () => {
			const user = userEvent.setup();
			renderHoverCard(
				<HoverCard.Arrow className="fill-red-500" data-testid="arrow" height={10} width={20} />,
			);

			await user.hover(screen.getByRole("link", { name: "@ngrok/mantle" }));

			const arrow = await screen.findByTestId("arrow");
			// Why the class assertion: a tailwind-merge override contract. Only one `fill-*`
			// class may survive the merge, and `toHaveClass` ignores extra classes.
			const fillClasses = Array.from(arrow.classList).filter((token) => token.startsWith("fill-"));
			expect(fillClasses).toEqual(["fill-red-500"]);
			expect(arrow).toHaveAttribute("width", "20");
			expect(arrow).toHaveAttribute("height", "10");
		});
	});
});
