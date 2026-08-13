import type { RuleTester } from "oxlint/plugins-dev";

/**
 * oxlint declares its plugin types but exports only `RuleTester`, so every type below reaches
 * them through `RuleTester.run`'s signature. The reach-through lives in this one file, and it
 * breaks the build if oxlint reshapes the API — which is alpha and not subject to semver.
 */
type AnyRule = Parameters<RuleTester["run"]>[1];

/** A rule that builds a fresh visitor object for each file. */
export type Rule = Extract<AnyRule, { create: (context: never) => unknown }>;

/** The per-file context oxlint passes to a rule's `create`. */
export type RuleContext = Parameters<Rule["create"]>[0];

/** Anything `context.report` accepts as the source range to underline. */
export type ReportTarget = NonNullable<Parameters<RuleContext["report"]>[0]["node"]>;

type Visitors = ReturnType<Rule["create"]>;

type VisitedNode<Key extends keyof Visitors> = Parameters<NonNullable<Visitors[Key]>>[0];

export type JsxElement = VisitedNode<"JSXElement">;
export type JsxFragment = VisitedNode<"JSXFragment">;
export type JsxExpressionContainer = VisitedNode<"JSXExpressionContainer">;

/** The tag name of a JSX element — `kbd`, `Kbd`, `CodeBlock.Code`, or `svg:title`. */
export type JsxElementName = JsxElement["openingElement"]["name"];

/** One entry of a JSX element's or fragment's `children` array. */
export type JsxChild = JsxElement["children"][number];

/** Any expression that can sit inside a `{…}` container. */
export type JsxExpression = JsxExpressionContainer["expression"];
