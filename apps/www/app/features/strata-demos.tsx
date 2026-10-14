import { Badge } from "@ngrok/mantle/badge";
import { Button } from "@ngrok/mantle/button";
import { Main } from "@ngrok/mantle/main";
import { Strata } from "@ngrok/mantle/strata";
import { RadioGroup } from "@ngrok/mantle/radio-group";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { useState } from "react";

/**
 * The primary Strata composition for the docs: two sections of a resource
 * configuration editor, the page shape this component came from. Renders as an
 * entire framed-preview document (see preview-registry.ts), so the frame's
 * viewport switcher drives the `md` breakpoint — mobile stacks each header above
 * its own controls, and the page owns a real `h1` above the sections' `h2`s.
 *
 * The provider scope is real state, so the radio cards answer a click instead of
 * standing in as a picture of controls.
 */
export function StrataExample() {
	const [providerScope, setProviderScope] = useState("allow-only");

	return (
		<Main className="mx-auto min-h-full max-w-5xl px-6 py-8">
			<h1 className="text-strong mb-4 text-2xl font-medium">corby-pickles-config</h1>
			<Strata.Root>
				<Strata.Section>
					<Strata.Header>
						<Strata.Title>Providers</Strata.Title>
						<Strata.Description>What providers keys may call.</Strata.Description>
					</Strata.Header>
					<Strata.Body>
						<RadioGroup.Root
							aria-label="Provider scope"
							className="grid grid-cols-1 gap-2 sm:grid-cols-2"
							value={providerScope}
							onChange={setProviderScope}
						>
							<RadioGroup.Card className="flex" value="allow-all">
								<RadioGroup.ItemContent className="flex-1 space-y-1 text-sm">
									<span className="text-strong font-medium">Allow all</span>
									<p className="text-body">No provider restrictions.</p>
								</RadioGroup.ItemContent>
								<RadioGroup.Indicator />
							</RadioGroup.Card>
							<RadioGroup.Card className="flex" value="allow-only">
								<RadioGroup.ItemContent className="flex-1 space-y-1 text-sm">
									<span className="text-strong font-medium">Allow only</span>
									<p className="text-body">Limit keys to selected providers.</p>
								</RadioGroup.ItemContent>
								<RadioGroup.Indicator />
							</RadioGroup.Card>
						</RadioGroup.Root>
					</Strata.Body>
				</Strata.Section>
				<Strata.Section>
					<Strata.Header>
						<Strata.Title>Routing rules</Strata.Title>
						<Strata.Description>Define how requests are authenticated.</Strata.Description>
					</Strata.Header>
					<Strata.Body>
						<div className="flex justify-end">
							<Button type="button" appearance="outlined" intent="neutral" icon={<PlusIcon />}>
								Add rule
							</Button>
						</div>
						<div className="border-card divide-card-muted divide-y rounded-md border text-sm">
							<div className="flex items-center gap-2 px-3 py-2">
								OpenAI <Badge appearance="muted">Custom</Badge>
							</div>
							<div className="flex items-center gap-2 px-3 py-2">
								Anthropic <Badge appearance="muted">Custom</Badge>
							</div>
						</div>
					</Strata.Body>
				</Strata.Section>
			</Strata.Root>
		</Main>
	);
}

/**
 * The polymorphism composition for the docs: `Root` renders as the `<form>`, so
 * the form element sits outside every section instead of repeating once per
 * band, and `Title` renders as an `<h3>` for a section that sits under a
 * sub-heading. Renders as an entire framed-preview document (see
 * preview-registry.ts), which is why it carries the `h1` the `h2` and `h3`
 * below it need.
 *
 * Why no `aria-labelledby` on the `Section`: naming it would make it a `region`
 * landmark, and a delete button is not a destination a reader jumps to. The
 * docs page states the test.
 */
export function StrataPolymorphismExample() {
	return (
		<Main className="mx-auto min-h-full max-w-5xl px-6 py-8">
			<h1 className="text-strong text-2xl font-medium">corby-pickles-config</h1>
			<h2 className="text-strong mt-6 mb-4 text-xl font-medium">Advanced</h2>
			<Strata.Root asChild>
				<form onSubmit={(event) => event.preventDefault()}>
					<Strata.Section>
						<Strata.Header>
							<Strata.Title asChild>
								<h3>Danger zone</h3>
							</Strata.Title>
							<Strata.Description>Deleting a configuration cannot be undone.</Strata.Description>
						</Strata.Header>
						<Strata.Body>
							<div className="flex justify-end">
								<Button type="submit" appearance="outlined" intent="danger">
									Delete configuration
								</Button>
							</div>
						</Strata.Body>
					</Strata.Section>
				</form>
			</Strata.Root>
		</Main>
	);
}

/**
 * The column-split composition for the docs: `--strata-columns` set on `Root`
 * moves every section to an even split, for an explanation that carries as much
 * weight as its controls. Renders as an entire framed-preview document (see
 * preview-registry.ts), so switching the frame to mobile shows the variable go
 * quiet once the two columns stack.
 */
export function StrataColumnsExample() {
	return (
		<Main className="mx-auto min-h-full max-w-5xl px-6 py-8">
			<h1 className="text-strong mb-4 text-2xl font-medium">Model access</h1>
			<Strata.Root className="[--strata-columns:1fr_1fr]">
				<Strata.Section>
					<Strata.Header>
						<Strata.Title>Models</Strata.Title>
						<Strata.Description>
							An even split gives a long explanation the same room as its controls.
						</Strata.Description>
					</Strata.Header>
					<Strata.Body>
						<div className="border-card text-body rounded-md border px-3 py-2 text-sm">
							Allow all models
						</div>
					</Strata.Body>
				</Strata.Section>
				<Strata.Section>
					<Strata.Header>
						<Strata.Title>Rate limits</Strata.Title>
						<Strata.Description>
							Requests over the limit receive a 429 until the window resets.
						</Strata.Description>
					</Strata.Header>
					<Strata.Body>
						<div className="border-card text-body rounded-md border px-3 py-2 text-sm">
							60 requests per minute
						</div>
					</Strata.Body>
				</Strata.Section>
			</Strata.Root>
		</Main>
	);
}
