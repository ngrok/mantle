/**
 * The user flows the screen reader check runs on the docs previews. Each step
 * is one thing a keyboard and screen reader user does. `expect` lists what a
 * correct reader must say for the step, as case-insensitive patterns that all
 * have to match the step's speech. A pattern names the role, name, state, or
 * value the ARIA pattern promises, with the role words of each reader as
 * alternatives. `reject` lists speech that must not happen, such as a toast
 * read twice; it checks the reader's speech only, not the virtual reader's
 * focus line. A step with neither records speech only.
 */

type Check = {
	/** Patterns the step's speech must all match. */
	expect?: string[];
	/** Patterns the reader's speech must not match. */
	reject?: string[];
	/** Extra time to listen before reading the speech, in milliseconds, for a late announcement. */
	wait?: number;
};

export type Step = Check & ({ key: string } | { type: string } | { next: true });

export type Flow = {
	id: string;
	component: string;
	/** The preview path after `/preview/`. */
	path: string;
	steps: Step[];
};

// Role words differ per reader: virtual says the ARIA role, VoiceOver says
// "pop-up button" or "combo box", NVDA says "combo box" or "list".
const BUTTON = "button";
const DIALOG = "dialog|web dialog";
const ALERT_DIALOG = "alert ?dialog|alertdialog";
const COMBOBOX = "combo ?box|pop-up button|popup button|listbox button";
const MENU = "menu";
const MENUITEM = "menu ?item|menuitem";
const RADIO = "radio( button)?";
const SWITCH = "switch|toggle button";
const TAB = "\\btab\\b";
const CHECKED = "(?<!not |un)checked|(?<!not )selected|(?:^|\\| )on\\b";
const UNCHECKED = "not checked|unchecked|\\boff\\b|not selected";
const INVALID = "invalid|error";
/** Speech that says "Toggle Sidebar" twice, as a name and again as the description. */
const NAME_TWICE = "(toggle sidebar).*\\1";

export const flows: Flow[] = [
	{
		id: "dialog-open-close",
		component: "Dialog",
		path: "components/overlays/dialog/overview",
		steps: [
			{ key: "Tab", expect: ["open dialog", BUTTON] },
			{ key: "Enter", expect: [DIALOG, "are you absolutely sure"] },
			{ key: "Tab" },
			{ key: "Tab" },
			{ key: "Tab" },
			{ key: "Escape", expect: ["open dialog", BUTTON] },
		],
	},
	{
		id: "dialog-sheet-stack",
		component: "Dialog + Sheet",
		path: "components/overlays/dialog/stacking-a-sheet-over-a-dialog",
		steps: [
			{ key: "Tab", expect: ["open dialog"] },
			{ key: "Enter", expect: [DIALOG] },
			{ key: "Tab", expect: ["open sheet", BUTTON] },
			{ key: "Enter", expect: [DIALOG, "sheet over a dialog"] },
			{ key: "Escape", expect: ["open sheet"] },
			{ key: "Escape", expect: ["open dialog"] },
		],
	},
	{
		id: "alert-dialog-open-close",
		component: "AlertDialog",
		path: "components/overlays/alert-dialog/overview",
		steps: [
			{ key: "Tab", expect: [BUTTON] },
			{ key: "Enter", expect: [ALERT_DIALOG] },
			{ key: "Tab" },
			{ key: "Escape", expect: [BUTTON] },
		],
	},
	{
		id: "sheet-open-close",
		component: "Sheet",
		path: "components/overlays/sheet/overview",
		steps: [
			{ key: "Tab", expect: [BUTTON] },
			{ key: "Enter", expect: [DIALOG] },
			{ key: "Tab" },
			{ key: "Escape", expect: [BUTTON] },
		],
	},
	{
		id: "toast-over-dialog",
		component: "Toaster + Dialog",
		path: "components/feedback/toast/over-a-sheet-or-dialog",
		steps: [
			{ key: "Tab", expect: ["open sheet"] },
			{ key: "Tab", expect: ["open dialog"] },
			{ key: "Enter", expect: [DIALOG] },
			{ key: "Tab", expect: ["show toast"] },
			{
				key: "Enter",
				wait: 2500,
				expect: ["laborum ea anim"],
				reject: ["laborum ea anim.*laborum ea anim"],
			},
			{ key: "Escape", expect: ["open dialog"] },
		],
	},
	{
		id: "toast",
		component: "Toaster",
		path: "components/feedback/toast/overview",
		steps: [{ key: "Tab" }, { key: "Enter", reject: ["(\\b\\w+\\b.{20,})\\1"] }],
	},
	{
		id: "sandbar-over-sheet",
		component: "Sandbar + Sheet",
		path: "sandbar-over-sheet",
		steps: [
			{ key: "Tab", expect: ["endpoint name"] },
			{ type: "-x", wait: 1500, expect: ["unsaved changes"] },
			{ key: "Tab" },
			{ key: "Tab" },
			{ key: "Enter", expect: [DIALOG] },
			{ key: "Tab" },
			{ key: "Tab" },
			{ key: "Tab" },
		],
	},
	{
		id: "dropdown-menu",
		component: "DropdownMenu",
		path: "components/overlays/dropdown-menu/overview",
		steps: [
			{ key: "Tab", expect: [BUTTON] },
			{ key: "Enter", expect: [MENU] },
			{ key: "ArrowDown", expect: [MENUITEM] },
			{ key: "ArrowDown", expect: [MENUITEM] },
			{ key: "Escape", expect: [BUTTON] },
		],
	},
	{
		id: "tooltip",
		component: "Tooltip",
		path: "components/overlays/tooltip/overview",
		steps: [
			{ key: "Tab", expect: ["hover me", "this feature is part of your plan"] },
			{ key: "Escape" },
		],
	},
	{
		id: "popover",
		component: "Popover",
		path: "components/overlays/popover/overview",
		steps: [
			{ key: "Tab", expect: ["open popover"] },
			// The dialog says its name, from its heading.
			{ key: "Enter", expect: ["width", 'dialog,? "?dimensions|dimensions,? (web )?dialog'] },
			{ key: "Escape", expect: ["open popover"] },
		],
	},
	{
		id: "hover-card",
		component: "HoverCard",
		path: "components/overlays/hover-card/overview",
		steps: [{ key: "Tab", expect: ["open hover card"] }, { next: true }, { key: "Escape" }],
	},
	{
		id: "select",
		component: "Select",
		path: "components/forms/select/overview",
		steps: [
			{ key: "Tab", expect: ["fruits", COMBOBOX, "select a fru"] },
			{ key: "Enter", expect: ["apple"] },
			{ key: "ArrowDown", expect: ["banana"] },
			{ key: "ArrowDown", expect: ["blueberry"] },
			{ key: "Enter", expect: ["blueberry"] },
		],
	},
	{
		id: "select-error",
		component: "Select",
		path: "components/forms/select/raw-usage-and-validation",
		steps: [
			{ key: "Tab", expect: ["fruit"] },
			{ key: "Tab", expect: ["fruit with error", INVALID] },
		],
	},
	{
		id: "combobox",
		component: "Combobox",
		path: "components/forms/combobox/overview",
		steps: [
			{ key: "Tab", expect: ["subdomain", "combo ?box|edit|text"] },
			{ type: "a" },
			{ key: "ArrowDown", expect: ["ngrok\\.dev"] },
			{ key: "ArrowDown", expect: ["ngrok\\.io"] },
			{ key: "Enter", expect: ["ngrok"] },
		],
	},
	{
		id: "multi-select",
		component: "MultiSelect",
		path: "components/forms/multi-select/overview",
		steps: [
			{ key: "Tab", expect: ["fruits"] },
			{ key: "ArrowDown", expect: ["apple"] },
			{ key: "Enter", expect: ["apple", CHECKED] },
			{ key: "ArrowDown", expect: ["banana"] },
			{ key: "Enter", expect: ["banana", CHECKED] },
			{ key: "Escape" },
			{ key: "Backspace", expect: ["remov"] },
		],
	},
	{
		id: "multi-select-validation",
		component: "MultiSelect",
		path: "components/forms/multi-select/validation-states",
		steps: [{ key: "Tab" }, { key: "Tab" }, { key: "Tab" }],
	},
	{
		id: "switch",
		component: "Switch",
		path: "components/forms/switch/overview",
		steps: [
			{ key: "Tab", expect: ["airplane mode", SWITCH, UNCHECKED] },
			{ key: "Space", expect: [CHECKED] },
		],
	},
	{
		id: "dialog-form-errors",
		component: "Dialog + Field + Select",
		path: "components/overlays/dialog/with-tanstack-form",
		steps: [
			{ key: "Tab", expect: [BUTTON] },
			{ key: "Enter", expect: [DIALOG, "invite a teammate"] },
			{ key: "Tab" },
			{ key: "Tab" },
			{ key: "Tab" },
			{ key: "Tab" },
			// Submit the empty form: focus moves to the first invalid field, which says why.
			{ key: "Enter", wait: 1000, expect: ["email", INVALID, "valid email"] },
			{ key: "Tab", expect: ["role", INVALID, "choose a role"] },
			// A field that renders on blur, such as Role clearing its error, does not cancel the move.
			{ key: "Shift+Tab", expect: ["email"] },
		],
	},
	{
		id: "radio-group",
		component: "RadioGroup",
		path: "components/forms/radio-group/overview",
		steps: [
			{
				key: "Tab",
				expect: ["compact", RADIO, CHECKED, "3 of 3|position 3, set size 3", "density"],
			},
			{ key: "ArrowUp", expect: ["comfortable", RADIO, "2 of 3|position 2, set size 3"] },
			// Browse mode reads each option once: the radio, named by its label, then the next radio.
			{ next: true, expect: ["compact", RADIO] },
			{ next: true },
		],
	},
	{
		id: "segmented-control",
		component: "SegmentedControl",
		path: "components/forms/segmented-control/overview",
		steps: [
			{ key: "Tab", expect: ["prod", RADIO, CHECKED, "environment"] },
			{ key: "ArrowLeft", expect: ["dev"] },
			// Browse mode reads each option once and says the disabled one is dimmed.
			{ next: true, expect: ["staging", "dimmed|unavailable|disabled"] },
			{ next: true, expect: ["prod", RADIO] },
		],
	},
	{
		id: "tabs",
		component: "Tabs",
		path: "components/navigation/tabs/overview",
		steps: [
			{ key: "Tab", expect: ["account", TAB, "selected", "1 of 2|position 1, set size 2"] },
			{
				key: "ArrowRight",
				expect: ["password", TAB, "selected", "2 of 2|position 2, set size 2"],
				// The tab is read once, not again when its selection changes.
				reject: ["(password\\W+tab\\W+selected).*\\1"],
			},
			{ key: "Tab", expect: ["password"] },
		],
	},
	{
		id: "command",
		component: "Command",
		path: "components/navigation/command/button-trigger",
		steps: [
			{ key: "Tab", expect: [BUTTON] },
			{ key: "Enter", expect: ["command palette", "calendar"] },
			{ key: "ArrowDown", expect: ["search emoji"] },
			{ key: "ArrowDown", expect: ["calculator"] },
			{ key: "Escape" },
		],
	},
	{
		id: "otp-input",
		component: "OtpInput",
		path: "components/forms/otp-input/overview",
		steps: [
			{
				key: "Tab",
				expect: ["verification code"],
				reject: ["verification code.*verification code"],
			},
			{ type: "1", expect: ["1"] },
			{ type: "2", expect: ["2"] },
			{ key: "Tab", reject: ["verification code"] },
		],
	},
	{
		id: "otp-input-error",
		component: "OtpInput",
		path: "components/forms/otp-input/validation",
		steps: [{ key: "Tab", expect: ["verification code", INVALID] }],
	},
	{
		id: "slider",
		component: "Slider",
		path: "components/forms/slider/overview",
		steps: [
			{ key: "Tab", expect: ["volume", "slider", "67"] },
			{ key: "ArrowRight", expect: ["68"] },
			{ key: "End", expect: ["100"] },
		],
	},
	{
		id: "alert-center",
		component: "AlertCenter",
		path: "components/feedback/alert-center/several-alerts",
		steps: [
			{ key: "Tab", expect: ["update payment method"] },
			{ key: "Tab", expect: ["dismiss payment failed"] },
			{ key: "Tab", expect: ["3 more"] },
			{ key: "Enter", expect: ["expanded"] },
			{ key: "Tab" },
		],
	},
	{
		id: "accordion",
		component: "Accordion",
		path: "components/data-display/accordion/overview",
		steps: [
			{ key: "Tab", expect: ["custom domain", "expanded"] },
			{ key: "Tab", expect: ["webhook", "collapsed"] },
			{ key: "Enter", expect: ["expanded"] },
		],
	},
	{
		id: "theme-switcher",
		component: "ThemeSwitcher",
		path: "components/forms/theme-switcher/overview",
		steps: [
			{ key: "Tab", expect: ["switch to (dark|light) theme"] },
			// The status says the theme the press applied.
			{ key: "Enter", expect: ["(?<!to )(dark|light) theme"] },
		],
	},
	{
		id: "sidebar",
		component: "Sidebar",
		path: "sidebar-persistence",
		// The trigger's tooltip is not read as a second copy of its name.
		steps: [
			{ key: "Tab", reject: [NAME_TWICE] },
			{ key: "Tab", reject: [NAME_TWICE] },
			{ key: "Tab", reject: [NAME_TWICE] },
			{ key: "Tab", reject: [NAME_TWICE] },
			{ key: "Enter", reject: [NAME_TWICE] },
		],
	},
];
