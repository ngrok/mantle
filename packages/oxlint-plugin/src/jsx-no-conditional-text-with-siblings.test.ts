import { jsxNoConditionalTextWithSiblings } from "./jsx-no-conditional-text-with-siblings.ts";
import { ruleTester } from "./rule-tester.ts";

ruleTester.run("jsx-no-conditional-text-with-siblings", jsxNoConditionalTextWithSiblings, {
	valid: [
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
			// A text sibling is a sibling too — the decision doc's "siblings remain" row.
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
