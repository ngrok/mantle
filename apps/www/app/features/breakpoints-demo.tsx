"use client";

import { Card } from "@ngrok/mantle/card";
import { Code } from "@ngrok/mantle/code";
import { useBreakpoint, useIsBelowBreakpoint } from "@ngrok/mantle/hooks";

/**
 * Live demo showing the current breakpoint and useIsBelowBreakpoint results.
 */
export function BreakpointsLiveDemo() {
	const currentBreakpoint = useBreakpoint();
	const isBelow2xs = useIsBelowBreakpoint("2xs");
	const isBelowXs = useIsBelowBreakpoint("xs");
	const isBelowSm = useIsBelowBreakpoint("sm");
	const isBelowMd = useIsBelowBreakpoint("md");
	const isBelowLg = useIsBelowBreakpoint("lg");

	return (
		<>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<Card.Root>
					<Card.Header>
						<Card.Title>Current breakpoint</Card.Title>
					</Card.Header>
					<Card.Body className="flex items-center justify-between">
						<span>Current breakpoint:</span>
						<Code className="text-lg font-medium">{currentBreakpoint}</Code>
					</Card.Body>
				</Card.Root>
				<Card.Root>
					<Card.Header>
						<Card.Title>Below extra extra small?</Card.Title>
					</Card.Header>
					<Card.Body className="flex items-center justify-between">
						<span>Below 2xs (360px):</span>
						<Code className="text-lg font-medium">{isBelow2xs.toString()}</Code>
					</Card.Body>
				</Card.Root>
				<Card.Root>
					<Card.Header>
						<Card.Title>Below extra small?</Card.Title>
					</Card.Header>
					<Card.Body className="flex items-center justify-between">
						<span>Below xs (480px):</span>
						<Code className="text-lg font-medium">{isBelowXs.toString()}</Code>
					</Card.Body>
				</Card.Root>
				<Card.Root>
					<Card.Header>
						<Card.Title>Below small?</Card.Title>
					</Card.Header>
					<Card.Body className="flex items-center justify-between">
						<span>Below sm (640px):</span>
						<Code className="text-lg font-medium">{isBelowSm.toString()}</Code>
					</Card.Body>
				</Card.Root>
				<Card.Root>
					<Card.Header>
						<Card.Title>Below medium?</Card.Title>
					</Card.Header>
					<Card.Body className="flex items-center justify-between">
						<span>Below md (768px):</span>
						<Code className="text-lg font-medium">{isBelowMd.toString()}</Code>
					</Card.Body>
				</Card.Root>
				<Card.Root>
					<Card.Header>
						<Card.Title>Below large?</Card.Title>
					</Card.Header>
					<Card.Body className="flex items-center justify-between">
						<span>Below lg (1024px):</span>
						<Code className="text-lg font-medium">{isBelowLg.toString()}</Code>
					</Card.Body>
				</Card.Root>
			</div>
			<p className="text-sm text-muted">
				Resize your browser window to see the values change in real-time.
			</p>
		</>
	);
}
