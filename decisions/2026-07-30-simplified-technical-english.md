# Adopt Simplified Technical English for comments, JSDoc, changesets, and PR prose

**Date:** 2026-07-30
**Status:** Accepted
**Applies to:** every comment, JSDoc block, changeset, decision doc, docs page, commit subject, and pull-request description written in this repo
**Distilled rules:** [CONVENTIONS.md → Writing](../CONVENTIONS.md#writing)
**Source:** [ngrok-private/ngrok#45954](https://github.com/ngrok-private/ngrok/pull/45954), which added these rules to the ngrok monorepo as a Claude Code skill. Upstream standard: [ASD-STE100](https://www.asd-ste100.org/).

## Context

Agent-written prose in this repo over-explains. It restates the code, it hedges, and it narrates the
investigation. A pass over `packages/mantle/src`, `apps/www`, and the agent docs found four repeating
shapes:

- **The summary restates the identifier.** `packages/mantle/src/components/command/command.tsx:374` reads
  `The input component for the Command. It provides the input for the command palette.` Sentence two says
  nothing sentence one did not. That shape repeats at eight more part declarations in the same file, and
  the namespace copies degrade further — `:954` reads `The input component for the Command component.`
  `packages/mantle/src/components/theme/theme-provider.tsx:51` and `:58` carry one sentence twice, on a context and on its provider.
- **One sentence carries four ideas.** `packages/mantle/src/components/select/select.tsx:188` runs 55 words on a single line, drops into a
  lowercase `if` mid-block, and states the default in the future passive:
  `By default the selected item's text will be rendered.`
- **The comment names nothing.** `packages/mantle/src/components/card/card.tsx:9` reads
  `A container that can be used to display content in a box resembling a physical card.`
  `packages/mantle/src/components/table/table.tsx:7` promises `styling and additional functionality`. Neither tells a reader what the part
  does that a sibling does not.
- **The comment narrates the investigation.** `packages/mantle/src/components/table/table.tsx:415` ships `// This could be removed, or simplified`
  inside a live `cx()` call. `packages/mantle/src/hooks/use-breakpoint.tsx:102` narrates the implementation instead of stating
  the contract.

Every one of those lines costs a reader on each read, and every one of them ships. JSDoc is the surface for
IntelliSense, `llms.txt`, `/api/components.json`, and each agent that reads the library, so bad prose
propagates into generated consumer code.

ASD-STE100 Simplified Technical English is a controlled-language standard from aerospace maintenance
documentation. Its rules answer these four shapes directly: one term per concept, active voice, simple
tenses, one idea per sentence, condition first, and no comment that restates the code. ngrok adopted a
subset of the standard in ngrok-private/ngrok#45954. This record adopts the same subset here, with mantle's
own artifacts and carve-outs added.

## Decisions

### 1. CONVENTIONS.md owns the rules

A new top-level `## Writing` section in [CONVENTIONS.md](../CONVENTIONS.md#writing) holds them. It sits
after `### TypeScript` and before `## className Composition`, in the file's whole-repo group.

Two facts decide the placement:

- **The rules stay in context.** `AGENTS.md` inlines the whole file with `@./CONVENTIONS.md`, so a Claude
  Code session loads the section before it writes a line. A skill file loads on demand.
- **Every harness reads it.** `AGENTS.md` is the canonical agent file for amp, Codex, Cursor, and Claude
  Code. A rule in CONVENTIONS.md reaches all four. A rule under `.claude/` reaches one.

The section also takes over two rules that already sat in `Code Quality`. The
`Comments explain _why_, not _what_` bullet and the
`Prefer concise contract-oriented documentation over implementation commentary` bullet become pointers,
because the repo keeps one home per rule.

### 2. The skill is the Claude Code trigger, and it defers

`.claude/skills/simplified-technical-english/SKILL.md` is thin. Claude Code matches its `description`
against the task and loads it at write time. The body holds the before/after table and the self-check, and
it names CONVENTIONS.md § Writing as normative. It states no rule of its own.

Be honest about what it buys, because the section is already always-on:

- a model-invocation hook that fires when the model writes prose, rather than a rule the model must
  remember to re-read;
- a home for the long examples, which stay out of every session's context window.

It defers on conflict, exactly as `/audit-component` defers to COMPONENT_SPEC.md
(`If a workflow disagrees with the spec, the spec wins`). If the skill and the section disagree, the section
wins, and the reporter fixes the skill rather than the prose.

### 3. No sweep

The rules apply to prose you write or edit. They do not license a repo-wide rewrite. This follows
[COMPONENT_SPEC.md → Scope and status](../COMPONENT_SPEC.md#scope-and-status): new work meets the bar, the
parts you touch meet the bar, and the rest waits until someone opts into the work. An audit reports the gap.

One exclusion is permanent, not deferred:

- **Quoted upstream text keeps its source wording.** `packages/mantle/src/components/input/types.ts:1-12` is
  verbatim MDN prose with an `@see` citation, and `packages/mantle/src/components/flag/flag.tsx:23` is the
  same case. An STE pass would fork the text from its source and lose the citation's value.

A shipped `decisions/*.md` is **in scope**, which this record settles because the first draft said the
opposite. The argument for excluding one was that its wording is part of a dated record. That conflates two
things: the decision a doc states, which is the record, and the sentences it states it in, which are not.
Tightening the prose does not rewrite history. Two limits still hold — never change what a shipped doc
decided, and never restate its dated evidence as a present-tense claim, because a quoted "before" example is
evidence and must stay verbatim.

### 4. The banned-word list ships with its carve-outs

Source rule 3 bans a word list. A word-boundary scan of that list over this repo hits real vocabulary, so
the section publishes each carve-out beside the ban:

- **`provide`** — ban the verb. `Provider` and every `*Provider` identifier stay, because rule 2 requires
  the identifier's exact name (`ThemeProvider` ×56, `TooltipProvider` ×37 of 88 prose hits). Rewrite
  `when provided` as `when set` or `when omitted`, and imperative advice as `Pass` or `Set`.
- **`just`** — ban the filler that deletes with no change of meaning. Contrastive `not just`, comparative
  `just as` / `just like`, and temporal `just` stay: none of the 32 mantle hits is the filler the rule
  targets. `justify-*` is on 320 lines, so no scan may match a substring or a stem.
- **`enable`** — keep the flag-only rule for the verb. The adjective `enabled` is the antonym of `disabled`
  and stays, as does the `oxlint-enable` directive. Roughly 20 of 35 hits name a row state, not an action.
- **`perform`** — ban the verb as a substitute for a specific one. `performance` and `performance.now()`
  stay; six of ten hits are the noun or the API, three of them inside `@example` blocks that rule 2 forbids
  paraphrasing.
- **`seamless`** — ban the quality adjective. The tiling term of art stays, because it names a real
  geometric property: `packages/mantle/src/components/chart/texture.ts:57`, pinned by `packages/mantle/src/components/chart/texture.test.ts:47`.
- **`leverage`** — ban the verb. The noun `high-leverage` stays.
- **`ensure`** — no carve-out. `make sure`, the standard's replacement, already has one precedent in
  `CONVENTIONS.md § Testing`.

Two mechanical rules follow. First, any scan must skip backtick spans; 5,720 comment lines in
`packages/mantle/src` carry a backtick, which is how the repo satisfies rule 2. Second, `simply` is
word-exact and never stem-matched, or `simplify` and `simplified` trip it — both appear in CONVENTIONS.md
itself.

### 5. Rule 10 governs sentences, not labels

Source rule 10 reads `Do not drop words to shorten. Keep the articles, subjects, and verbs.` Read literally,
it outlaws the repo's own list and JSDoc style:

- `CONVENTIONS.md § Testing` has 14 consecutive verbless bullets — the browser-mode API list that rule 11
  asks for by name.
- 640 of 818 `The …` / `A …` summary phrases in `packages/mantle/src` carry no finite verb.
  `COMPONENT_SPEC.md §4.1` requires one noun phrase per prop, so this is by design.
- The `// Why <topic>:` label is a fragment by mandate (`CONVENTIONS.md § Readability & Maintainability`,
  `COMPONENT_SPEC.md §1.7`) with 19 sites, and it is the cleanest expression of rule 13.

Resolution: rule 10 applies to sentences. A list item may be a labeled fragment, and a JSDoc summary may be
a noun phrase. The rule's real target is the mid-sentence word drop it names — `// resets cursor on flush`
becomes `The flush resets the cursor.`

Two more house forms survive by name. The em-dash aside stays: it appears 1,339 times on 1,283 comment lines
in `packages/mantle/src` and it carries the exception, so rule 8's `split the sentence on and, but, or ;`
does not reach it. The boundary is meaning — an aside that restates is cuttable, an aside that names the
exception is not. The prose semicolon stays with it, on 454 mantle lines, so the adopted rule drops `;` from
the split list. The `-- reason` clause on an `oxlint-disable` line also stays as written, fragment and
semicolon included, because oxlint parses the directive text.

### 6. The word limits are a smell, not a gate

Measured over 2,296 JSDoc summary sentences in `packages/mantle/src`: median 10 words, p90 21 words, 253
(11.0%) over 20 words, and 129 (5.6%) over 25.

The cap catches the wrong prose. All eight worst over-explaining comments found in the corpus pass the
20-word cap: `packages/mantle/src/components/command/command.tsx:374` is 6 words, `packages/mantle/src/components/select/select.tsx:188` is 7, `packages/mantle/src/components/card/card.tsx:9` is 16. Meanwhile the
over-limit summaries cluster in the newest components, which were built to the current spec bar — 30% of
`list`, 28% of `avatar`, 19% of `chart`. `packages/mantle/src/components/avatar/avatar.tsx:93` spends 49 words to pin the whole initials contract,
and it should keep them.

So the section keeps the limits as a smell and names the productive rewrite. A summary past 25 words is
almost always one clause, a colon, and an enumeration. That is rule 11's problem — write a list — not a word
count problem.

Two surfaces take no descriptive cap at all:

- **`.changeset/*.md`** — 52% of shipped changelog sentences run over 20 words by design. Rules 18 to 20 are
  commit rules. A changeset explains a shipped API to a consumer who never sees the diff, so
  `the diff is the changelog` is false there. Note that a changeset is a live file, not a record: fix one
  you wrote.
- **`decisions/*.md`** — long-form rationale, and 89 semicolon-joined lines. The word bans still reach them.

The commit cap takes a counting rule for the same reason. Ten words after the `type(scope):` prefix flags 8
of the last 60 merged subjects, so the section states that the prefix and the `(#1234)` squash suffix do not
count, and it keeps the number as a target.

Rule 5's exempt list also grows. `HTTP, API, SQL, TLS` is too small for this repo: `DOM` appears unexpanded
159 times, `CSS` 122, `HTML` 77, `ARIA` 76, `SSR` 49. `CONVENTIONS.md § Readability & Maintainability`
already set the precedent for identifiers (`Widely-known initialisms (URL, CSS, SSR) are fine`), so the
section extends the exemption to the same web-platform and accessibility vocabulary instead of declaring a
rival list. `POJO` is on the exempt list because `CONVENTIONS.md § Compound Components` uses it bare.

## Alternatives rejected

### (a) The skill alone, with no CONVENTIONS.md section

Cost: the rules reach Claude Code and nothing else. `AGENTS.md` is the canonical agent file for amp, Codex,
and Cursor, and none of them read `.claude/skills/`. The rules would also load only when the model chooses
to load them, so the prose that needs them most — a one-line comment inside a large refactor — is the prose
that never triggers a match on the skill description.

### (b) A new top-level `WRITING.md`

Cost: a fourth canonical doc, a fourth clause in AGENTS.md's precedence sentence, and one more precedence
rule to keep correct. The gain is zero. `CONVENTIONS.md` already calls itself the single source of truth for
code style, and it already hosts a top-level section with sub-parts (`## Testing`). A separate file would
also fall out of the always-on context that `@./CONVENTIONS.md` supplies, which is the reason for the
placement in the first place.

### (c) COMPONENT_SPEC.md

Cost: wrong scope. The spec governs `packages/mantle/src/components/`. These rules govern commit subjects,
changesets, decision docs, `apps/www` docs pages, and every comment in `packages/mantle-vite-plugins` and
`packages/mantle-server-syntax-highlighter`. The spec takes three pointer lines instead — in `## Precedence`,
under `## 4. JSDoc`, and under `### 7.4. Prose rules`: the spec owns what the prose must cover, and
CONVENTIONS.md § Writing owns how the sentences read.

## Consequences

- `AGENTS.md` gains a `Prose` bullet in the diff-audit checklist, so the checklist covers every diff, and
  its precedence sentence changes from `governs code style` to `governs code and prose style`.
- The adoption PR fixes four violations in the agent docs themselves: `Ensure they pass`,
  `Ensure all packages are built`, and `leverages turbo caching` in `AGENTS.md`, plus a filler `just` in
  `CONVENTIONS.md § Testing`. A rule cannot ship 40 lines from a violation in the file that loads it.
- `.github/copilot-instructions.md` gains one line. Copilot's review is the one automated reader that would
  otherwise ask for longer, more formal, more hedged phrasing.
- Editing a JSDoc summary stays a multi-file change. The summary and every `@example` feed
  `apps/www/app/utilities/__snapshots__/components-surface.json`, and CI fails until
  `pnpm -F @app/www test -u` regenerates it. A cleanup pass must budget for that, and for the duplicated
  text — `packages/mantle/src/components/select/select.tsx:188`, `packages/mantle/src/components/select/select.tsx:831`, and `apps/www/app/docs/components/forms/select.mdx:441` are one sentence in three places.
- No changeset. The adoption diff touches no file under `packages/mantle/src` and nothing published changes.
- There is no linter for any of this. `oxlint` does not read markdown, and `fmt:check` only formats it. The
  diff-audit checklist, the skill trigger, and human review are the enforcement.
- The subset is expected to change. When a carve-out turns out wrong, edit `CONVENTIONS.md § Writing` in the
  PR that proves it and say so in the PR description. A rule nobody follows is a bug in the rule.
