import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { MouseEvent } from "react";
import { describe, expect, test, vi } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
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

	test("parts forward className, ref, and data attributes to their elements", () => {
		const refs = [0, 1, 2, 3, 4].map(() => vi.fn<(node: HTMLElement | null) => void>());
		render(
			<Attachment.List
				aria-label="Attachments"
				ref={refs[0]}
				className="class-0"
				data-testid="part-0"
			>
				<Attachment.Root ref={refs[1]} className="class-1" data-testid="part-1">
					<Attachment.Name ref={refs[2]} className="class-2" data-testid="part-2">
						report.pdf
					</Attachment.Name>
					<Attachment.Size bytes={2340} ref={refs[3]} className="class-3" data-testid="part-3" />
					<Attachment.Remove
						label="Remove report.pdf"
						ref={refs[4]}
						className="class-4"
						data-testid="part-4"
					/>
				</Attachment.Root>
			</Attachment.List>,
		);
		for (const [index, slot] of [
			"attachment-list",
			"attachment",
			"attachment-name",
			"attachment-size",
			"attachment-remove",
		].entries()) {
			const element = document.querySelector(`[data-slot~="${slot}"]`);
			expect(element).toHaveClass(`class-${index}`);
			expect(element).toHaveAttribute("data-testid", `part-${index}`);
			expect(refs[index]).toHaveBeenLastCalledWith(element);
		}
	});

	test.each(["yes", undefined] as const)(
		"Name with asChild locks translate=%s and merges props",
		(translate) => {
			const ref = vi.fn<(node: HTMLElement | null) => void>();
			render(
				<Attachment.Root>
					<Attachment.Name asChild ref={ref} className="name-class">
						<a
							href="/files/report.pdf"
							className="child-class"
							translate={translate}
							data-slot="consumer-name"
						>
							report.pdf
						</a>
					</Attachment.Name>
				</Attachment.Root>,
			);

			const name = screen.getByRole("link", { name: "report.pdf" });
			expect(name).toHaveClass("name-class", "child-class");
			expect(name).toHaveAttribute("data-slot", "attachment-name consumer-name");
			expect(name).toHaveAttribute("translate", "no");
			translateTextNodes(name);
			expect(name).toHaveTextContent(/^report\.pdf$/);
			expect(ref).toHaveBeenLastCalledWith(name);
		},
	);

	test("List with asChild renders the child and merges props", () => {
		render(
			<Attachment.List asChild aria-label="Attachments" className="list-class">
				<ol className="child-class">
					<Attachment.Root>
						<Attachment.Name>report.pdf</Attachment.Name>
					</Attachment.Root>
				</ol>
			</Attachment.List>,
		);

		const list = screen.getByRole("list", { name: "Attachments" });
		expect(list.tagName).toBe("OL");
		expect(list).toHaveClass("list-class", "child-class");
		expect(list).toHaveAttribute("data-slot", "attachment-list");
	});
});
