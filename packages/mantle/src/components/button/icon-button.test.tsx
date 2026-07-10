import { GlobeIcon } from "@phosphor-icons/react/Globe";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { IconButton } from "./icon-button.js";

describe("IconButton", () => {
	test("renders a button with an accessible label", () => {
		render(<IconButton label="globe" icon={<GlobeIcon />} />);
		expect(screen.getByRole("button", { name: "globe" })).toBeInTheDocument();
	});

	describe("type", () => {
		test(`defaults to type="button" when \`type\` is omitted`, () => {
			render(<IconButton label="globe" icon={<GlobeIcon />} />);
			expect(screen.getByRole("button")).toHaveAttribute("type", "button");
		});

		test(`renders an explicit type="submit"`, () => {
			render(<IconButton type="submit" label="search" icon={<GlobeIcon />} />);
			expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
		});

		test(`renders an explicit type="reset"`, () => {
			render(<IconButton type="reset" label="reset" icon={<GlobeIcon />} />);
			expect(screen.getByRole("button")).toHaveAttribute("type", "reset");
		});

		test("does not leak the default `type` onto an `asChild` anchor", () => {
			render(
				<IconButton asChild label="home" icon={<GlobeIcon />}>
					<a href="#yolo" />
				</IconButton>,
			);
			const link = screen.getByRole("link");
			expect(link).toHaveAccessibleName("home");
			expect(link).not.toHaveAttribute("type");
		});

		test("does not forward an explicit `type` to an `asChild` anchor", () => {
			render(
				<IconButton type="submit" asChild label="home" icon={<GlobeIcon />}>
					<a href="#yolo" />
				</IconButton>,
			);
			expect(screen.getByRole("link")).not.toHaveAttribute("type");
		});
	});
});
