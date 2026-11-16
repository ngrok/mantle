---
name: "ngrok-style"
description: "ngrok writing style guide for voice, tone, and grammar/mechanics. Use when writing or editing user-facing prose: docs-site page copy under apps/www/app/docs (published at mantle.ngrok.com), emails, or social posts. Not for code comments, JSDoc, changesets, decision docs, commits, or PR descriptions; those follow the simplified-technical-english skill. Docs-page copy is in both scopes: Simplified Technical English owns the mechanics and wins on conflict; this skill adds voice, tone, and the AI-pattern bans."
---

# ngrok style guide

A reference for writing content that feels genuinely ngrok: human, valuable, and technically sharp. Nothing like an enterprise monolith or a robot.

## When to apply

This skill governs user-facing prose only:

- Docs-site page copy under `apps/www/app/docs`, published at mantle.ngrok.com
- Emails and social posts
- Reviews and edits of that content, including requests to make it "sound more ngrok"

Do not apply it to technical prose: code comments, JSDoc, changesets, decision docs, commit messages, PR titles and descriptions, review comments, or repo markdown (README, AGENTS.md, CONVENTIONS.md). Those follow the `simplified-technical-english` skill ([CONVENTIONS.md § Writing](../../../CONVENTIONS.md#writing)).

Docs-page copy is in both scopes. Simplified Technical English owns the sentence mechanics and wins wherever the two disagree. The two agree on em dashes: rewrite the sentence to avoid one. This skill adds what STE does not reach: voice, tone, and the AI-pattern bans below.

Reference the full guide at `reference/style-guide.md`.

---

## How to edit

When the user asks you to review or edit a draft, act as an editor, not a ghostwriter.

1. Point out problems first, in a concise list. For each one, quote the exact line, name the rule it breaks, and suggest a fix.
2. Ask whether the user wants you to apply the changes or make them themselves. Don't change the draft until they answer.
3. Flag only lines that break a rule in this guide. Don't rewrite for taste, and don't rewrite whole passages unless the user asks for a rewrite.

Example list item:

- "It's worth noting that ngrok doesn't require inbound firewall ports." breaks **Cut filler transition phrases**. Try: "ngrok doesn't require inbound firewall ports."

---

## Core principles

Every piece of ngrok writing should be created genuinely out of a desire to:

1. Solve a specific problem for users
2. Make an argument users need to hear
3. Share something phenomenally cool we've built

### Be human

Write from your individual perspective. Bring personality, curiosity, and genuine enthusiasm. Meet readers where they are. Calibrate technical depth to their likely background.

- Write conversationally, like giving a talk
- Be funny if it feels natural
- Define concepts clearly the first time you use them
- Link internally for readers who want more context

### Be valuable

Only write something if it'll be meaningfully useful to whoever reads it.

- Answer questions completely so readers don't have to hop around
- Focus on what readers _get_, not what it is or why we built it
- Be ready to admit ngrok isn't the right fit for everyone
- Do better than similar content that already exists on the topic

### Be respectful

Readers are DevOps/infra engineers, developers, and architects. Respect their time.

- Hook them immediately: get to the point without unnecessary preamble
- Make content scannable: bulleted lists, action-oriented headers, natural prose
- Cut cruft and padding that only serves SEO or makes us sound "smart"

### Be clearly ngrok-made

Add personal touches that signal this is human-written and problem-driven, especially in introductions. Use parentheticals and asides to add color without derailing the main thread.

> Note: Reference docs don't need personality markers. Be concise, clear, comprehensive, and technically precise there.

---

## Grammar and mechanics quick reference

### Capitalization

- **Never capitalize** common interfaces or concepts: domains, endpoints, load balancing, traffic management
- **Capitalize the _first_ mention** of a product (Cloud Endpoints, Secure Tunnels), then lowercase for the rest
- **Always capitalize:** Traffic Policy, Universal Gateway
- **Product names:** AI Gateway, Cloud Endpoint, Gateway, Secure Tunnel, Share Localhost, Traffic Policy, Universal Gateway, Vault. Use the singular or plural form the context needs.

### Headlines and headers

Use sentence casing.

- ✅ How to create a cloud endpoint
- ❌ How to Create a Cloud Endpoint

### Active voice

- ✅ Create an agent endpoint to route traffic to your services.
- ❌ The agent endpoint is created to route traffic to your services.

Quick test: if you can add "by monkeys" to the end of the sentence, it's passive voice.

### Use the imperative, not "you can"

Give readers a push, not just permission.

- ✅ Protect your upstream services with the OAuth Traffic Policy action.
- ❌ You can use the OAuth Traffic Policy action to protect your upstream services.

### Write to your reader

- Use "you," not "we," unless speaking as ngrok itself ("We recently shipped cloud endpoints.")
- First-person ("I did X") is fine when writing about personal accomplishments
- Use they/them/their as gender-neutral pronouns

### Minimize technical language

Reduce buzzwords and product terms where you can without sacrificing clarity.

- ✅ When you create multiple endpoints with the same URL and binding, ngrok pools them by default, load-balancing traffic between them.
- ❌ Those endpoints automatically form a "pool" and share incoming traffic. For handling API traffic in a multi-cloud environment, you'll create two internal agent endpoints…

### Use contractions

Write the way you talk. "Isn't" not "is not."

### Avoid AI writing patterns

These patterns show up constantly in LLM-generated writing. Never use them.

**Em dashes: no spaces, used sparingly.** Write em dashes without surrounding spaces (`word—word`, not `word — word`). Better yet, rewrite the sentence to avoid the em dash entirely.

- ✅ ngrok terminates TLS and authenticates requests in one place.
- ✅ ngrok terminates TLS. It also authenticates requests.
- ❌ `ngrok terminates TLS—and authenticates requests—in one place.`

**Never use the "Not X. Not Y. Just Z." construction.** Say the thing directly.

- ✅ ngrok is the simplest way to expose a local service to the internet.
- ❌ Not a VPN. Not a firewall. Just ngrok.

**Never write "Whether you're X or Y."** The construction claims a breadth you can't deliver. Name the one reader you're writing for.

- ✅ This guide is for teams that run Kubernetes across more than one cluster.
- ❌ Whether you're a solo developer or a large enterprise team, ngrok has you covered.

**Lists must grammatically continue the introductory sentence.** Don't use a `**Bolded label** — Description` format for list items.

✅ The intro leads into each item:

```
ngrok is:
- Great for security, handling TLS termination automatically.
- Fast by default, adding only milliseconds of latency.
```

❌ Bolded label + em dash:

```
ngrok is great for:
- **Security** — Handles TLS termination automatically.
- **Performance** — Adds only milliseconds of latency.
```

**Cut filler transition phrases.** Delete these on sight: "It's worth noting that," "Keep in mind that," "It's important to remember," "In conclusion," "To summarize." Start with the actual sentence.

- ✅ ngrok doesn't require opening inbound firewall ports.
- ❌ It's worth noting that ngrok doesn't require opening inbound firewall ports.

**Cut formulaic openings.** Don't open with the state of the industry. Open with the reader's problem or the thing you built.

- ✅ Your webhook provider needs a public URL. Your laptop doesn't have one.
- ❌ In today's rapidly evolving cloud-native landscape, connectivity matters more than ever.

**Don't open with a rhetorical question.** You know the answer. Give it.

- ✅ Endpoint pooling removes the load balancer you'd otherwise run yourself.
- ❌ So why does endpoint pooling matter?

**Don't end with a generic conclusion.** "The future looks bright," "only time will tell," "as we move forward," "the possibilities are endless." End with the reader's next action, or just stop.

- ✅ Create a cloud endpoint in the dashboard, then attach a Traffic Policy rule to route it.
- ❌ As the ingress landscape keeps evolving, only time will tell what comes next.

**Ban vague power adjectives.** "Seamless," "robust," "powerful," "cutting-edge," "comprehensive," "sophisticated," "meticulous," "pivotal," "intricate," "vibrant," "bustling," "multifaceted," "commendable," "tapestry," "interplay," "underscore," "garner," "bolster." Make a specific claim instead.

- ✅ ngrok provisions and renews TLS certificates for your custom domains.
- ❌ ngrok provides a powerful, seamless tunneling experience.

**Don't inflate significance.** "Game-changer," "a pivotal moment," "a watershed for the industry," "stands as a testament to," "plays a crucial role in." Describe what the thing does and let the reader judge how big it is.

- ✅ Cloud endpoints accept traffic without an agent running anywhere.
- ❌ Cloud endpoints mark a pivotal moment for ingress.

**Swap wordy verbs for plain ones.**

| Write   | Not                            |
| ------- | ------------------------------ |
| use     | utilize, leverage              |
| to      | in order to                    |
| is      | serves as, acts as             |
| has     | boasts, features _(as a verb)_ |
| start   | commence, initiate             |
| because | due to the fact that           |

**Cut superficial -ing clauses.** "Enabling teams to ship faster," "allowing you to scale," "providing greater flexibility," "ensuring reliability." These tack an unprovable benefit onto the end of a sentence. Name the mechanism instead.

- ✅ Traffic Policy rejects unauthorized requests at the edge, so they never reach your origin.
- ❌ Traffic Policy runs at the edge, enabling teams to secure their services and providing greater flexibility.

**Name your sources.** Never write "experts agree," "studies show," or "many teams find." Say who, or cut the claim.

- ✅ Our support team sees this misconfiguration `<N>` times a week.
- ❌ Studies show this misconfiguration is common.

**Don't stack hedges.** "Could potentially," "may eventually," "might ultimately." Each hedge cancels the next until the sentence asserts nothing. State the condition instead.

- ✅ Requests fail if the upstream doesn't respond within `<N>` seconds.
- ❌ Requests may potentially fail if the upstream doesn't respond in time.

**Never write "dive into" or "delve into."** Just say what you're doing.

- ✅ Let's set up a cloud endpoint.
- ❌ Let's dive into setting up a cloud endpoint.

**Never call something "load-bearing."** The metaphor is an AI tell and it hides the actual claim. Name what the thing does and what breaks without it.

- ✅ Every request fails if the Traffic Policy rule doesn't match.
- ❌ That Traffic Policy rule is load-bearing.

**Avoid the artificial rule of three.** Don't pad a two-item thought with a third item just to complete the pattern. If you have two things to say, say two.

- ✅ ngrok handles TLS termination and authentication automatically.
- ❌ ngrok is fast, reliable, and secure.

**Cut "no X" phrases.** Don't tack a "no X needed" tail onto a claim, and don't chain "no X" phrases into a list ("No fluff, no filler, no jargon"). Both reassure the reader about problems they didn't raise instead of saying what the thing does. State what happens and stop.

- ✅ ngrok terminates TLS automatically.
- ❌ ngrok terminates TLS automatically, no extra configuration needed.
- ❌ No fluff, no filler, no jargon.

**Never write "say the quiet part out loud."** This idiom frames an ordinary statement as a hidden confession, and the idiom itself is a tell. State the fact directly.

- ✅ ngrok charges by usage, not by seat.
- ❌ ngrok is finally saying the quiet part out loud: pricing is usage-based.

**Never write "that's the whole point" or "is the entire X."** This claims total significance without stating what the significance is. Name the actual point instead.

- ✅ Traffic Policy runs at the edge, so requests never reach your origin.
- ❌ That's the whole point of Traffic Policy.

**Don't announce honesty or stage a reveal.** "I won't pretend," "Let's be honest," "To be clear," or a sentence that starts with "Honestly," "Look," "Frankly," or "Turns out" all promise sincerity or surprise instead of demonstrating it. Cut the announcement and state the fact.

- ✅ The default timeout was too short for large uploads.
- ❌ Honestly, the default timeout was too short for large uploads.
- ❌ Turns out, the default timeout was too short for large uploads.

**Never write "that's not nothing."** This hedge dresses up a vague claim as modest understatement. State the actual size or effect of the thing.

- ✅ That cuts p99 latency by `<N>`ms.
- ❌ That's not nothing.

**Avoid dev-blog boilerplate phrases.** "Fits in your head," "batteries included," "it just works," "zero config," "sane defaults." These are shortcuts that replace a real description of what the tool does.

- ✅ ngrok picks a random URL by default. Set your own with a reserved domain.
- ❌ ngrok just works, with zero config out of the box.

**Don't start three or more sentences in a row with the same word.** This creates a false rhythm instead of building an argument.

- ✅ ngrok supports custom domains and mutual TLS, and it logs every request by default.
- ❌ ngrok supports custom domains. ngrok supports mutual TLS. ngrok logs every request.

### Bold UI elements, don't italicize

- ✅ Click **+ Cloud Endpoint** to get started.
- ❌ Click on _+ Cloud Endpoint_ to get started.

### UI microcopy

**Buttons: sentence case, verb first.** Add the object when the verb alone is ambiguous. Capitalize only proper nouns and ngrok product names (see Capitalization). Skip "Click here," "Please," and "now."

- ✅ Save changes
- ❌ Save Changes
- ❌ Click here to save your changes

**Error messages: say what failed and what to do next.** Name the thing that failed, give the reason if you know it, and give one next step. Skip "Oops," "Something went wrong," and "Please."

- ✅ Couldn't save the policy. Fix the invalid expression on line 4 and save again.
- ❌ Something went wrong. Please try again.

**Empty states: say what goes here and how to add the first one.** Pair the message with an action that creates the first item.

- ✅ No API keys yet. Create one to call the ngrok API.
- ❌ Nothing to see here!

### Variables in code snippets

Use `<ANGLE_BRACKETS>`, not `{curly_braces}`:

```
ngrok http 80 --url https://<YOUR_NGROK_DOMAIN>
```

### Traffic Policy YAML style

```yaml
on_http_request:
  # A single action without an expression
  - name: DefaultAction # Optional, CamelCase, no quotes
    actions:
      - type: custom-response # No quotes around action types
        config:
          content: "Hello, world!" # Double-quote strings
          status_code: 200

  # A single action with an expression
  - name: DefaultAction
    expressions:
      - "actions.ngrok.oauth.identity.email.endsWith('ngrok.com')" # Double-quote expressions
      - "req.url.path.startsWith('/foo')"
    actions:
      - type: custom-response
        config:
          content: "Hello, world!"
```

### Accessibility

- All `<img>` tags need `alt=` attributes
- Text must have sufficient contrast against its background
- Non-image visual elements need aria labels
- Don't use color as the only visual differentiator
- Keep image file sizes reasonable

---

## Content types

| Type          | Goals                                                                                                     | Where published        |
| ------------- | --------------------------------------------------------------------------------------------------------- | ---------------------- |
| **Blog post** | Announce a feature; introduce a problem + solution; teach a skill; make an argument; showcase engineering | ngrok.com/blog         |
| **Guide**     | Solve one specific problem of relatively small scope                                                      | Docs, under Guides     |
| **Tutorial**  | Walk end-to-end through setting up ngrok for a production use case                                        | Docs, under Guides     |
| **Document**  | Describe an ngrok primitive, interface, product, or feature in exhaustive detail                          | Docs, relevant section |

> Guides, tutorials, and ngrok product docs live in the ngrok docs repo, not here. In this repo, docs-site pages follow both skills (see When to apply). All other markdown is technical prose and follows Simplified Technical English.

---

## Full style guide

See `reference/style-guide.md` for the full annotated style guide including examples and extended context.
