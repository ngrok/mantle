import { jsxNoConditionalBeforeText } from "./jsx-no-conditional-before-text.ts";
import { ruleTester } from "./rule-tester.ts";

ruleTester.run("jsx-no-conditional-before-text", jsxNoConditionalBeforeText, {
	valid: [
		// The documented fix: the icon now inserts before an element sibling.
		'<button>{icon && <Icon svg={icon} />}<span data-slot="button-label">{children}</span></button>',
		// Moving the element after the text turns the mount into an `appendChild`.
		"<button>{children}{icon && <Icon svg={icon} />}</button>",
		// A lone expression child goes through `setTextContent`, which repairs the subtree.
		"<button>{children}</button>",
		"<button>{label && label}</button>",
		// An unconditional element never mounts, so nothing inserts before the text.
		"<button><Icon svg={icon} />{children}</button>",
		// A conditional element before another conditional element inserts before an element.
		"<button>{icon && <Icon svg={icon} />}{badge && <Badge />}</button>",
		// A container holding a plain element is an element, not text.
		"<button>{icon && <Icon svg={icon} />}{<Label />}</button>",
		// A branch that renders nothing is not a text node, so the following child holds either an
		// element or no node — `chart/primitive.tsx` is full of this shape.
		"<button>{icon && <Icon svg={icon} />}{footer == null ? null : <div>{footer}</div>}</button>",
		"<button>{icon && <Icon svg={icon} />}{open ? <Panel /> : null}</button>",
		// Text before the conditional element is the safe order.
		"<button>Submit{icon && <Icon svg={icon} />}</button>",
	],
	invalid: [
		{
			// The `Button` crash that opened the decision doc, and the case the public
			// eslint-plugin-react-google-translate cannot see without type information.
			code: "<button>{icon && <Icon svg={icon} />}{children}</button>",
			errors: [{ messageId: "conditionalBeforeText" }],
		},
		{
			// Whitespace-only JSX text between the two children does not separate them.
			code: ["<button>", "\t{icon && <Icon svg={icon} />}", "\t{children}", "</button>"].join("\n"),
			errors: [{ messageId: "conditionalBeforeText", line: 3 }],
		},
		{
			// A JSX comment renders nothing, so it does not separate them either.
			code: "<button>{icon && <Icon svg={icon} />}{/* the label */}{children}</button>",
			errors: [{ messageId: "conditionalBeforeText" }],
		},
		{
			code: "<button>{icon && <Icon svg={icon} />}Submit</button>",
			errors: [{ messageId: "conditionalBeforeText" }],
		},
		{
			// The report underlines the text itself, not the newline and indent the `JSXText` span
			// swallows. Without the trim this lands on line 2, at the column just past `/>}`. The
			// columns are zero-based, so 1 to 7 spans `Submit` past the leading tab.
			code: ["<button>", "\t{icon && <Icon svg={icon} />}", "\tSubmit", "</button>"].join("\n"),
			errors: [
				{ messageId: "conditionalBeforeText", line: 3, column: 1, endLine: 3, endColumn: 7 },
			],
		},
		{
			code: "<button>{icon && <Icon svg={icon} />}{item.label}</button>",
			errors: [{ messageId: "conditionalBeforeText" }],
		},
		{
			code: "<button>{icon && <Icon svg={icon} />}{translate('submit')}</button>",
			errors: [{ messageId: "conditionalBeforeText" }],
		},
		{
			code: "<button>{icon && <Icon svg={icon} />}{`Hi ${name}`}</button>",
			errors: [{ messageId: "conditionalBeforeText" }],
		},
		{
			// A ternary with one element branch still mounts and unmounts an element.
			code: "<button>{open ? <CaretUp /> : null}{children}</button>",
			errors: [{ messageId: "conditionalBeforeText" }],
		},
		{
			// Swapping one element for another is still an insert. React places the new fiber with
			// `insertBefore(next, hostSibling)`, and that sibling is the reparented text node.
			code: "<button>{open ? <CaretUp /> : <CaretDown />}{children}</button>",
			errors: [{ messageId: "conditionalBeforeText", column: 44 }],
		},
		{
			// A fragment reparents its children into the same host element.
			code: "<>{icon && <Icon svg={icon} />}{children}</>",
			errors: [{ messageId: "conditionalBeforeText" }],
		},
		{
			// A conditional whose branches mix an element and text can insert before the text.
			code: "<button>{open ? <CaretUp /> : 'closed'}{children}</button>",
			errors: [{ messageId: "conditionalBeforeText" }],
		},
		{
			// Each offending pair reports once, so a three-child run reports twice.
			code: "<button>{icon && <Icon />}{label}{badge && <Badge />}{count}</button>",
			errors: [{ messageId: "conditionalBeforeText" }, { messageId: "conditionalBeforeText" }],
		},
	],
});
