import { Button } from "@ngrok/mantle/button";
import { Card } from "@ngrok/mantle/card";
import { Markdown, markdownMath, type MarkdownComponents } from "@ngrok/mantle/markdown";
import { useEffect, useState } from "react";

/** A model's answer about ngrok endpoints, with each kind of block the demos show. */
const endpointAnswer = `## Put your app online

An **endpoint** gives your app a public URL. Start one with the agent:

\`\`\`bash
ngrok http 8080 --url https://api.example.ngrok.app
\`\`\`

Then add a Traffic Policy to block requests that lack an API key:

\`\`\`yaml
on_http_request:
  - expressions:
      - "!('x-api-key' in req.headers)"
    actions:
      - type: deny
        config:
          status_code: 401
\`\`\`

| Endpoint type | Starts from | Lives |
| --- | --- | ---: |
| Agent | \`ngrok http\` | while the agent runs |
| Cloud | the API or dashboard | until you delete it |

- [x] Install the agent
- [x] Add your authtoken
- [ ] Reserve a domain

> Cloud endpoints keep their URL when the agent restarts.

See the [endpoints docs](https://ngrok.com/docs/universal-gateway/endpoints/) for more.`;

/**
 * Streams `text` as a model would: a few characters at a time, about 60 times
 * a second. `restart` streams it again from the start.
 */
function useSimulatedStream(text: string) {
	const [length, setLength] = useState(0);
	const isStreaming = length < text.length;
	useEffect(() => {
		if (!isStreaming) {
			return undefined;
		}
		const timer = setInterval(() => {
			setLength((current) => Math.min(current + 3 + (current % 5), text.length));
		}, 16);
		return () => {
			clearInterval(timer);
		};
	}, [isStreaming, text]);
	return {
		text: text.slice(0, length),
		isStreaming,
		restart: () => setLength(0),
	};
}

/** The primary demo: an answer that streams in, with a button to stream it again. */
function StreamingAnswerDemo() {
	const { text, isStreaming, restart } = useSimulatedStream(endpointAnswer);
	return (
		<div className="flex w-full max-w-2xl flex-col gap-4">
			<Button
				type="button"
				appearance="outlined"
				intent="neutral"
				className="self-start"
				onClick={restart}
			>
				Stream again
			</Button>
			<Card.Root className="min-h-208">
				<Card.Body>
					<Markdown streaming={isStreaming}>{text}</Markdown>
				</Card.Body>
			</Card.Root>
		</div>
	);
}

/** An answer that is already complete, as a chat history shows it. */
function StaticAnswerDemo() {
	return (
		<Card.Root className="w-full max-w-2xl">
			<Card.Body>
				<Markdown>{endpointAnswer}</Markdown>
			</Card.Body>
		</Card.Root>
	);
}

const mathExtensions = [markdownMath()];

/** Renders each formula as its TeX source in a styled box. An app renders it with KaTeX instead. */
const mathComponents: MarkdownComponents = {
	math: ({ token }) => (
		<span translate="no" className="rounded-md bg-accent-500/10 px-1 font-mono text-accent-700">
			{token.text}
		</span>
	),
};

/** Math through the `markdownMath` extension and a `math` component. */
function MathDemo() {
	return (
		<Card.Root className="w-full max-w-2xl">
			<Card.Body>
				<Markdown extensions={mathExtensions} components={mathComponents}>
					{"At $5 and $10 a month, the cost grows as $c = 5n$ for $n$ endpoints."}
				</Markdown>
			</Card.Body>
		</Card.Root>
	);
}

/** An answer that cites its sources with GitHub footnotes. */
const footnoteAnswer = `Rate limits reset at the top of each hour[^reset], and a request over the limit gets a 429[^429].

Limits apply per account, not per endpoint[^reset].

[^reset]: In UTC, for every plan.
[^429]: With a \`Retry-After\` header that says when to try again.`;

/** Footnotes that stream in: each reference links to its note, and each note links back. */
function FootnotesDemo() {
	const { text, isStreaming, restart } = useSimulatedStream(footnoteAnswer);
	return (
		<div className="flex w-full max-w-2xl flex-col gap-4">
			<Button
				type="button"
				appearance="outlined"
				intent="neutral"
				className="self-start"
				onClick={restart}
			>
				Stream again
			</Button>
			<Card.Root className="min-h-64">
				<Card.Body>
					<Markdown streaming={isStreaming}>{text}</Markdown>
				</Card.Body>
			</Card.Root>
		</div>
	);
}

export {
	//,
	FootnotesDemo,
	MathDemo,
	StaticAnswerDemo,
	StreamingAnswerDemo,
};
