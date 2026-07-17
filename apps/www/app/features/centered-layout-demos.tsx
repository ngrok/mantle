import { Button, IconButton } from "@ngrok/mantle/button";
import { Card } from "@ngrok/mantle/card";
import { CenteredLayout } from "@ngrok/mantle/centered-layout";
import { Input } from "@ngrok/mantle/input";
import { Label } from "@ngrok/mantle/label";
import { Main } from "@ngrok/mantle/main";
import { SkipToMainLink } from "@ngrok/mantle/skip-to-main-link";
import { ThemeSwitcher } from "@ngrok/mantle/theme-switcher";
import { CheckIcon } from "@phosphor-icons/react/Check";
import { WarningCircleIcon } from "@phosphor-icons/react/WarningCircle";
import { XIcon } from "@phosphor-icons/react/X";
import { useState } from "react";

function SignInCard() {
	return (
		<Card.Root>
			<Card.Header>
				<Card.Title>Sign in to acme</Card.Title>
			</Card.Header>
			<Card.Body className="flex flex-col gap-4">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="centered-layout-email">Email</Label>
					<Input id="centered-layout-email" type="email" placeholder="you@example.com" />
				</div>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="centered-layout-password">Password</Label>
					<Input id="centered-layout-password" type="password" placeholder="Your password" />
				</div>
				<Button type="button" intent="neutral" appearance="filled">
					Sign in
				</Button>
			</Card.Body>
		</Card.Root>
	);
}

function PlanPicker() {
	return (
		<div className="space-y-8 p-4">
			<div className="space-y-2">
				<p className="text-strong text-3xl font-medium">Choose a plan</p>
				<p className="text-body text-lg">
					Scale your fake apps — none of these plans, prices, or features are real.
				</p>
			</div>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-3">
				{[
					{
						name: "Sandbox",
						price: "$X",
						tagline: "A fake free tier for a fake product",
						features: [
							"Up to 3 imaginary endpoints",
							"1GB of pretend bandwidth",
							"20k hypothetical requests",
							"Community support (also pretend)",
							"Interstitial page on fake endpoints",
							"1 team member (you, hypothetically)",
							"Fake dev domain for public endpoints",
							"$X one-time pretend usage credit",
						],
						action: "Current Fake Plan",
					},
					{
						name: "Pretend Pro",
						price: "$XX",
						tagline: "For serious imaginary workloads",
						features: [
							"Unlimited imaginary endpoints",
							"Custom fake domains",
							"100k make-believe requests",
							"Priority pretend support",
							"No interstitial page (it never existed)",
							"3 team members ($0 per imaginary friend)",
							"Bring your own fictional domain",
							"$XX monthly pretend usage credit",
						],
						action: "Select Pretend Pro",
					},
					{
						name: "Make Believe",
						price: "$XXX",
						tagline: "Everything fake, at scale",
						features: [
							"Unlimited everything (none of it real)",
							"SSO for your imaginary team",
							"99.999% uptime, hypothetically",
							"Mutual TLS, in theory",
							"Wildcard endpoints, wildly fictional",
							"A dedicated (imaginary) account manager",
							"RBAC and SCIM, strictly conceptual",
							"Unlimited pretend usage, billed never",
						],
						action: "Select Make Believe",
					},
				].map((plan) => (
					<div
						key={plan.name}
						className="flex flex-col gap-6 rounded-md border border-gray-300 p-4"
					>
						<div className="shrink-0">
							<span className="text-strong text-base font-medium">{plan.name}</span>
							<p className="text-muted text-xs">
								<span className="text-strong text-2xl font-medium">{plan.price}</span> per month
							</p>
						</div>
						<div className="text-body flex flex-1 flex-col gap-4 text-xs">
							<p className="text-strong text-sm italic">{plan.tagline}</p>
							<ul className="space-y-1.5">
								{plan.features.map((feature) => (
									<li key={feature} className="flex gap-2">
										<CheckIcon className="text-muted size-4 shrink-0" />
										{feature}
									</li>
								))}
							</ul>
						</div>
						<Button type="button" appearance="outlined" intent="neutral">
							{plan.action}
						</Button>
					</div>
				))}
			</div>
			<Card.Root className="bg-card-hover rounded-xl shadow-inner">
				<Card.Body className="space-y-3">
					<p className="text-strong text-sm font-medium">Wait, is any of this real?</p>
					<p className="text-body text-sm">
						No — every plan, price, and feature on this page is made up to demonstrate the
						CenteredLayout composition. Scroll this frame to see the sticky header stay put.
					</p>
					<ul className="text-body list-disc space-y-1.5 pl-5 text-sm">
						<li>Can I upgrade from Sandbox to Pretend Pro? Only in your imagination.</li>
						<li>
							Do fake credits roll over? Forever — they aren&apos;t real, so they never expire.
						</li>
						<li>Is there a fake annual discount? Yes: save $0 with annual billing.</li>
						<li>What payment methods are accepted? Monopoly money and firm handshakes.</li>
						<li>Can I talk to fake sales? Absolutely — book a meeting that never happens.</li>
					</ul>
				</Card.Body>
			</Card.Root>
			<p className="text-muted text-xs">
				* All prices shown in imaginary dollars (IMD). Fake plans are subject to change without
				notice, because they do not exist. No warranty is expressed, implied, or imaginable.
			</p>
		</div>
	);
}

/**
 * The canonical sign-in composition for the centered-layout docs. Renders as
 * an entire framed-preview document (see preview-registry.ts), so it composes
 * exactly like a real sign-in page: the layout owns the document, with a
 * `SkipToMainLink` first and the `Main` landmark composed directly in `Body`.
 */
export function CenteredLayoutDemo() {
	return (
		<CenteredLayout.Root>
			<SkipToMainLink />
			<CenteredLayout.Body>
				{/* a real brand mark navigates home; the framed demo stays put */}
				<a
					href="https://ngrok.com"
					onClick={(event) => event.preventDefault()}
					className="text-strong text-lg font-semibold"
				>
					acme
				</a>
				<Main className="w-full max-w-80">
					<SignInCard />
				</Main>
			</CenteredLayout.Body>
			<CenteredLayout.Footer>
				<ThemeSwitcher.Root>
					<ThemeSwitcher.Trigger />
					<ThemeSwitcher.Content />
				</ThemeSwitcher.Root>
			</CenteredLayout.Footer>
		</CenteredLayout.Root>
	);
}

/**
 * The `CenteredLayout.Header` composition for the centered-layout docs: a
 * sticky utility strip over a scrolling plan picker. Renders as an entire
 * framed-preview document (see preview-registry.ts), so the page's own
 * scroller does the scrolling and the sticky header pins to the document —
 * exactly like the real checkout/plan-picker flows it demonstrates.
 */
export function CenteredLayoutHeaderDemo() {
	return (
		<CenteredLayout.Root>
			<SkipToMainLink />
			<CenteredLayout.Header className="bg-card sticky top-0 z-10 justify-between">
				<span className="text-muted text-sm">cody@acme.com</span>
				<IconButton
					type="button"
					appearance="ghost"
					intent="neutral"
					label="Close"
					icon={<XIcon />}
				/>
			</CenteredLayout.Header>
			<CenteredLayout.Body>
				<Main className="w-full max-w-5xl">
					<PlanPicker />
				</Main>
			</CenteredLayout.Body>
			<CenteredLayout.Footer>
				<ThemeSwitcher.Root>
					<ThemeSwitcher.Trigger />
					<ThemeSwitcher.Content />
				</ThemeSwitcher.Root>
			</CenteredLayout.Footer>
		</CenteredLayout.Root>
	);
}

/**
 * The `CenteredLayout.Notice` composition for the centered-layout docs: a
 * toggleable impersonation strip pinned above everything — the header
 * included. Renders as an entire framed-preview document (see
 * preview-registry.ts), so it composes exactly like a real page: the layout
 * owns the document, with a `SkipToMainLink` first and the `Main` landmark
 * composed directly in `Body`.
 */
export function CenteredLayoutNoticeDemo() {
	const [showNotice, setShowNotice] = useState(true);

	return (
		<CenteredLayout.Root>
			<SkipToMainLink />
			<CenteredLayout.Notice>
				{showNotice && (
					<div className="text-on-filled flex items-center gap-2 bg-red-600 px-4 py-1 text-xs">
						<WarningCircleIcon weight="fill" className="shrink-0" />
						You are impersonating jane@example.com in read-only mode.
					</div>
				)}
			</CenteredLayout.Notice>
			<CenteredLayout.Header className="justify-between">
				<span className="text-muted text-sm">cody@acme.com</span>
				<IconButton
					type="button"
					appearance="ghost"
					intent="neutral"
					label="Close"
					icon={<XIcon />}
				/>
			</CenteredLayout.Header>
			<CenteredLayout.Body>
				<span className="text-strong text-lg font-semibold">acme</span>
				<Main className="w-full max-w-80">
					<Card.Root>
						<Card.Body className="space-y-3">
							<p className="text-body text-sm">
								The notice strip pushes everything down — the header included — and collapses to
								nothing when empty.
							</p>
							<Button
								type="button"
								appearance="outlined"
								intent="neutral"
								size="sm"
								onClick={() => setShowNotice((current) => !current)}
							>
								Toggle notice
							</Button>
						</Card.Body>
					</Card.Root>
				</Main>
			</CenteredLayout.Body>
		</CenteredLayout.Root>
	);
}
