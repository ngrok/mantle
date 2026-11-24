import type { ChatEvent, Respond } from "~/features/chat";

const reasoning =
	"The user wants endpoints with no traffic policy. List the endpoints, check each one for a policy, then suggest a rule for each gap.";

const endpoints = [
	{ url: "https://api.example.com", policy: null },
	{ url: "https://app.example.com", policy: "rate-limit" },
	{ url: "tcp://1.tcp.ngrok.io:20012", policy: null },
];

const answer = `Two of your three endpoints have **no traffic policy**:

| Endpoint | Policy | Risk |
| --- | --- | --- |
| \`https://api.example.com\` | none | One client can use up its capacity. |
| \`tcp://1.tcp.ngrok.io:20012\` | none | Anyone on the internet can reach it. |

Add a rate limit by client IP to the API endpoint:

\`\`\`yaml
on_http_request:
  - actions:
      - type: rate-limit
        config:
          name: per-client
          algorithm: sliding_window
          capacity: 100
          rate: 60s
          bucket_key:
            - conn.client_ip
\`\`\`

Then restrict the TCP endpoint to your office network with a \`restrict-ips\` action. \`https://app.example.com\` already has a policy, so it needs no change.`;

/** Waits like a network chunk, and rejects when the request aborts. */
function wait(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(resolve, ms);
		signal.addEventListener("abort", () => {
			clearTimeout(timer);
			reject(signal.reason);
		});
	});
}

/** Splits text into word-sized deltas that keep their spaces and line breaks. */
function deltas(text: string): string[] {
	return text.match(/\S+\s*|\s+/g) ?? [];
}

/**
 * A stand-in for the chat endpoint. It streams reasoning, one tool call, and a
 * Markdown answer with a table and a code block, and honors the abort signal.
 * A message that contains "fail" drops the stream partway, as a lost
 * connection would. The real endpoint sends the messages to a model through
 * the ngrok.ai gateway, which routes the inference.
 */
export const mockRespond: Respond = async function* ({
	messages,
	signal,
}): AsyncGenerator<ChatEvent> {
	const question = messages.findLast((message) => message.from === "user");
	const fails = question?.text.toLowerCase().includes("fail") === true;

	for (const text of deltas(reasoning)) {
		await wait(25, signal);
		yield { type: "reasoning", text };
	}

	yield { type: "tool-start", id: "call-1", name: "list_endpoints", args: { online: true } };
	await wait(700, signal);
	yield { type: "tool-end", id: "call-1", result: endpoints };

	const files = question?.files ?? [];
	const intro =
		files.length > 0 ? `I read ${files.map((file) => `\`${file.name}\``).join(" and ")}.\n\n` : "";
	const words = deltas(intro + answer);
	for (const [index, text] of words.entries()) {
		if (fails && index === Math.floor(words.length / 3)) {
			throw new Error("The connection to the model dropped.");
		}
		await wait(30, signal);
		yield { type: "text", text };
	}
};
