import { jsxNoConditionalBeforeText } from "./jsx-no-conditional-before-text.ts";
import { ruleTester } from "./rule-tester.ts";

ruleTester.run("jsx-no-conditional-before-text", jsxNoConditionalBeforeText, {
	valid: [
		// Review finding 10 control: the blank text node is the insert anchor, and no engine moves it.
		'<button>{on && <i />} {"Save"}</button>',
		// Review finding 9: React updates a same-type, same-key element in place, so nothing inserts.
		'<button>{on ? <i title="on" /> : <i title="off" />}Save</button>',
		// Qodo: an empty fragment holds no node, so nothing inserts before the text.
		"<button>{open && <></>}{children}</button>",
		// Review finding 10: a same-line space is a blank text node, which no engine reparents, so the
		// insert lands before a node the parent still owns.
		"<button>{on && <i />} {children}</button>",
		// Review finding 14: optional chaining keeps the `.map()` exemption.
		"<div>{on && <i />}{rows?.map((row) => <b key={row.id} />)}</div>",
		// Review finding 8: a static expression value is still `translate="no"`.
		'<button translate={"no"}>{on && <i />}Save</button>',
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
		// element or no node. `chart/primitive.tsx` is full of this shape.
		"<button>{icon && <Icon svg={icon} />}{footer == null ? null : <div>{footer}</div>}</button>",
		"<button>{icon && <Icon svg={icon} />}{open ? <Panel /> : null}</button>",
		// Text before the conditional element is the safe order.
		"<button>Submit{icon && <Icon svg={icon} />}</button>",
		// A `.map()` whose callback returns an element renders elements or nothing
		// (`chart/tooltip.tsx`).
		"<div>{total && <Total />}{points.map((point) => <Row key={point.key} />)}</div>",
		"<div>{total && <Total />}{points.map((point) => (open ? <Row key={point.key} /> : null))}</div>",
		// The engine skips a subtree under `translate="no"`, so it reparents no text node there
		// (`code-block.tsx`).
		'<button translate="no">{icon && <Icon svg={icon} />}{children}</button>',
		'<pre translate="no"><code>{lines.map((line) => <>{line.first && <Gap />}{line.text}</>)}</code></pre>',
	],
	invalid: [
		{
			// Review finding 2: an empty list renders no node, so the insert anchor is the text.
			code: "<div>{on && <i />}{rows.map((n) => <b key={n} />)}Save</div>",
			errors: [{ messageId: "conditionalBeforeText" }],
		},
		{
			// Qodo: `{null}` renders no node, so it does not separate the insert from the text.
			code: "<button>{icon && <Icon />}{null}{children}</button>",
			errors: [{ messageId: "conditionalBeforeText" }],
		},
		{
			// Review finding 3: a fragment owns no host node, so the text inside it is bare text.
			code: "<div>{on && <i />}{rows.map((row) => <>{row.label}</>)}</div>",
			errors: [{ messageId: "conditionalBeforeText" }],
		},
		{
			// Review finding 4: a conditional inside a map callback mounts an element.
			code: "<p>{rows.map((r) => r.show && <i key={r.id} />)}Save</p>",
			errors: [{ messageId: "conditionalBeforeText" }],
		},
		{
			// Qodo: a list that gains a row inserts it before the next host sibling.
			code: "<div>{items.map((item) => <b key={item} />)}Save</div>",
			errors: [{ messageId: "conditionalBeforeText" }],
		},
		{
			// Review finding 12: a type annotation changes nothing at runtime.
			code: "<button>{(on && <i />) satisfies ReactNode}Save</button>",
			errors: [{ messageId: "conditionalBeforeText" }],
		},
		{
			// Review finding 9 control: a different key remounts the element.
			code: '<button>{on ? <i key="a" /> : <i key="b" />}Save</button>',
			errors: [{ messageId: "conditionalBeforeText" }],
		},
		{
			// Review finding 8: in JSX the last assignment wins, so the spread re-enables translation.
			code: '<button translate="no" {...{ translate: "yes" }}>{on && <i />}Save</button>',
			errors: [{ messageId: "conditionalBeforeText" }],
		},
		{
			// Review finding 7: the nearest `translate` decides, and `yes` re-enables translation.
			code: '<div translate="no"><aside translate="yes"><button>{on && <i />}Save</button></aside></div>',
			errors: [{ messageId: "conditionalBeforeText" }],
		},
		{
			// Review finding 6: a portal mounts elsewhere, so it does not inherit the attribute.
			code: '<div translate="no">{createPortal(<p>{on && <i />}Save</p>, node)}</div>',
			errors: [{ messageId: "conditionalBeforeText" }],
		},
		{
			// An element in a prop renders where the component puts it, not under this element.
			code: '<Popover translate="no" content={<p>{on && <i />}Save</p>} />',
			errors: [{ messageId: "conditionalBeforeText" }],
		},
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
			// Only `translate="no"` stops the engine. Any other value leaves the subtree translatable.
			code: '<button translate="yes">{icon && <Icon svg={icon} />}{children}</button>',
			errors: [{ messageId: "conditionalBeforeText" }],
		},
		{
			// A `.map()` whose callback returns text renders text nodes.
			code: "<div>{total && <Total />}{points.map((point) => point.label)}</div>",
			errors: [{ messageId: "conditionalBeforeText" }],
		},
		{
			// A block body can return from any branch, so the rule cannot read it.
			code: "<div>{total && <Total />}{points.map((point) => { return <Row />; })}</div>",
			errors: [{ messageId: "conditionalBeforeText" }],
		},
		{
			// Only `.map()` is read. Any other call stays unknown.
			code: "<div>{total && <Total />}{points.filter((point) => <Row />)}</div>",
			errors: [{ messageId: "conditionalBeforeText" }],
		},
		{
			// Each offending pair reports once, so a three-child run reports twice.
			code: "<button>{icon && <Icon />}{label}{badge && <Badge />}{count}</button>",
			errors: [{ messageId: "conditionalBeforeText" }, { messageId: "conditionalBeforeText" }],
		},
	],
});
