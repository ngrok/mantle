import { Button } from "@ngrok/mantle/button";
import { MultiSelect } from "@ngrok/mantle/multi-select";
import { useMemo, useState, useTransition } from "react";
import { Link } from "react-router";

const regionalAliases = [
	{ value: "global", popCount: "All PoPs" },
	{ value: "united-states", popCount: "2 PoPs" },
	{ value: "european-union", popCount: "1 PoP" },
];

const pointsOfPresence = [
	{ value: "sg-sin-1", location: "Asia / Pacific (Singapore)" },
	{ value: "au-syd-1", location: "Australia (Sydney)" },
	{ value: "de-fra-1", location: "European Union (Frankfurt)" },
	{ value: "in-mum-1", location: "India (Mumbai)" },
	{ value: "jp-tokyo-1", location: "Japan (Tokyo)" },
	{ value: "br-sao-1", location: "South America (São Paulo)" },
	{ value: "us-ohio-1", location: "United States (Ohio)" },
	{ value: "us-cal-1", location: "United States (California)" },
];

const dedicatedIPs = [
	{ ip: "52.191.171.57", description: "this is a helpful description that is exceedingly lengthy" },
	{ ip: "40.95.110.217", description: "this is a helpful description" },
	{ ip: "63.243.178.35", description: "" },
];

export function RegionPinningDemo() {
	const [isPending, startTransition] = useTransition();
	const [searchValue, setSearchValue] = useState("");
	const [selected, setSelected] = useState(["global"]);
	const filteredAliases = useMemo(
		() =>
			regionalAliases.filter(({ value }) =>
				value.toLowerCase().includes(searchValue.toLowerCase()),
			),
		[searchValue],
	);
	const filteredPops = useMemo(
		() =>
			pointsOfPresence.filter(({ value }) =>
				value.toLowerCase().includes(searchValue.toLowerCase()),
			),
		[searchValue],
	);
	const filteredDedicatedIPs = useMemo(
		() => dedicatedIPs.filter(({ ip }) => ip.includes(searchValue)),
		[searchValue],
	);

	return (
		<div className="flex w-full max-w-lg flex-col gap-1.5">
			<p className="text-strong text-sm font-medium">Resolves to</p>
			<MultiSelect.Root
				selectedValue={selected}
				setOpen={() => {
					setSearchValue("");
				}}
				setSelectedValue={(values) => {
					setSelected(values.includes("global") ? values : ["global", ...values]);
				}}
			>
				<MultiSelect.Trigger>
					<MultiSelect.TagValues lockedValues={["global"]} />
					<MultiSelect.Input
						onValueChange={(value) => startTransition(() => setSearchValue(value))}
						placeholder="Select regions..."
					/>
					{/* Input is flex-1 so this sibling is pushed to the right */}
					<span className="text-accent-600 mr-2 shrink-0 whitespace-nowrap text-xs">
						Requires Upgrade
					</span>
				</MultiSelect.Trigger>
				<MultiSelect.Content aria-busy={isPending}>
					{filteredAliases.length > 0 && (
						<MultiSelect.Group>
							<MultiSelect.GroupLabel>Regional Aliases</MultiSelect.GroupLabel>
							<MultiSelect.GroupDescription>
								Include all points of presence that are geographically within the region.
							</MultiSelect.GroupDescription>
							{filteredAliases.map(({ value, popCount }) => (
								<MultiSelect.Item key={value} value={value} disabled={value !== "global"}>
									<span className="flex min-w-0 flex-1 items-center justify-between gap-2">
										<span className="font-mono">{value}</span>
										<span className="text-muted font-sans text-xs font-normal">{popCount}</span>
									</span>
								</MultiSelect.Item>
							))}
						</MultiSelect.Group>
					)}
					{filteredAliases.length > 0 && filteredPops.length > 0 && <MultiSelect.Separator />}
					{filteredPops.length > 0 && (
						<MultiSelect.Group>
							<MultiSelect.GroupLabel>Points of presence</MultiSelect.GroupLabel>
							<MultiSelect.GroupDescription>
								If you&apos;ve included a region, you cannot include PoPs that are within it.
							</MultiSelect.GroupDescription>
							{filteredPops.map(({ value, location }) => (
								<MultiSelect.Item key={value} value={value} disabled>
									<span className="flex min-w-0 flex-1 items-center justify-between gap-2">
										<span className="font-mono">{value}</span>
										<span className="text-muted font-sans text-xs font-normal">{location}</span>
									</span>
								</MultiSelect.Item>
							))}
						</MultiSelect.Group>
					)}
					{(filteredAliases.length > 0 || filteredPops.length > 0) &&
						filteredDedicatedIPs.length > 0 && <MultiSelect.Separator />}
					{filteredDedicatedIPs.length > 0 && (
						<MultiSelect.Group>
							<MultiSelect.GroupLabel>Dedicated IPs</MultiSelect.GroupLabel>
							{filteredDedicatedIPs.map(({ ip, description }) => (
								<MultiSelect.Item key={ip} value={ip} disabled>
									<span className="flex min-w-0 flex-1 flex-col">
										<span className="font-mono">{ip}</span>
										{description && (
											<span className="text-muted font-sans text-xs font-normal">
												{description}
											</span>
										)}
									</span>
								</MultiSelect.Item>
							))}
						</MultiSelect.Group>
					)}
					{filteredAliases.length === 0 &&
						filteredPops.length === 0 &&
						filteredDedicatedIPs.length === 0 && (
							<MultiSelect.Empty>No results found</MultiSelect.Empty>
						)}
					<MultiSelect.ContentFooter>
						<div className="flex items-center rounded justify-between gap-4 bg-accent-600/10 p-4 m-1">
							<p className="text-accent-600 text-sm font-medium flex-1">
								Upgrade your plan to specify regions, PoPs, and dedicated IPs.
							</p>
							<Button appearance="filled" intent="neutral" className="shrink-0" asChild>
								<Link to="#">Upgrade to Pay-as-you-go</Link>
							</Button>
						</div>
					</MultiSelect.ContentFooter>
				</MultiSelect.Content>
			</MultiSelect.Root>
		</div>
	);
}
