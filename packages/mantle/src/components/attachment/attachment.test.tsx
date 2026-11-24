import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { MouseEvent } from "react";
import { describe, expect, test, vi } from "vitest";
import * as Attachment from "./attachment-parts.js";

describe("Attachment", () => {
	test("renders a named list of file chips with a name, a size, and a remove button", async () => {
		const user = userEvent.setup();
		const onRemove = vi.fn<() => void>();
		render(
			<Attachment.List aria-label="Attachments">
				<Attachment.Root>
					<Attachment.Preview />
					<Attachment.Name>traffic-policy.yaml</Attachment.Name>
					<Attachment.Size bytes={2340} />
					<Attachment.Remove label="Remove traffic-policy.yaml" onClick={onRemove} />
				</Attachment.Root>
			</Attachment.List>,
		);

		const item = screen.getByRole("listitem");
		expect(screen.getByRole("list", { name: "Attachments" })).toContainElement(item);
		expect(item).toHaveTextContent("traffic-policy.yaml2.3 KB");

		await user.click(screen.getByRole("button", { name: "Remove traffic-policy.yaml" }));
		expect(onRemove).toHaveBeenCalledTimes(1);
	});

	test("the name never translates, even when a consumer passes translate", () => {
		render(
			<Attachment.Root>
				{/* @ts-expect-error `translate` is not part of the API. */}
				<Attachment.Name translate="yes">report.pdf</Attachment.Name>
			</Attachment.Root>,
		);

		expect(screen.getByText("report.pdf")).toHaveAttribute("translate", "no");
	});

	test("Preview renders a sized decorative image with src, and an icon without one", () => {
		const { container, rerender } = render(
			<Attachment.Preview src="https://example.com/shot.png" />,
		);
		const image = container.querySelector('[data-slot="attachment-preview"]');
		expect(image).toHaveAttribute("src", "https://example.com/shot.png");
		expect(image).toHaveAttribute("alt", "");
		expect(image).toHaveAttribute("width", "32");

		rerender(<Attachment.Preview />);
		expect(container.querySelector('[data-slot="attachment-preview"]')).not.toHaveAttribute("src");
		expect(container.querySelector('[data-slot="attachment-preview"] svg')).toBeInTheDocument();
	});

	test.each([undefined, "https://example.com/shot.png"])(
		"Preview forwards attributes, its ref, and events (src=%s)",
		async (src) => {
			const user = userEvent.setup();
			const ref = vi.fn<(node: HTMLElement | null) => void>();
			const onClick = vi.fn<(event: MouseEvent) => void>();
			render(
				<Attachment.Preview
					src={src}
					title="File preview"
					data-testid="preview"
					data-slot="outer"
					ref={ref}
					onClick={onClick}
				/>,
			);

			const preview = screen.getByTestId("preview");
			expect(preview).toHaveAttribute("title", "File preview");
			expect(preview).toHaveAttribute("data-slot", "outer attachment-preview");
			expect(ref).toHaveBeenLastCalledWith(preview);
			await user.click(preview);
			expect(onClick).toHaveBeenCalledTimes(1);
			expect(onClick).toHaveBeenLastCalledWith(expect.objectContaining({ target: preview }));
		},
	);

	test("Root sets aria-busy only while busy", () => {
		const { rerender } = render(<Attachment.Root busy />);
		expect(screen.getByRole("listitem")).toHaveAttribute("aria-busy", "true");

		rerender(<Attachment.Root />);
		expect(screen.getByRole("listitem")).not.toHaveAttribute("aria-busy");
	});

	test("Root with asChild renders the child and merges props", () => {
		const ref = vi.fn<(node: HTMLLIElement | null) => void>();
		render(
			<ul>
				<Attachment.Root asChild ref={ref} className="root-class" data-slot="outer">
					<li className="child-class">report.pdf</li>
				</Attachment.Root>
			</ul>,
		);

		const item = screen.getByRole("listitem");
		expect(item).toHaveClass("root-class", "child-class");
		expect(item).toHaveAttribute("data-slot", "outer attachment");
		expect(ref).toHaveBeenLastCalledWith(item);
	});
});
