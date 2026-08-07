import { Badge } from "@ngrok/mantle/badge";
import { Button } from "@ngrok/mantle/button";
import { Main } from "@ngrok/mantle/main";
import { Parfait } from "@ngrok/mantle/parfait";
import { RadioGroup } from "@ngrok/mantle/radio-group";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { useState } from "react";

/**
 * The primary Parfait composition for the docs: two sections of a resource
 * configuration editor, the page shape this component came from. Renders as an
 * entire framed-preview document (see preview-registry.ts), so the frame's
 * viewport switcher drives the `md` breakpoint — mobile stacks each header above
 * its own controls, and the page owns a real `h1` above the sections' `h2`s.
 *
 * The provider scope is real state, so the radio cards answer a click instead of
 * standing in as a picture of controls.
 */
export function ParfaitExample() {
	const [providerScope, setProviderScope] = useState("allow-only");

	return (
		<Main className="mx-auto min-h-full max-w-5xl px-6 py-8">
			<h1 className="text-strong mb-4 text-2xl font-medium">corby-pickles-config</h1>
			<Parfait.Root>
				<Parfait.Section>
					<Parfait.Header>
						<Parfait.Title>Providers</Parfait.Title>
						<Parfait.Description>What providers keys may call.</Parfait.Description>
					</Parfait.Header>
					<Parfait.Body>
						<RadioGroup.Root
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
					</Parfait.Body>
				</Parfait.Section>
				<Parfait.Section>
					<Parfait.Header>
						<Parfait.Title>Routing rules</Parfait.Title>
						<Parfait.Description>Define how requests are authenticated.</Parfait.Description>
					</Parfait.Header>
					<Parfait.Body>
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
					</Parfait.Body>
				</Parfait.Section>
			</Parfait.Root>
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
export function ParfaitPolymorphismExample() {
	return (
		<Main className="mx-auto min-h-full max-w-5xl px-6 py-8">
			<h1 className="text-strong text-2xl font-medium">corby-pickles-config</h1>
			<h2 className="text-strong mt-6 mb-4 text-xl font-medium">Advanced</h2>
			<Parfait.Root asChild>
				<form onSubmit={(event) => event.preventDefault()}>
					<Parfait.Section>
						<Parfait.Header>
							<Parfait.Title asChild>
								<h3>Danger zone</h3>
							</Parfait.Title>
							<Parfait.Description>Deleting a configuration cannot be undone.</Parfait.Description>
						</Parfait.Header>
						<Parfait.Body>
							<div className="flex justify-end">
								<Button type="submit" appearance="outlined" intent="danger">
									Delete configuration
								</Button>
							</div>
						</Parfait.Body>
					</Parfait.Section>
				</form>
			</Parfait.Root>
		</Main>
	);
}

/**
 * The column-split composition for the docs: `--parfait-columns` set on `Root`
 * moves every section to an even split, for an explanation that carries as much
 * weight as its controls. Renders as an entire framed-preview document (see
 * preview-registry.ts), so switching the frame to mobile shows the variable go
 * quiet once the two columns stack.
 */
export function ParfaitColumnsExample() {
	return (
		<Main className="mx-auto min-h-full max-w-5xl px-6 py-8">
			<h1 className="text-strong mb-4 text-2xl font-medium">Model access</h1>
			<Parfait.Root className="[--parfait-columns:1fr_1fr]">
				<Parfait.Section>
					<Parfait.Header>
						<Parfait.Title>Models</Parfait.Title>
						<Parfait.Description>
							An even split gives a long explanation the same room as its controls.
						</Parfait.Description>
					</Parfait.Header>
					<Parfait.Body>
						<div className="border-card text-body rounded-md border px-3 py-2 text-sm">
							Allow all models
						</div>
					</Parfait.Body>
				</Parfait.Section>
				<Parfait.Section>
					<Parfait.Header>
						<Parfait.Title>Rate limits</Parfait.Title>
						<Parfait.Description>
							Requests over the limit receive a 429 until the window resets.
						</Parfait.Description>
					</Parfait.Header>
					<Parfait.Body>
						<div className="border-card text-body rounded-md border px-3 py-2 text-sm">
							60 requests per minute
						</div>
					</Parfait.Body>
				</Parfait.Section>
			</Parfait.Root>
		</Main>
	);
}
