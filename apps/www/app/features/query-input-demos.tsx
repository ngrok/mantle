import { Button, IconButton } from "@ngrok/mantle/button";
import { Kbd } from "@ngrok/mantle/kbd";
import {
	type FilterGrammar,
	defineRemoteFilterGrammar,
	filterItemsByQuery,
} from "@ngrok/mantle/query-filter";
import { QueryInput } from "@ngrok/mantle/query-input";
import { XIcon } from "@phosphor-icons/react/X";
import { useDeferredValue, useState } from "react";

export type Domain = {
	id: string;
	name: string;
	description: string;
	custom: boolean;
};

export const domains: Domain[] = [
	{ id: "rd_1", name: "api.acme.com", description: "Production API", custom: true },
	{ id: "rd_2", name: "app.acme.com", description: "Customer dashboard", custom: true },
	{ id: "rd_3", name: "*.preview.acme.com", description: "Preview deploys", custom: true },
	{ id: "rd_4", name: "lovely-lemur.ngrok.app", description: "Staging API", custom: false },
	{ id: "rd_5", name: "brave-otter.ngrok.dev", description: "Local webhook tests", custom: false },
];

export const domainFilterGrammar: FilterGrammar<Domain> = {
	keys: [
		{
			key: "domain",
			aliases: ["name", "host"],
			description: "Text in the domain name",
			matches: (domain, value) => domain.name.toLowerCase().includes(value.toLowerCase()),
		},
		{
			key: "description",
			aliases: ["desc"],
			description: "Text in the description",
			prose: true,
			matches: (domain, value) => domain.description.toLowerCase().includes(value.toLowerCase()),
		},
		{
			key: "is",
			description: "The kind of domain",
			values: [
				{ value: "custom", description: "A domain you brought to ngrok" },
				{ value: "managed", description: "A hostname ngrok gave you", aliases: ["ngrok"] },
				{ value: "wildcard", description: "Covers every subdomain" },
			],
			matches: (domain, value) => {
				switch (value) {
					case "custom":
						return domain.custom;
					case "managed":
						return !domain.custom;
					case "wildcard":
						return domain.name.startsWith("*.");
					default:
						return false;
				}
			},
		},
	],
	getSearchText: (domain) => [domain.name, domain.description, domain.id].join("\n"),
};

export function QueryInputExample() {
	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);
	const visibleDomains = filterItemsByQuery({
		grammar: domainFilterGrammar,
		items: domains,
		query: deferredQuery,
	});

	return (
		<div className="w-full max-w-xl space-y-3">
			<QueryInput.Root
				grammar={domainFilterGrammar}
				items={domains}
				value={query}
				onValueChange={setQuery}
			>
				<QueryInput.Field
					aria-label="Filter domains"
					placeholder="Filter domains, or type a filter like is:custom"
				/>
				<QueryInput.BuilderMenu label="Add filter" />
				<QueryInput.Content />
			</QueryInput.Root>
			<ul aria-label="Domains" className="divide-y rounded-md border">
				{visibleDomains.map((domain) => (
					<li key={domain.id} className="flex justify-between gap-4 px-3 py-2 text-sm">
						<span className="font-mono">{domain.name}</span>
						<span className="text-muted">{domain.description}</span>
					</li>
				))}
			</ul>
		</div>
	);
}

export function InlineActionsQueryInputExample() {
	const [query, setQuery] = useState("is:custom ");

	return (
		<QueryInput.Root
			className="max-w-xl"
			grammar={domainFilterGrammar}
			items={domains}
			value={query}
			onValueChange={setQuery}
		>
			<QueryInput.Field
				aria-label="Filter domains"
				placeholder="Filter domains, or type a filter like is:custom"
			>
				{query !== "" && (
					<IconButton
						type="button"
						appearance="ghost"
						intent="neutral"
						size="xs"
						label="Clear filter"
						icon={<XIcon />}
						onClick={() => setQuery("")}
					/>
				)}
			</QueryInput.Field>
			<QueryInput.BuilderMenu label="Add filter" />
			<QueryInput.Content>
				<p>
					<Kbd>↑</Kbd> <Kbd>↓</Kbd> to move, <Kbd className="w-auto">Enter</Kbd> to pick,{" "}
					<Kbd className="w-auto">Esc</Kbd> to close
				</p>
			</QueryInput.Content>
		</QueryInput.Root>
	);
}

const accountSearchGrammar = defineRemoteFilterGrammar({
	keys: [
		{
			key: "is",
			description: "The account state",
			values: [{ value: "active" }, { value: "suspended" }, { value: "past_due" }],
		},
		{ key: "email", description: "The account email" },
	],
});

export function RemoteQueryInputExample() {
	const [query, setQuery] = useState("");
	const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);

	return (
		<form
			className="w-full max-w-xl space-y-3"
			onSubmit={(event) => {
				event.preventDefault();
				setSubmittedQuery(query);
			}}
		>
			<QueryInput.Root grammar={accountSearchGrammar} value={query} onValueChange={setQuery}>
				<QueryInput.Field
					aria-label="Search accounts"
					placeholder="Search accounts, or type a filter like is:suspended"
				/>
				<Button type="submit" appearance="outlined" intent="neutral">
					Search
				</Button>
				<QueryInput.Content />
			</QueryInput.Root>
			<p className="text-muted text-sm">
				{submittedQuery == null ? "Press Enter to search." : `The server runs: ${submittedQuery}`}
			</p>
		</form>
	);
}
