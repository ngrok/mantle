import { Anchor } from "@/anchor";
import { CodeBlock, CodeBlockBody, CodeBlockCode, CodeBlockCopyButton } from "@/code-block";
import { code } from "@/code-block/code";
import { InlineCode } from "@/inline-code";
import type { MetaFunction } from "@vercel/remix";
import { Example } from "~/components/example";

export const meta: MetaFunction = () => {
	return [
		{ title: "@ngrok/mantle — Anchor" },
		{ name: "description", content: "mantle is ngrok's UI library and design system" },
	];
};

export default function Page() {
	return (
		<div>
			<h1 className="text-5xl font-medium">Anchor</h1>
			<p className="my-4 text-xl text-gray-600">Fundamental component for rendering links to external addresses.</p>
			<div className="mt-8 space-y-4 text-gray-600">
				<p>
					The <InlineCode>&lt;Anchor&gt;</InlineCode> element, with its <InlineCode>href</InlineCode> attribute, creates
					a hyperlink to web pages, files, email addresses, locations in the same page, or anything else a URL can
					address.
				</p>
				<p>
					Content within each <InlineCode>&lt;Anchor&gt;</InlineCode> should indicate the link&rsquo;s destination. If
					the <InlineCode>href</InlineCode> attribute is present, pressing the enter key while focused on the{" "}
					<InlineCode>&lt;Anchor&gt;</InlineCode> element will activate it.
				</p>
				<p>
					See the <Anchor href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a">MDN docs</Anchor> for more
					information.
				</p>
				<p>
					If you need to link to an internal application route, prefer using the{" "}
					<Anchor href="https://reactrouter.com/en/main/components/link">
						<InlineCode>react-router-dom</InlineCode> <InlineCode>&lt;Link&gt;</InlineCode>
					</Anchor>{" "}
					or the{" "}
					<Anchor href="https://remix.run/docs/en/main/components/link">
						<InlineCode>@remix-run/react</InlineCode> <InlineCode>&lt;Link&gt;</InlineCode>
					</Anchor>
					.
				</p>
			</div>
			<Example className="mt-4">
				<p>
					This link will go to <Anchor href="https://ngrok.com/">ngrok.com</Anchor>!
				</p>
			</Example>
			<CodeBlock className="rounded-t-none rounded-b-lg">
				<CodeBlockBody>
					<CodeBlockCopyButton />
					<CodeBlockCode language="tsx">
						{code`
							<p>
								This link will go to <Anchor href="https://ngrok.com/">ngrok.com</Anchor>!
							</p>
						`}
					</CodeBlockCode>
				</CodeBlockBody>
			</CodeBlock>
		</div>
	);
}
