"use client";

import { Radio as HeadlessRadio, RadioGroup as HeadlessRadioGroup } from "@headlessui/react";
import type {
	RadioGroupProps as HeadlessRadioGroupProps,
	RadioProps as HeadlessRadioProps,
} from "@headlessui/react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ComponentProps, ElementType, PropsWithChildren, Ref } from "react";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { FieldControlContext } from "../field/field-context.js";
import { RadioItemContext, type RadioItemContextValue } from "./radio-item-context.js";

/**
 * The props of the radio group root that `RadioGroup` and `SegmentedControl`
 * share: Headless UI's `RadioGroup` props, with the element fixed.
 */
type RootProps = PropsWithChildren<Omit<HeadlessRadioGroupProps, "as" | "children">> & {
	ref?: Ref<HTMLElement>;
} & WithDataSlot;

/**
 * The radio group itself: `role="radiogroup"`, roving focus, arrow keys, the
 * value, and one hidden `<input type="radio">` for form submission when it
 * has a `name`. The caller sets `data-slot` and the styles.
 */
const Root = ({ ref, ...props }: RootProps) => <HeadlessRadioGroup {...props} ref={ref} />;

/**
 * The state of one radio item, from Headless UI's render props.
 */
type RadioStateContextValue = {
	autofocus: boolean;
	checked: boolean;
	disabled: boolean;
	focus: boolean;
	hover: boolean;
};

/**
 * Passes the state of a radio item to the parts inside it. The parts read it
 * in place of CSS classes, which avoids specificity issues.
 */
const RadioStateContext = createContext<RadioStateContextValue>({
	autofocus: false,
	checked: false,
	disabled: false,
	focus: false,
	hover: false,
});

/**
 * Joins element ids into one IDREF list. Returns `undefined` when there are
 * none, so the attribute is omitted.
 */
function joinIds(ids: readonly (string | undefined)[]): string | undefined {
	const present = ids.filter((id): id is string => id != null && id !== "");
	return present.length > 0 ? present.join(" ") : undefined;
}

/**
 * A list of registered element ids and a stable callback that adds one and
 * returns the cleanup that removes it.
 */
function useRegisteredIds(): [readonly string[], (id: string) => () => void] {
	const [ids, setIds] = useState<readonly string[]>([]);
	const register = useCallback((id: string) => {
		setIds((current) => [...current, id]);
		return () => {
			setIds((current) => current.filter((candidate) => candidate !== id));
		};
	}, []);
	return [ids, register];
}

/**
 * The element every radio item renders through Headless UI's `as`.
 * Headless UI's `Radio` owns `aria-labelledby` and `aria-describedby`. It reads
 * them from its own `Label` / `Description` context, which mantle does not use.
 * It then writes the result over the caller's props, `undefined` included.
 * Because mantle renders the element, the item stamps these after that spread:
 * - `aria-labelledby` and `aria-describedby`, from the ids its text registered
 * - `aria-describedby`, `aria-invalid`, and `aria-errormessage`, from a
 *   surrounding `Field.Control`
 *
 * It also publishes `RadioItemContext` to the children, so `Choice.Title` and
 * `Choice.Description` can register. The item's `as` arrives as `tag`, so a
 * consumer's element choice keeps this wiring.
 */
type RadioElementProps = ComponentProps<"div"> & {
	/** The element the item's `as` prop asked for. */
	tag?: ElementType;
};

const RadioElement = ({ children, ref, tag: Tag = "div", ...props }: RadioElementProps) => {
	const fieldControl = useContext(FieldControlContext);
	const [labelIds, registerLabelId] = useRegisteredIds();
	const [descriptionIds, registerDescriptionId] = useRegisteredIds();
	const context = useMemo<RadioItemContextValue>(
		() => ({ registerLabelId, registerDescriptionId }),
		[registerLabelId, registerDescriptionId],
	);
	return (
		<Tag
			{...props}
			{...(fieldControl
				? {
						"aria-errormessage": fieldControl["aria-errormessage"],
						"aria-invalid": fieldControl["aria-invalid"],
					}
				: undefined)}
			aria-labelledby={joinIds(labelIds)}
			aria-describedby={joinIds([fieldControl?.["aria-describedby"], ...descriptionIds])}
			ref={ref}
		>
			<RadioItemContext.Provider value={context}>{children}</RadioItemContext.Provider>
		</Tag>
	);
};

/**
 * The props of a radio item that `RadioGroup` and `SegmentedControl` share.
 */
type ItemProps = Omit<HeadlessRadioProps, "children"> &
	PropsWithChildren & {
		ref?: Ref<HTMLDivElement>;
	} & WithDataSlot;

/**
 * One `role="radio"` item of a `Root`. It renders through {@link RadioElement}
 * and publishes its state through {@link RadioStateContext}. The caller sets
 * `data-slot` and the styles.
 */
const Item = ({ as: tag, children, ref, ...props }: ItemProps) => (
	<HeadlessRadio {...props} as={RadioElement} tag={tag} ref={ref}>
		{(state) => <RadioStateContext.Provider value={state}>{children}</RadioStateContext.Provider>}
	</HeadlessRadio>
);

export {
	//,
	Item,
	RadioStateContext,
	Root,
};

export type {
	//,
	ItemProps,
	RadioStateContextValue,
	RootProps,
};
