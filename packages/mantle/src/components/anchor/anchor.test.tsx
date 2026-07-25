import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { Anchor, resolveRel } from "./anchor.js";

describe("Anchor", () => {
	test("renders an anchor with the anchor data-slot", () => {
		render(<Anchor href="https://ngrok.com/">ngrok.com</Anchor>);
		const link = screen.getByRole("link", { name: "ngrok.com" });
		expect(link).toHaveAttribute("data-slot", "anchor");
		expect(link).toHaveAttribute("href", "https://ngrok.com/");
	});

	test("resolves an array `rel` onto the rendered anchor", () => {
		render(
			<Anchor href="https://ngrok.com/docs" target="_blank" rel={["noreferrer", "noopener"]}>
				ngrok docs
			</Anchor>,
		);
		const link = screen.getByRole("link", { name: "ngrok docs" });
		expect(link).toHaveAttribute("rel", "noopener noreferrer");
		expect(link).toHaveAttribute("target", "_blank");
	});

	test("omits `rel` entirely when it resolves to nothing", () => {
		render(<Anchor href="https://ngrok.com/">ngrok.com</Anchor>);
		expect(screen.getByRole("link")).not.toHaveAttribute("rel");
	});

	test("forwards arbitrary anchor props and handlers", async () => {
		const onClick = vi.fn<() => void>();
		const user = userEvent.setup();
		render(
			<Anchor href="#yolo" id="cta" aria-label="Go to yolo" onClick={onClick}>
				click me
			</Anchor>,
		);
		const link = screen.getByRole("link", { name: "Go to yolo" });
		expect(link).toHaveAttribute("id", "cta");
		await user.click(link);
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	test("a consumer className overrides the default link color", () => {
		render(
			<Anchor href="#yolo" className="text-red-500">
				click me
			</Anchor>,
		);
		const link = screen.getByRole("link");
		expect(link).toHaveClass("text-red-500");
		expect(link).not.toHaveClass("text-accent-600");
	});

	describe("icon", () => {
		test("renders the icon before the text by default", () => {
			render(
				<Anchor href="#yolo" icon={<svg data-testid="icon" />}>
					ngrok docs
				</Anchor>,
			);
			const link = screen.getByRole("link");
			const icon = screen.getByTestId("icon");
			expect(link).toContainElement(icon);
			// DOM order, not the mr-1.5/ml-1.5 utilities, is the contract.
			expect(link.firstChild).toBe(icon);
			expect(link).toHaveTextContent("ngrok docs");
		});

		test(`renders the icon after the text when iconPlacement="end"`, () => {
			render(
				<Anchor href="#yolo" icon={<svg data-testid="icon" />} iconPlacement="end">
					ngrok docs
				</Anchor>,
			);
			const link = screen.getByRole("link");
			const icon = screen.getByTestId("icon");
			expect(link.lastChild).toBe(icon);
			expect(link.firstChild).not.toBe(icon);
		});

		test("renders no icon element when `icon` is omitted", () => {
			const { container } = render(<Anchor href="#yolo">ngrok docs</Anchor>);
			expect(container.querySelector("svg")).toBeNull();
		});
	});

	describe("asChild", () => {
		test("renders the child element and keeps the child's own text", () => {
			render(
				<Anchor asChild>
					{/* A plain anchor stands in for a router `<Link>`; `data-discover` is the prop it would own. */}
					<a href="/dashboard" data-discover="true">
						Open dashboard
					</a>
				</Anchor>,
			);
			const link = screen.getByRole("link", { name: "Open dashboard" });
			expect(link).toHaveAttribute("href", "/dashboard");
			// The child's own props survive the clone.
			expect(link).toHaveAttribute("data-discover", "true");
			expect(link).toHaveAttribute("data-slot", "anchor");
			expect(link).toHaveClass("text-accent-600");
		});

		test("injects the icon around the child's grandchildren", () => {
			render(
				<Anchor asChild icon={<svg data-testid="icon" />}>
					<a href="/dashboard">Open dashboard</a>
				</Anchor>,
			);
			const link = screen.getByRole("link", { name: "Open dashboard" });
			const icon = screen.getByTestId("icon");
			expect(link).toContainElement(icon);
			expect(link.firstChild).toBe(icon);
			expect(link).toHaveTextContent("Open dashboard");
		});

		test(`injects the icon after the child's grandchildren for iconPlacement="end"`, () => {
			render(
				<Anchor asChild icon={<svg data-testid="icon" />} iconPlacement="end">
					<a href="/dashboard">Open dashboard</a>
				</Anchor>,
			);
			const link = screen.getByRole("link", { name: "Open dashboard" });
			expect(link.lastChild).toBe(screen.getByTestId("icon"));
			expect(link).toHaveTextContent("Open dashboard");
		});

		test("merges the anchor styling with the child's own className", () => {
			render(
				<Anchor asChild className="text-red-500">
					<a href="/dashboard" className="underline">
						Open dashboard
					</a>
				</Anchor>,
			);
			const link = screen.getByRole("link");
			expect(link).toHaveClass("underline", "text-red-500", "rounded");
			expect(link).not.toHaveClass("text-accent-600");
		});

		test("resolves `rel` for the child element too", () => {
			render(
				<Anchor asChild rel={["noopener", "noreferrer"]}>
					<a href="https://ngrok.com/">ngrok.com</a>
				</Anchor>,
			);
			expect(screen.getByRole("link")).toHaveAttribute("rel", "noopener noreferrer");
		});
	});
});

describe("resolveRel", () => {
	test("given nothing or undefined, returns undefined", () => {
		expect(resolveRel(undefined)).toBe(undefined);
		expect(resolveRel(null)).toBe(undefined);
		expect(resolveRel([])).toBe(undefined);
		expect(resolveRel("")).toBe(undefined);
	});

	test("filters out empty values", () => {
		expect(resolveRel(["noopener", undefined, null, "", "     ", "\t\r\n ", "noreferrer"])).toBe(
			"noopener noreferrer",
		);
	});

	test("given a single rel, returns that rel", () => {
		expect(resolveRel("noopener")).toBe("noopener");
		expect(resolveRel("noreferrer")).toBe("noreferrer");
	});

	test("trims a single rel", () => {
		expect(resolveRel("  noopener\n")).toBe("noopener");
	});

	test("given multiple rels, returns a space-separated string of unique rels", () => {
		expect(resolveRel(["noopener", "noreferrer"])).toBe("noopener noreferrer");
		expect(resolveRel(["noopener", "noreferrer", "noopener"])).toBe("noopener noreferrer");
	});

	test("sorts rels", () => {
		expect(resolveRel(["noreferrer", "noopener", "alternate"])).toBe(
			"alternate noopener noreferrer",
		);
	});

	test("allows custom rels", () => {
		expect(resolveRel(["noopener", "noreferrer", "custom"])).toBe("custom noopener noreferrer");
	});
});
