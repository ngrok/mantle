import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef, type MouseEvent, type Ref } from "react";
import { describe, expect, test, vi } from "vitest";
import { Table } from "./index.js";

/**
 * Every part's `data-slot` and the element it must render, in composition order.
 * `data-slot` is public API — consumers and `data-table.tsx` style against it —
 * and the tag is what makes the table's implicit ARIA roles resolve.
 */
const parts = [
	{ slot: "table", tag: "DIV" },
	{ slot: "table-element", tag: "TABLE" },
	{ slot: "table-caption", tag: "CAPTION" },
	{ slot: "table-head", tag: "THEAD" },
	{ slot: "table-header", tag: "TH" },
	{ slot: "table-body", tag: "TBODY" },
	{ slot: "table-row", tag: "TR" },
	{ slot: "table-cell", tag: "TD" },
	{ slot: "table-foot", tag: "TFOOT" },
] as const;

/**
 * A full composition where exactly one element per part carries an `id` and a
 * `title`, so a single render can check both the `data-slot`/tag contract and
 * that every part still spreads the props a consumer hands it.
 */
const AnnotatedTable = () => (
	<Table.Root id="id-table" title="title-table">
		<Table.Element id="id-table-element" title="title-table-element">
			<Table.Caption id="id-table-caption" title="title-table-caption">
				A list of your recent invoices.
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
						INV-001
					</Table.Cell>
				</Table.Row>
			</Table.Body>
			<Table.Foot id="id-table-foot" title="title-table-foot">
				<Table.Row>
					<Table.Cell>Total</Table.Cell>
				</Table.Row>
			</Table.Foot>
		</Table.Element>
	</Table.Root>
);

/** The first element carrying `data-slot={slot}`, narrowed without a cast. */
const requireSlot = (container: HTMLElement, slot: string): HTMLElement => {
	const element = container.querySelector(`[data-slot="${slot}"]`);
	if (!(element instanceof HTMLElement)) {
		throw new Error(`expected an element with data-slot="${slot}"`);
	}
	return element;
};

/** The element with `id={id}`, narrowed without a cast. */
const requireId = (container: HTMLElement, id: string): HTMLElement => {
	const element = container.querySelector(`#${id}`);
	if (!(element instanceof HTMLElement)) {
		throw new Error(`expected an element with id="${id}"`);
	}
	return element;
};

/** The `<div>` a consumer `ref` on `Table.Root` resolves to. */
const requireScroller = (ref: { current: HTMLDivElement | null }): HTMLDivElement => {
	const scroller = ref.current;
	if (scroller == null) {
		throw new Error("expected the Table.Root ref to be attached");
	}
	return scroller;
};

const SimpleTable = ({ ref }: { ref?: Ref<HTMLDivElement> }) => (
	<Table.Root ref={ref}>
		<Table.Element>
			<Table.Body>
				<Table.Row>
					<Table.Cell>Alice</Table.Cell>
				</Table.Row>
			</Table.Body>
		</Table.Element>
	</Table.Root>
);

describe("Table structure", () => {
	test("every part renders its documented data-slot on the expected element", () => {
		const { container } = render(<AnnotatedTable />);

		for (const { slot, tag } of parts) {
			const matches = container.querySelectorAll(`[data-slot="${slot}"]`);
			expect(matches.length).toBeGreaterThan(0);
			for (const element of matches) {
				expect(element.tagName).toBe(tag);
			}
		}
	});

	test("every part spreads the props a consumer passes it", () => {
		// Regression shape: a part that destructures `className`/`children` but
		// forgets `...props` silently swallows `id`, `title`, `aria-*`, `data-*` and
		// every event handler.
		const { container } = render(<AnnotatedTable />);

		for (const { slot } of parts) {
			const element = requireId(container, `id-${slot}`);
			expect(element).toHaveAttribute("data-slot", slot);
			expect(element.title).toBe(`title-${slot}`);
		}
	});

	test("Table.Caption gives the table its accessible name", () => {
		const { container } = render(<AnnotatedTable />);

		expect(screen.getByRole("table", { name: "A list of your recent invoices." })).toBe(
			requireSlot(container, "table-element"),
		);
	});
});

describe("Table.Root", () => {
	test("`ref` lands on the inner scroll container, not the outer root element", () => {
		// Consumers program the scroll position through this ref
		// (`ref.current.scrollTo(...)`), so the composed ref must resolve to the
		// element that actually scrolls — never the `data-slot="table"` wrapper,
		// whose overflow is hidden.
		const ref = createRef<HTMLDivElement>();
		const { container } = render(<SimpleTable ref={ref} />);

		const root = requireSlot(container, "table");
		const scroller = requireScroller(ref);

		expect(scroller).not.toBe(root);
		expect(scroller.parentElement).toBe(root);
		expect(scroller.firstElementChild).toBe(requireSlot(container, "table-element"));
	});

	test("reports the absence of horizontal overflow and omits data-sticky-active", () => {
		const { container } = render(<SimpleTable />);

		const root = requireSlot(container, "table");
		expect(root).toHaveAttribute("data-x-overflow", "false");
		expect(root).toHaveAttribute("data-x-scroll-end", "false");
		// `data-sticky-active` must be ABSENT rather than "false": the Tailwind
		// variant DataTable keys its pinned-column fade off
		// (`group-data-sticky-active/table:`) matches on attribute presence, so
		// rendering a literal "false" would leave that fade on forever.
		expect(root).not.toHaveAttribute("data-sticky-active");
	});

	test("carries the `group/table` marker the DataTable sticky fade resolves against", () => {
		// Cross-file spelling pin: `data-table.tsx` styles its ActionCell fade with
		// `group-data-sticky-active/table:opacity-100`, which only resolves if this
		// root keeps the `group/table` group name.
		const { container } = render(<SimpleTable />);

		expect(requireSlot(container, "table")).toHaveClass("group/table");
	});

	test("unmounting disconnects both observers and removes the scroll listener", () => {
		const resizeDisconnect = vi.spyOn(ResizeObserver.prototype, "disconnect");
		const mutationDisconnect = vi.spyOn(MutationObserver.prototype, "disconnect");
		const addListener = vi.spyOn(HTMLElement.prototype, "addEventListener");

		const ref = createRef<HTMLDivElement>();
		const { unmount } = render(<SimpleTable ref={ref} />);
		const scroller = requireScroller(ref);

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
		// The exact listener instance, so tearing down with a fresh closure — which
		// would leave the real subscription live — fails here.
		expect(removeListener).toHaveBeenCalledWith("scroll", scrollListener);
	});
});

describe("Table className", () => {
	test("a consumer className beats each part's defaults", () => {
		const { container } = render(
			<Table.Root className="rounded-none">
				<Table.Element>
					<Table.Head>
						<Table.Row>
							<Table.Header className="h-20">Invoice</Table.Header>
						</Table.Row>
					</Table.Head>
					<Table.Body>
						<Table.Row>
							<Table.Cell className="p-6">INV-001</Table.Cell>
						</Table.Row>
					</Table.Body>
				</Table.Element>
			</Table.Root>,
		);

		const root = requireSlot(container, "table");
		expect(root).toHaveClass("rounded-none");
		expect(root).not.toHaveClass("rounded-lg");

		const header = requireSlot(container, "table-header");
		expect(header).toHaveClass("h-20");
		expect(header).not.toHaveClass("h-11");

		const cell = requireSlot(container, "table-cell");
		expect(cell).toHaveClass("p-6");
		expect(cell).not.toHaveClass("p-3");
	});
});

describe("Table.Row events", () => {
	test("a click inside a cell reaches the row's onClick with the row as currentTarget", async () => {
		const user = userEvent.setup();
		// React nulls `currentTarget` once dispatch finishes, so record it while the
		// handler is running.
		const dispatched: Array<{ currentTarget: EventTarget | null; target: EventTarget }> = [];
		const onRowClick = vi.fn<(event: MouseEvent<HTMLTableRowElement>) => void>((event) => {
			dispatched.push({ currentTarget: event.currentTarget, target: event.target });
		});
		const { container } = render(
			<Table.Root>
				<Table.Element>
					<Table.Body>
						<Table.Row onClick={onRowClick}>
							<Table.Cell>Alice</Table.Cell>
						</Table.Row>
					</Table.Body>
				</Table.Element>
			</Table.Root>,
		);

		await user.click(screen.getByRole("cell", { name: "Alice" }));

		expect(onRowClick).toHaveBeenCalledTimes(1);
		expect(dispatched[0]?.currentTarget).toBe(requireSlot(container, "table-row"));
		expect(dispatched[0]?.target).toBe(requireSlot(container, "table-cell"));
	});
});
