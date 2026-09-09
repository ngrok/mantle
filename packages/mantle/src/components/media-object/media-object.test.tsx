import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, test, vi } from "vitest";
import { MediaObject } from "./media-object.js";

describe("MediaObject", () => {
	test.each([
		["Root", MediaObject.Root, "media-object"],
		["Media", MediaObject.Media, "media-object-media"],
		["Content", MediaObject.Content, "media-object-content"],
	] as const)(
		"%s stamps its data-slot and forwards div props, ref, and events",
		async (_name, Part, slot) => {
			const user = userEvent.setup();
			const handleClick = vi.fn<() => void>();
			const ref = createRef<HTMLDivElement>();
			render(
				<Part
					ref={ref}
					id="part"
					aria-label="Part label"
					data-testid="part"
					style={{ color: "red" }}
					onClick={handleClick}
				>
					child
				</Part>,
			);

			const element = screen.getByTestId("part");
			expect(element).toHaveAttribute("data-slot", slot);
			expect(element).toHaveAttribute("id", "part");
			expect(element).toHaveAttribute("aria-label", "Part label");
			expect(element.style.color).toBe("red");
			expect(ref.current).toBe(element);

			await user.click(element);
			expect(handleClick).toHaveBeenCalledTimes(1);
		},
	);

	test("asChild renders the child element with the slot and the forwarded props", () => {
		render(
			<MediaObject.Root asChild id="row" aria-label="Row">
				<a href="/comments/1">row</a>
			</MediaObject.Root>,
		);

		const link = screen.getByRole("link", { name: "Row" });
		expect(link).toHaveAttribute("data-slot", "media-object");
		expect(link).toHaveAttribute("id", "row");
	});
});
