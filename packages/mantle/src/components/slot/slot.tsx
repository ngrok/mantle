import { Slot as RadixSlot } from "@radix-ui/react-slot";
import { Children, type ComponentProps, cloneElement, isValidElement } from "react";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";

type Props = ComponentProps<typeof RadixSlot> & WithDataSlot;

/**
 * `process` is not in mantle's lib types — the package targets browsers and
 * deliberately does not depend on `@types/node`. Declare exactly the shape read
 * below instead of pulling in the whole Node surface.
 */
declare const process: { env: { NODE_ENV?: string } } | undefined;

/**
 * Whether to emit development-only diagnostics.
 *
 * `process.env.NODE_ENV` is written out in full, with no optional chaining,
 * because that exact member expression is what every React bundler statically
 * replaces — a production build folds this to `false` and drops the guarded
 * block as dead code, while `process.env?.NODE_ENV` is a different AST node that
 * `define` may not match, which would leave a bare `process` reference in a
 * browser bundle. The `typeof` guard then keeps mantle from throwing in runtimes
 * that have no `process` at all (a browser loading the ESM build directly);
 * there, diagnostics stay off rather than crashing.
 */
const isDevelopment = typeof process !== "undefined" && process.env.NODE_ENV !== "production";

/**
 * Why a render-prop value cannot survive `asChild`, per prop. A complete
 * `Record` so adding a prop without its explanation is a compile error.
 */
const functionPropReason: Record<"className" | "style", string> = {
	className: "`cx` resolves a function to an empty string",
	style: "prop merging keeps only the last object value",
};

/**
 * Elements already warned about, keyed by element name + prop, so a render-prop
 * mistake reports once instead of on every render. Bounded by the number of
 * distinct offending components.
 */
const warnedFunctionProps = new Set<string>();

/**
 * Names an element for a diagnostic: the tag name for host elements, the
 * component's `displayName` or `name` otherwise.
 */
function describeElementType(type: unknown): string {
	if (typeof type === "string") {
		return type;
	}
	if (typeof type === "function") {
		return type.name || "Component";
	}
	if (typeof type === "object" && type != null && "displayName" in type) {
		const { displayName } = type;
		if (typeof displayName === "string" && displayName !== "") {
			return displayName;
		}
	}
	return "Component";
}

/**
 * Warns, once per element and prop, that a function `className` or `style` is
 * being dropped by `asChild` composition.
 *
 * This is the single most expensive silent failure in `asChild` composition: a
 * react-router `NavLink` accepts `className={({ isActive }) => …}`, `cx` resolves
 * that function to `""`, and the link renders with no error and no active
 * styling — the highlight simply never turns on. Composing the function is not
 * possible generically, because `Slot` cannot know the arguments the child would
 * have called it with, so reporting it is the contract.
 */
function warnOnFunctionProps(type: unknown, props: { className?: unknown; style?: unknown }): void {
	for (const prop of ["className", "style"] as const) {
		if (typeof props[prop] !== "function") {
			continue;
		}
		const elementName = describeElementType(type);
		const key = `${elementName}.${prop}`;
		if (warnedFunctionProps.has(key)) {
			continue;
		}
		warnedFunctionProps.add(key);
		console.warn(
			`[mantle] asChild dropped the \`${prop}\` render prop on <${elementName}>. ` +
				`A function \`${prop}\` cannot survive asChild composition (${functionPropReason[prop]}), so it is ignored. ` +
				`Pass a plain value and derive the state in the parent instead — with react-router, resolve the match yourself ` +
				`(\`useMatch\`) and pass the result down, e.g. \`<Sidebar.ItemButton asChild current={isCurrent}><Link to="/x">…</Link></Sidebar.ItemButton>\`.`,
		);
	}
}

/**
 * Merges its props onto its immediate child. This is useful for creating
 * components that can be rendered as different elements. Automatically merges
 * className props using `cx` for proper Tailwind class handling, and
 * concatenates `data-slot` values in DOM order (the composing parent's slot
 * chain first, then the child's own) so `asChild` composition accumulates the
 * whole slot chain instead of one side clobbering the other.
 *
 * **`className` and `style` must be plain values, not render props.** A function
 * `className` resolves to `""` through `cx`, and a function `style` is
 * overwritten by prop merging — so a react-router `NavLink` composed via
 * `asChild` loses `className={({ isActive }) => …}` entirely and renders with no
 * active styling and no error. `Slot` cannot compose the function generically
 * (it does not know the arguments the child would have supplied), so it warns in
 * development instead. Derive the state in the parent and pass a plain value:
 *
 * ```tsx
 * const isCurrent = useMatch("/endpoints") != null;
 * <Sidebar.ItemButton asChild current={isCurrent}>
 *   <Link to="/endpoints">Endpoints</Link>
 * </Sidebar.ItemButton>
 * ```
 *
 * A function `children` is unaffected — it survives `cloneElement` normally.
 *
 * @see https://mantle.ngrok.com/components/primitives/slot
 *
 * @example
 * ```tsx
 * <Slot className="custom-class">
 *   <a href="/">Home</a>
 * </Slot>
 * ```
 */
const Slot = ({ children, className, "data-slot": dataSlot, ref, ...props }: Props) => {
	if (!isValidElement<{ className?: string; style?: unknown } & WithDataSlot>(children)) {
		return Children.only(children);
	}

	if (isDevelopment) {
		warnOnFunctionProps(children.type, children.props);
	}

	return (
		<RadixSlot ref={ref} {...props}>
			{cloneElement(children, {
				...children.props,
				/**
				 * ClassName merge precedence (highest → lowest):
				 *
				 * 1. Child element’s own `className`   ← most specific / closest to the DOM
				 * 2. Slot’s `className`                ← passed from the parent component
				 * 3. Component’s internal base styles  ← applied earlier inside the component
				 *
				 * We intentionally merge in this order so the child can fully override
				 * parent + base styles when using `asChild`, preserving the “most specific wins”
				 * behavior while still letting the component define sensible defaults.
				 */
				className: cx(className, children.props.className),
				/**
				 * data-slot concatenates instead: parent chain first, then the child's
				 * own slot, so the rendered attribute reads in DOM order (outermost
				 * ancestor → rendered element) all the way down an asChild chain.
				 */
				"data-slot": joinDataSlot(dataSlot, children.props["data-slot"]),
			})}
		</RadixSlot>
	);
};

export {
	//,
	Slot,
};
