import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Sidebar } from "./sidebar.js";

describe("Sidebar.UserAvatar", () => {
	test("renders the silhouette fallback when no src is provided", () => {
		const { container } = render(<Sidebar.UserAvatar alt="Jane Doe" />);
		const svg = container.querySelector("svg");
		expect(svg).toBeInTheDocument();
		expect(container.querySelector("img")).toBeNull();
	});

	test("uses alt as aria-label on the container when no src is provided", () => {
		render(<Sidebar.UserAvatar alt="Jane Doe" />);
		const avatar = screen.getByLabelText("Jane Doe");
		expect(avatar).toBeInTheDocument();
	});

	test("renders an img with src and alt when src is provided", () => {
		render(<Sidebar.UserAvatar src="/profile.jpg" alt="Jane Doe" />);
		const image = screen.getByRole("img", { name: "Jane Doe" });
		expect(image).toHaveAttribute("src", "/profile.jpg");
	});

	test("does not duplicate aria-label on the container when an img is rendered", () => {
		render(<Sidebar.UserAvatar src="/profile.jpg" alt="Jane Doe" data-testid="avatar" />);
		const wrapper = screen.getByTestId("avatar");
		expect(wrapper).not.toHaveAttribute("aria-label");
	});
});
