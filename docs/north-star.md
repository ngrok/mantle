# North star

These are the goals of each change to mantle: a component, a prop, a default, a token, a motion, an error, and a docs page. They are not negotiable, and they apply at all times. No task, deadline, or diff size is a reason to skip one. [AGENTS.md](../AGENTS.md#north-star) lists them, so each human and each agent reads them before the first edit.

Mantle exists for pages that are expressive and rich in capability, with no cost to Core Web Vitals, search engine optimization (SEO), or answer engine optimization (AEO). The seven goals are how mantle gets there.

The goals have no order. They work together: a change that meets six goals and fails one is not done.

Choose a design by what the consumer and the user get, not by what is easy to build or to migrate. The number of call sites that a change must move is never a reason to keep a worse API.

## How to use the goals

- **Before you design:** for each goal, ask what the change does to it. Choose the design that meets all seven. The [principles](./principles/README.md) are the methods that get you there.
- **Before you finish:** do a north-star pass. For each goal that the change affects, say in one line how the change meets it. Put the pass in the pull request (PR) description ([CONVENTIONS.md § Commit messages and PR descriptions](../CONVENTIONS.md#commit-messages-and-pr-descriptions)).
- **In review:** a goal that a change fails is a blocking finding, as a failed test is.

## When two goals pull apart

Find a design that meets both. If you cannot, say the trade-off and the reason in the PR. Never make the trade without a word in the PR.

- **Never trade Correct.**
- **Fast and Efficient do not win against Accessible.** Keep what assistive technology reads, and when it reads it. Give the measured cost to the author as a decision. Do not apply the change on performance grounds alone.
- **A visual design leads a contrast threshold.** Design the component so that it is beautiful, then get as close to the threshold as you can. Record the gap and the Web Content Accessibility Guidelines (WCAG) exemption that covers it, as the [chart colors decision](../decisions/2026-11-13-chart-named-colors-and-bar-look.md) does. This rule is for visual trades only. A keyboard contract, a role, and a label are never part of such a trade.

## Correct

Each part renders right in light and in dark, on the server and after hydration, at 320px and at a wide viewport, and for a pointer, a keyboard, and a touch. It stays right after a browser translation. It is also right at the edges: no data, long text, a loading state, an error, a disabled state, an animation that a second input interrupts, and an unmount in the middle of an interaction. The first paint is the final paint.

- **Served by:** [fix root causes](./principles/fix-root-causes.md), [validate at the boundary](./principles/validate-at-the-boundary.md), [make illegal states unrepresentable](./principles/make-illegal-states-unrepresentable.md), [derive, don't sync](./principles/derive-dont-sync.md), [test behavior, not implementation](./principles/test-behavior-not-implementation.md), and [prove it works](./principles/prove-it-works.md).
- **Signs you missed it:** a test that asserts a class and not what a user sees, a component that nobody opened in a browser, or a part that renders wrong for one frame before it hydrates.

## Accessible

Each component owns the keyboard and ARIA contract that its name promises. It works for a screen reader, for a keyboard with no pointer, for touch, and with reduced motion. The consumer gets all of it with no work at the call site. [COMPONENT_SPEC.md §3.6](../COMPONENT_SPEC.md#36-accessibility-and-motion) and the [Accessibility page](../apps/www/app/docs/accessibility.mdx) own the rules.

- **Served by:** [experience first](./principles/experience-first.md), [make illegal states unrepresentable](./principles/make-illegal-states-unrepresentable.md), and [test behavior, not implementation](./principles/test-behavior-not-implementation.md).
- **Signs you missed it:** a role with no keyboard contract, a label that each consumer must remember to add, motion with no gate for reduced motion, or a performance change that changes what a screen reader reads.

## Least surprising

A component does what a consumer expects from its name, its props, and its JSDoc. A default is safe and matches the browser, or the ecosystem where that is safer. One component answers one intent, and one job has one way to do it. A consumer who knows one mantle component can predict the others. An upgrade never changes the behavior of an app with no word in the changeset, and a breaking change gets a `minor` bump ([VERSIONING.md](../VERSIONING.md)).

- **Served by:** [follow the platform](./principles/follow-the-platform.md), [experience first](./principles/experience-first.md), [composition over configuration](./principles/composition-over-configuration.md), [migrate callers, then delete](./principles/migrate-callers-then-delete.md), [derive, don't sync](./principles/derive-dont-sync.md), and [make illegal states unrepresentable](./principles/make-illegal-states-unrepresentable.md).
- **Signs you missed it:** two props that do one job, a prop whose name does not read as the DOM or ARIA that it sets, a default that differs from the browser and the ecosystem with no reason, or a breaking change with a `patch` bump.

## Fast

The user never waits for mantle, and the Core Web Vitals hold: Interaction to Next Paint (INP), Largest Contentful Paint (LCP), and Cumulative Layout Shift (CLS).

- **An input gets its answer in the next frame.** A press, a key, and a hover change what the user sees before any other work. Motion follows [docs/motion.md](./motion.md), and it never delays the change of state.
- **The first paint is the final paint.** No layout shift, no flash of the wrong theme, and no script that the first paint waits for. The one exception is the inline theme script, which sets the theme before the first paint.
- **The server sends the page.** A marketing site prerenders each page. A product app renders its first document on the server, then routes as a single-page app after hydration. The content is in that HTML, so a search engine and an answer engine read it with no script.
- **Continuous input stays smooth.** A scroll, a resize, a drag, and a pointer move do layout work one time for each frame at most.
- **A page of many stays fast.** The ngrok dashboard is the consumer that matters most, and its pages hold many instances of one component: the rows of a table, the cards of a list. Measure the page of many first. Content that is off screen costs nothing until the user gets near it.

A claim of speed needs a measurement of the base and of the branch.

- **Served by:** [follow the platform](./principles/follow-the-platform.md), [do less in the browser](./principles/do-less-in-the-browser.md), [keep the hot path lean](./principles/keep-the-hot-path-lean.md), [redesign before you cache](./principles/redesign-before-you-cache.md), and [explain the number](./principles/explain-the-number.md).
- **Signs you missed it:** content that only a script renders, a claim of speed with no measurement, a scroll listener for an effect that CSS can do, a layout read for each item of a list, or state that an effect sets on mount when render can compute it.

## Delightful

The user gets a UI that answers at once, moves only to explain a change, and looks right in each theme. The consumer gets a component that works on the first try from its JSDoc example, a `className` that always wins, and an error that names the bad prop and the fix. A behavior with one right answer is built in: the app sets no prop, and the user changes it by an action that mantle keeps as their preference. The agent gets a docs example that runs as it is.

- **Served by:** [experience first](./principles/experience-first.md), [build the behavior in](./principles/build-the-behavior-in.md), and [minimize reader load](./principles/minimize-reader-load.md).
- **Signs you missed it:** a step that each app must remember, a prop that an app must set for the layout to hold, a recipe that each app copies to get a behavior, a silent failure, motion that explains nothing, or an example that does not run.

## Clean

The change is the smallest that meets the task, and each part reads in one pass. Each export, prop, CSS variable, and data attribute is API that mantle keeps. Small parts that compose come before a prop that configures. The core stays pure, and React and the DOM stay at the edges.

- **Served by:** [write less code](./principles/write-less-code.md), [subtract before you add](./principles/subtract-before-you-add.md), [reuse before you build](./principles/reuse-before-you-build.md), [composition over configuration](./principles/composition-over-configuration.md), [build the behavior in](./principles/build-the-behavior-in.md), [minimize reader load](./principles/minimize-reader-load.md), and [pure core, effects at the edges](./principles/pure-core-effects-at-the-edges.md).
- **Signs you missed it:** a helper that already exists in `packages/mantle/src`, a prop that no named app asked for, a prop that forwards props to an internal element, or a second path for one job.

## Efficient

Mantle uses few resources outside the interaction too: the JavaScript and the CSS that an app ships, DOM nodes, compositor layers, listeners, memory, the build time, and the context window of the next agent. Mantle's bundler contract is Vite and Rolldown. With them, a component that an app does not import costs that app nothing, and a part of a compound component that it does not use adds no JavaScript ([decision](../decisions/2026-11-15-tree-shakeable-compound-components.md)).

Memory is a cost as real as time. Each byte that a part holds for each instance limits how much a page can show and do, so a part holds only what its job needs. The best runtime cost is zero: move the work to the build or the server, then find a cheaper design, and add a cache last. Memoization is a cache too, so the React Compiler runs only where memoization pays. Mantle optimizes for less shipped code, not for React Server Components. A cost that grows with the page, such as with each row or each chart, has a measured limit.

- **Served by:** [do less in the browser](./principles/do-less-in-the-browser.md), [keep the hot path lean](./principles/keep-the-hot-path-lean.md), [redesign before you cache](./principles/redesign-before-you-cache.md), [explain the number](./principles/explain-the-number.md), and [guard the context window](./principles/guard-the-context-window.md).
- **Signs you missed it:** a cache that hides a slow design, an effect, a subscription, or a listener that a static part does not need, an import that pulls a second component family into a leaf, one listener for each instance when one shared listener serves the page, a module side effect that a bundler cannot remove, or a doc that each task loads but few tasks need.
