import type { HeadersFunction, MetaFunction } from "@remix-run/node";
import { Example } from "~/components/example";
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from "packages/card";
import { CodeBlock, CodeBlockBody, CodeBlockCode, CodeBlockCopyButton, fmtCode } from "packages/code-block";

export const meta: MetaFunction = () => {
	return [
		{ title: "@ngrok/mantle — Card" },
		{ name: "description", content: "mantle is ngrok's UI library and design system" },
	];
};

export const headers: HeadersFunction = () => {
	return {
		"Cache-Control": "max-age=300, stale-while-revalidate=604800",
	};
};

export default function Page() {
	return (
		<div>
			<h1 className="text-5xl font-medium">Card</h1>
			<p className="mt-4 text-xl text-body">
				A container used to display content in a box, resembling a physical card.
			</p>

			<Example className="mt-4">
				<Card className="shadow-lg">
					<CardHeader>
						<CardTitle>Card Title Here</CardTitle>
					</CardHeader>
					<CardBody>
						<p>Laborum in aute officia adipisicing elit velit.</p>
					</CardBody>
					<CardFooter>
						<p>Card footer</p>
					</CardFooter>
				</Card>
			</Example>
			<CodeBlock className="rounded-b-lg rounded-t-none">
				<CodeBlockBody>
					<CodeBlockCopyButton />
					<CodeBlockCode
						language="tsx"
						value={fmtCode`
							import { Card, CardBody, CardFooter, CardHeader, CardTitle } from "@ngrok/mantle";

							<Card>
								<CardHeader>
									<CardTitle>Card Title Here</CardTitle>
								</CardHeader>
								<CardBody>
									<p>Laborum in aute officia adipisicing elit velit.</p>
								</CardBody>
								<CardFooter>
									<p>Card footer</p>
								</CardFooter>
							</Card>
						`}
					/>
				</CodeBlockBody>
			</CodeBlock>
		</div>
	);
}
