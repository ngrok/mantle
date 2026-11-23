/**
 * The fixed tasks of the agent eval. Each one is a real request from the A/B
 * of frontend #4892 or from #pulse-mantle-mcp, with the mantle parts that
 * answer it and the hand-built shapes that mean the agent missed them.
 */
export type Task = {
	id: string;
	/** What the user asks for, sent to the agent as is. */
	prompt: string;
	/** The file that the prompt names, which the answer must change. */
	file: string;
	/** Files that exist before the agent starts, keyed by path in the app. */
	files?: Record<string, string>;
	/** Each mantle part the answer must use, as a pattern over the added code. */
	parts: Record<string, RegExp>;
	/** Each hand-built shape that replaces a mantle part, as a pattern over the added code. */
	handRolled: Record<string, RegExp>;
	/** The parts that the agent must read with `get` before it builds. */
	getParts: readonly string[];
	/** Whether mantle lacks a part for the request, so the answer is tagged custom UI and a gap report. */
	gap: boolean;
};

const interfaceCountersTable = `import { Table } from "@ngrok/mantle/table";

const counters = [
	{ name: "eth0", rxPackets: 182_331, txPackets: 175_002, errors: 12 },
	{ name: "eth1", rxPackets: 92_004, txPackets: 88_120, errors: 0 },
	{ name: "wlan0", rxPackets: 4_210, txPackets: 3_998, errors: 31 },
];

/** The network interface counters of one agent. */
export function InterfaceCountersTable() {
	return (
		<Table.Root>
			<Table.Element>
				<Table.Head>
					<Table.Row>
						<Table.Header>Interface</Table.Header>
						<Table.Header>RX packets</Table.Header>
						<Table.Header>TX packets</Table.Header>
						<Table.Header>Errors</Table.Header>
					</Table.Row>
				</Table.Head>
				<Table.Body>
					{counters.map((counter) => (
						<Table.Row key={counter.name}>
							<Table.Cell>{counter.name}</Table.Cell>
							<Table.Cell>{counter.rxPackets.toLocaleString()}</Table.Cell>
							<Table.Cell>{counter.txPackets.toLocaleString()}</Table.Cell>
							<Table.Cell>{counter.errors}</Table.Cell>
						</Table.Row>
					))}
				</Table.Body>
			</Table.Element>
		</Table.Root>
	);
}
`;

/** State that only a hand-built row expansion needs. */
const handBuiltExpansion =
	/aria-expanded|setExpanded|expanded(Ids|Rows|Set)\b|useState<[^>]*(Set|Record)</;

export const tasks: readonly Task[] = [
	{
		id: "sub-row-table",
		file: "src/endpoints-table.tsx",
		prompt:
			"Make me a prototype of an endpoints table in src/endpoints-table.tsx. Each endpoint row should expand to show its routes as sub-rows underneath it, with name, URL, status, and requests in the last 24h. Use the sub-row component in Mantle.",
		parts: { DataTable: /@ngrok\/mantle\/data-table/, getSubRows: /getSubRows/ },
		handRolled: { "expansion state": handBuiltExpansion },
		getParts: ["DataTable"],
		gap: false,
	},
	{
		id: "table-detail-panel",
		file: "src/interface-counters-table.tsx",
		prompt:
			"In src/interface-counters-table.tsx, I want each row of the interface counters table to expand when clicked, showing a detail panel under the row with that interface's last 5 errors (time, error code, and message). Make up the data. Keep the table looking the same otherwise.",
		files: { "src/interface-counters-table.tsx": interfaceCountersTable },
		parts: {
			DataTable: /@ngrok\/mantle\/data-table/,
			"row expansion": /renderExpanded|ExpandedRow|getSubRows/,
		},
		handRolled: { "expansion state": handBuiltExpansion },
		getParts: ["DataTable"],
		gap: false,
	},
	{
		id: "settings-strata",
		file: "src/account-settings.tsx",
		prompt:
			"Prototype an account settings page in src/account-settings.tsx with Profile, Notifications, API access, and Danger zone sections. Two columns: each section's title and a short description on the left, and its form fields on the right.",
		parts: { Strata: /@ngrok\/mantle\/strata/ },
		handRolled: {
			"two-column grid": /(?:sm|md|lg):grid-cols-(?:2|3|12|\[)|grid-cols-\[/,
		},
		getParts: ["Strata"],
		gap: false,
	},
	{
		id: "unsaved-changes-bar",
		file: "src/domain-settings.tsx",
		prompt:
			'Prototype an edit page for a domain\'s settings in src/domain-settings.tsx: name, description, a toggle for "Enforce TLS 1.3" with a two-line explanation under its title, and a toggle for "Allow wildcard subdomains" with the same layout. When I change anything, a small bar should float up from the bottom saying I have unsaved changes, with Discard and Save buttons.',
		parts: {
			Sandbar: /@ngrok\/mantle\/sandbar/,
			Choice: /@ngrok\/mantle\/choice/,
			Switch: /@ngrok\/mantle\/switch/,
		},
		handRolled: { "fixed bottom bar": /\bfixed\b[^"'`]*\bbottom-|\bbottom-\S+[^"'`]*\bfixed\b/ },
		getParts: ["Sandbar", "Choice"],
		gap: false,
	},
	{
		id: "traffic-search",
		file: "src/traffic-inspector.tsx",
		prompt:
			"Prototype a traffic inspector list page in src/traffic-inspector.tsx. At the top, a search box where I can type free text and also filters like status:500 or method:POST, with the filter tokens highlighted and suggestions as I type. Below it, a list of requests. Request URLs are long, so when one gets cut off, keep the end of the URL visible.",
		parts: {
			Query: /@ngrok\/mantle\/query/,
			TruncatedText: /@ngrok\/mantle\/truncated-text/,
		},
		handRolled: {
			"right-to-left truncation": /direction:\s*["']?rtl|\[direction:rtl\]|dir=["']rtl/,
			"editable token input": /contentEditable/,
		},
		getParts: ["Query", "TruncatedText"],
		gap: false,
	},
	{
		id: "rules-reorder",
		file: "src/rules-editor.tsx",
		prompt:
			"Prototype a traffic policy rules editor in src/rules-editor.tsx. Rules run top to bottom, so I need to drag rules by a handle to reorder them. Each rule shows its name, an action badge (allow, deny, or rate limit), and an on/off toggle. Add a button to add a rule.",
		parts: { Badge: /@ngrok\/mantle\/badge/, Switch: /@ngrok\/mantle\/switch/ },
		handRolled: { "drag-and-drop library": /@dnd-kit|react-beautiful-dnd|react-dnd|sortablejs/ },
		getParts: ["Badge", "Switch"],
		gap: true,
	},
];

/** The project instructions of the eval app, as a frontend prototype repo states them. */
export const agentsMd = `# Prototype app

A React prototype app. Its UI uses \`@ngrok/mantle\`: read \`.agents/skills/mantle/SKILL.md\` before you build UI. The mantle MCP server is connected as \`mantle\`.

- Put each screen in \`src/\`, in the file the request names.
- When mantle has no part for a need, build it, put a \`// @mantle-gap pending: <need>\` comment above it, call the mantle \`report_gap\` tool, and say so in your final reply.
- Check your work with \`npx tsc --noEmit\`. Do not start a dev server or a browser, and do not install packages.
- The user is not available for questions, so make reasonable choices. When you finish, reply with what you built.
`;
