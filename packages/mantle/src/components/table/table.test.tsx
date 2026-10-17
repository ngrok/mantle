import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test, vi } from "vitest";
import { Table } from "./table.js";

function renderTable() {
	return render(
		<Table.Root data-testid="root">
			<Table.Element>
				<Table.Caption>Recent invoices</Table.Caption>
				<Table.Head>
					<Table.Row>
						<Table.Header>Invoice</Table.Header>
						<Table.Header scope="colgroup">Amount</Table.Header>
					</Table.Row>
				</Table.Head>
				<Table.Body>
					<Table.Row>
						<Table.Cell>INV001</Table.Cell>
						<Table.Cell>$250.00</Table.Cell>
					</Table.Row>
				</Table.Body>
				<Table.Foot>
					<Table.Row>
						<Table.Cell colSpan={2}>Total</Table.Cell>
					</Table.Row>
				</Table.Foot>
			</Table.Element>
		</Table.Root>,
	);
}

describe("Table", () => {
	test.each([
		["table", "root"],
		["table-element", "table"],
		["table-caption", "caption"],
		["table-head", "thead"],
		["table-body", "tbody"],
		["table-foot", "tfoot"],
		["table-row", "tr"],
		["table-header", "th"],
		["table-cell", "td"],
	])("stamps data-slot=%s on the %s element", (slot, tag) => {
		const { container } = renderTable();
		const element = container.querySelector(`[data-slot="${slot}"]`);
		expect(element).not.toBeNull();
		const expectedTag = tag === "root" ? "DIV" : tag.toUpperCase();
		expect(element?.tagName).toBe(expectedTag);
	});

	test("every part spreads the props a consumer passes it", () => {
		// Regression shape: a part that destructures `className`/`children` but
		// forgets `...props` silently swallows `id`, `title`, `aria-*`, `data-*` and
		// every event handler.
		const { container } = render(
			<Table.Root id="id-table" title="title-table">
				<Table.Element id="id-table-element" title="title-table-element">
					<Table.Caption id="id-table-caption" title="title-table-caption">
						Recent invoices
					</Table.Caption>
					<Table.Head id="id-table-head" title="title-table-head">
						<Table.Row>
							<Table.Header id="id-table-header" title="title-table-header">
								Invoice
							</Table.Header>
						</Table.Row>
					</Table.Head>
					<Table.Body id="id-table-body" title="title-table-body">
						<Table.Row id="id-table-row" title="title-table-row">
							<Table.Cell id="id-table-cell" title="title-table-cell">
								INV001
							</Table.Cell>
						</Table.Row>
					</Table.Body>
					<Table.Foot id="id-table-foot" title="title-table-foot">
						<Table.Row>
							<Table.Cell>Total</Table.Cell>
						</Table.Row>
					</Table.Foot>
				</Table.Element>
			</Table.Root>,
		);

		for (const slot of [
			"table",
			"table-element",
			"table-caption",
			"table-head",
			"table-header",
			"table-body",
			"table-row",
			"table-cell",
			"table-foot",
		]) {
			const element = container.querySelector(`#id-${slot}`);
			if (!(element instanceof HTMLElement)) {
				throw new Error(`expected an element with id="id-${slot}"`);
			}
			expect(element).toHaveAttribute("data-slot", slot);
			expect(element.title).toBe(`title-${slot}`);
		}
	});

	test("the caption names the table", () => {
		renderTable();
		expect(screen.getByRole("table", { name: "Recent invoices" })).toBeInTheDocument();
	});

	test("Table.Header defaults scope to col and keeps an explicit scope", () => {
		renderTable();
		expect(screen.getByRole("columnheader", { name: "Invoice" })).toHaveAttribute("scope", "col");
		expect(screen.getByRole("columnheader", { name: "Amount" })).toHaveAttribute(
			"scope",
			"colgroup",
		);
	});

	test("a callback ref on Table.Root fires once with the scroll container across a re-render", () => {
		const refSpy = vi.fn<(node: HTMLDivElement | null) => void>();
		// Why a factory: React bails out of a re-render when it receives the same
		// element object, so each render needs fresh elements with the same props.
		const renderTree = () => (
			<Table.Root ref={refSpy}>
				<Table.Element>
					<Table.Body>
						<Table.Row>
							<Table.Cell>INV001</Table.Cell>
						</Table.Row>
					</Table.Body>
				</Table.Element>
			</Table.Root>
		);
		const { rerender } = render(renderTree());
		rerender(renderTree());

		expect(refSpy).toHaveBeenCalledTimes(1);
		expect(refSpy).toHaveBeenLastCalledWith(screen.getByRole("table").parentElement);
	});

	test("Table.Root stamps the overflow attributes with values, and no sticky flag while nothing overflows", () => {
		renderTable();
		const root = screen.getByTestId("root");
		expect(root).toHaveAttribute("data-x-overflow", "false");
		expect(root).toHaveAttribute("data-x-scroll-end", "false");
		// Why absent, not "false": DataTable keys its pinned-column fade off
		// `group-data-sticky-active/table:`, which matches on attribute presence.
		expect(root).not.toHaveAttribute("data-sticky-active");
	});

	test("unmounting Table.Root disconnects both observers and removes its scroll listener", () => {
		const resizeDisconnect = vi.spyOn(ResizeObserver.prototype, "disconnect");
		const mutationDisconnect = vi.spyOn(MutationObserver.prototype, "disconnect");
		const addListener = vi.spyOn(HTMLElement.prototype, "addEventListener");

		const ref = createRef<HTMLDivElement>();
		const { unmount } = render(
			<Table.Root ref={ref}>
				<Table.Element>
					<Table.Body>
						<Table.Row>
							<Table.Cell>INV001</Table.Cell>
						</Table.Row>
					</Table.Body>
				</Table.Element>
			</Table.Root>,
		);
		const scroller = ref.current;
		if (scroller == null) {
			throw new Error("expected the Table.Root ref to be attached");
		}

		// React delegates its own scroll listener to the test container, so match on
		// the subscription made against the scroll container itself.
		const scrollListener = addListener.mock.calls.find(
			([type], index) => type === "scroll" && addListener.mock.contexts[index] === scroller,
		)?.[1];
		if (typeof scrollListener !== "function") {
			throw new Error("expected Table.Root to subscribe to the scroll container's scroll event");
		}
		expect(resizeDisconnect).not.toHaveBeenCalled();
		expect(mutationDisconnect).not.toHaveBeenCalled();

		const removeListener = vi.spyOn(HTMLElement.prototype, "removeEventListener");
		unmount();

		expect(resizeDisconnect).toHaveBeenCalledTimes(1);
		expect(mutationDisconnect).toHaveBeenCalledTimes(1);
		// The exact listener instance: tearing down with a fresh closure would leave
		// the real subscription live.
		expect(removeListener).toHaveBeenCalledWith("scroll", scrollListener);
	});

	test("a consumer className beats each part's defaults", () => {
		// tailwind-merge override contract: the consumer's class replaces the
		// part's conflicting default instead of landing beside it.
		const { container } = render(
			<Table.Root className="rounded-none" data-testid="root">
				<Table.Element>
					<Table.Head>
						<Table.Row>
							<Table.Header className="h-20">Invoice</Table.Header>
						</Table.Row>
					</Table.Head>
					<Table.Body>
						<Table.Row>
							<Table.Cell className="p-6">INV001</Table.Cell>
						</Table.Row>
					</Table.Body>
				</Table.Element>
			</Table.Root>,
		);

		const root = screen.getByTestId("root");
		expect(Array.from(root.classList).filter((name) => name.startsWith("rounded"))).toEqual([
			"rounded-none",
		]);

		const header = screen.getByRole("columnheader", { name: "Invoice" });
		expect(Array.from(header.classList).filter((name) => name.startsWith("h-"))).toEqual(["h-20"]);

		const cell = container.querySelector('[data-slot="table-cell"]');
		expect(Array.from(cell?.classList ?? []).filter((name) => name.startsWith("p-"))).toEqual([
			"p-6",
		]);
	});
});
