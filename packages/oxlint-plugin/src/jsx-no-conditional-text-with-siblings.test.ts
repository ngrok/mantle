import { jsxNoConditionalTextWithSiblings } from "./jsx-no-conditional-text-with-siblings.ts";
import { ruleTester } from "./rule-tester.ts";

ruleTester.run("jsx-no-conditional-text-with-siblings", jsxNoConditionalTextWithSiblings, {
	valid: [
		// Round 3, finding 1: a lone list of elements with a plain-text empty state heals.
		'<div>{ids.length ? ids.map((id) => <b key={id}>{id}</b>) : "No rows"}</div>',
		// Round 3, finding 2: a text to blank swap is a text update.
		'<p>{on ? "Save" : " "}Total</p>',
		// Round 3, finding 7: fragments with the same key update in place.
		'<p>{on ? <React.Fragment key="a"><b />On</React.Fragment> : <React.Fragment key="a"><b />Off</React.Fragment>}<i /></p>',
		// Round 3, finding 10: an outer fallback keeps text mounted.
		'<p>{(items?.length && "Items") ?? "Empty"}<i /></p>',
		'<p>{(ready && "Ready") || (busy && "Busy") || "Idle"}<i /></p>',
		// Round 2, finding 1 control: a lone primitive goes through `setTextContent`.
		'<span>{on && "Row"}</span>',
		// Round 2, finding 3: two fragments of the same shape update their text in place.
		"<p>{on ? <><b />On</> : <><b />Off</>}<i /></p>",
		// Round 2, finding 6: `||` replaces a falsy `0`, so only the element renders.
		"<p>{(on ? 0 : null) || <i />}<b /></p>",
		// Round 2, finding 7: a `size` prop is most often a string, never `0`.
		"<p>{props.size && <i />}<b /></p>",
		// Round 2, finding 15, known gap: text passed straight to a portal or held in an array literal.
		'<p>{createPortal(on && "Dialog", target)}</p>',
		'<p>{on && ["Save"]}<i /></p>',
		// Known gap: a mapped value this package cannot read stays unknown, like any other.
		"<button>{items.map((item) => item.label)}<Icon /></button>",
		// Qodo: React renders no node for `""`, so this conditional never holds text.
		'<button>{label && ""}<Icon /></button>',
		// Review finding 5: `??` and `||` replace a nullish left side, so every outcome is text.
		'<p>{(on ? "On" : null) ?? "Off"}<i /></p>',
		'<p>{(on ? "On" : null) || "Off"}<i /></p>',
		// A plain identifier on the left of `&&` is most often a boolean. Without types the rule cannot
		// tell `count && <Badge />` from `open && <Badge />`, so it does not report either.
		"<div>{count && <i />}<b /></div>",
		// The engine skips a subtree under `translate="no"` (`code-block.tsx`).
		'<pre translate="no"><code><>{index > 0 && "\\n"}<Line /></></code></pre>',
		// Both branches render text, so React writes the new value through `commitTextUpdate` and
		// the translation reverts. This is the row the decision doc marks safe.
		'<button>{open ? "Show less" : "Show more"}<Icon svg={caret} /></button>',
		'<span>Turn password visibility {showPassword ? "off" : "on"}</span>',
		// A lone expression child goes through `setTextContent`, which repairs the subtree.
		'<button>{open ? "Show less" : "Show more"}</button>',
		"<button>{label && label}</button>",
		// An unknown branch reads as text on both sides far more often than not.
		'<button>{error ? error.message : "All good"}<Icon svg={caret} /></button>',
		"<button>{count ?? total}<Icon svg={caret} /></button>",
		// A branch this package cannot read statically holds an element far more often than a
		// string, so the rule trades this recall for precision. All four shapes are common in
		// `ngrok-private/frontend`, and every one of them renders elements.
		"<button>{expanded && belowTheFold}<Icon svg={caret} /></button>",
		"<button>{touched && errors.map((error) => <p>{error}</p>)}<Icon svg={caret} /></button>",
		"<button>{done && (() => renderSummary())()}<Icon svg={caret} /></button>",
		// A nested conditional recurses, so this reads as element-or-nothing rather than unknown.
		"<button>{wide && (full ? <Full /> : <Compact />)}<Icon svg={caret} /></button>",
		// Every branch is an element, so no text node is ever removed.
		"<button>{open ? <CaretUp /> : <CaretDown />}<Label /></button>",
		"<button>{icon && <Icon svg={icon} />}<Label /></button>",
		// The text is wrapped, so the span unmounts and the span is an element.
		"<button>{label && <span>{label}</span>}<Icon svg={caret} /></button>",
		// Not a conditional at all.
		"<button>{label}<Icon svg={caret} /></button>",
	],
	invalid: [
		{
			// Round 3, finding 5: a named `Fragment` owns no host node, so its lone child is not exempt.
			code: '<p><React.Fragment>{on && "Save"}</React.Fragment></p>',
			errors: [{ messageId: "textCanUnmount" }],
		},
		{
			// Round 3, finding 7: fragments with different keys remount and remove their text.
			code: '<p>{on ? <React.Fragment key="a">On</React.Fragment> : <React.Fragment key="b">Off</React.Fragment>}<i /></p>',
			errors: [{ messageId: "textCanUnmount" }],
		},
		{
			// Round 2, finding 1: a `.map()` child is an array, not a primitive React writes as text.
			code: '<span>{ids.map(() => "Row")}</span>',
			errors: [{ messageId: "textCanUnmount" }],
		},
		{
			code: "<span>{on && <>Row</>}</span>",
			errors: [{ messageId: "textCanUnmount" }],
		},
		{
			// Round 2, finding 3: a fragment branch against a string branch remounts.
			code: '<p>{on ? <>On</> : "Off"}<i /></p>',
			errors: [{ messageId: "textBecomesElement" }],
		},
		{
			// Round 2, finding 5: an explicit `React.Fragment` owns no host node.
			code: "<p>{ids.map((id) => <React.Fragment key={id}><i />Row</React.Fragment>)}<b /></p>",
			errors: [{ messageId: "textCanUnmount" }],
		},
		{
			// Round 2, finding 6: `??` keeps `false`, so the text unmounts.
			code: '<p>{(on && "On") ?? "Off"}<i /></p>',
			errors: [{ messageId: "textCanUnmount" }],
		},
		{
			// Round 2, finding 7: an optional count can be `undefined`.
			code: '<p>{items?.length && "Items"}<i /></p>',
			errors: [{ messageId: "textCanUnmount" }],
		},
		{
			// Round 2, finding 14: an interpolation with no fixed text can be `""`.
			code: '<p>{on ? "Value" : `${label}`}<i /></p>',
			errors: [{ messageId: "textCanUnmount" }],
		},
		{
			// Review finding 1: React drops `""` from a child list, so the text node unmounts.
			code: '<h1>Charts{show ? " / List" : ""}</h1>',
			errors: [{ messageId: "textCanUnmount" }],
		},
		{
			// Review finding 3: a fragment owns no host node, so its text unmounts by itself.
			code: "<div>{on && <>Save</>}<i /></div>",
			errors: [{ messageId: "textCanUnmount" }],
		},
		{
			code: "<p>Delete the account{all && <> for all of its members</>}</p>",
			errors: [{ messageId: "textCanUnmount" }],
		},
		{
			// Qodo: clearing a mapped text list removes each text node beside the icon.
			code: "<div>{ids.map((id) => `${id}!`)}<i /></div>",
			errors: [{ messageId: "textCanUnmount" }],
		},
		{
			// Qodo: a fragment is not a host node, so its lone child is not on the `setTextContent` path.
			code: '<button><>{label && "Submit"}</></button>',
			errors: [{ messageId: "textCanUnmount" }],
		},
		{
			// Review finding 10: a same-line space is a sibling text node.
			code: '<button>{on && "Save"} </button>',
			errors: [{ messageId: "textCanUnmount" }],
		},
		{
			// Review finding 5: `length && …` renders `0` as text, then swaps it for the element.
			code: "<div>{items.length && <i />}<b /></div>",
			errors: [{ messageId: "textBecomesElement" }],
		},
		{
			// Review finding 12: a type annotation changes nothing at runtime.
			code: '<button>{on && ("Save" as const)}<i /></button>',
			errors: [{ messageId: "textCanUnmount" }],
		},
		{
			// Review finding 13: a bigint and a negative number render as text.
			code: "<button>{on && 42n}<i /></button>",
			errors: [{ messageId: "textCanUnmount" }],
		},
		{
			code: "<button>{on && -1}<i /></button>",
			errors: [{ messageId: "textCanUnmount" }],
		},
		{
			// `&&` renders nothing when the test is falsy, so the text unmounts beside the icon.
			code: '<button>{label && "Submit"}<Icon svg={caret} /></button>',
			errors: [{ messageId: "textCanUnmount" }],
		},
		{
			// A nested conditional recurses down to the text, so this still reports.
			code: '<button>{wide && (full ? "Show less" : <Compact />)}<Icon svg={caret} /></button>',
			errors: [{ messageId: "textCanUnmount" }],
		},
		{
			// A ternary with a `null` branch removes the text node the same way.
			code: '<button>{open ? "Show less" : null}<Icon svg={caret} /></button>',
			errors: [{ messageId: "textCanUnmount" }],
		},
		{
			code: '<button>{open ? "Show less" : undefined}<Icon svg={caret} /></button>',
			errors: [{ messageId: "textCanUnmount" }],
		},
		{
			// A text sibling is a sibling too: the decision doc's "siblings remain" row.
			code: '<span>Turn password visibility {showPassword && "off"}</span>',
			errors: [{ messageId: "textCanUnmount" }],
		},
		{
			// The text changes type to an element, which React commits as a replace.
			code: '<button>{open ? "Show less" : <CaretDown />}<Label /></button>',
			errors: [{ messageId: "textBecomesElement" }],
		},
		{
			code: "<button>{count ? 3 : <Badge />}<Label /></button>",
			errors: [{ messageId: "textBecomesElement" }],
		},
		{
			// A template literal is text.
			code: "<button>{name && `Hi ${name}`}<Icon svg={caret} /></button>",
			errors: [{ messageId: "textCanUnmount" }],
		},
		{
			// Whitespace between children does not make the conditional a lone child.
			code: ["<button>", '\t{label && "Submit"}', "\t<Icon svg={caret} />", "</button>"].join("\n"),
			errors: [{ messageId: "textCanUnmount", line: 2 }],
		},
		{
			// A fragment hosts the same sibling relationship.
			code: '<>{label && "Submit"}<Icon svg={caret} /></>',
			errors: [{ messageId: "textCanUnmount" }],
		},
		{
			// Two offending children report twice.
			code: '<button>{label && "Submit"}{hint && "now"}</button>',
			errors: [{ messageId: "textCanUnmount" }, { messageId: "textCanUnmount" }],
		},
	],
});
