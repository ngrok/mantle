---
name: ngrok-style
description: "ngrok writing style guide for voice, tone, and grammar/mechanics. Use when writing or editing user-facing prose: docs-site page copy under apps/www/app/docs (published at mantle.ngrok.com), emails, or social posts. Not for code comments, JSDoc, changesets, decision docs, commits, or PR descriptions; those follow the simplified-technical-english skill. Docs-page copy is in both scopes: Simplified Technical English owns the mechanics and wins on conflict; this skill adds voice, tone, and the AI-pattern bans."
---

# ngrok Style Guide

A reference for writing content that feels genuinely ngrok: human, valuable, and technically sharp. Nothing like an enterprise monolith or a robot.

## When to Apply

This skill governs user-facing prose only:

- Docs-site page copy under `apps/www/app/docs`, published at mantle.ngrok.com
- Emails and social posts
- Reviews and edits of that content, including requests to make it "sound more ngrok"

Do not apply it to technical prose: code comments, JSDoc, changesets, decision docs, commit messages, PR titles and descriptions, review comments, or repo markdown (README, AGENTS.md, CONVENTIONS.md). Those follow the `simplified-technical-english` skill ([CONVENTIONS.md § Writing](../../../CONVENTIONS.md#writing)).

Docs-page copy is in both scopes. Simplified Technical English owns the sentence mechanics and wins wherever the two disagree. The two agree on em dashes: rewrite the sentence to avoid one. This skill adds what STE does not reach: voice, tone, and the AI-pattern bans below.

---

## Core Principles

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

- Answer questions completely — don't make readers hop around
- Focus on what readers _get_, not what it is or why we built it
- Be ready to admit ngrok isn't the right fit for everyone
- Do better than similar content that already exists on the topic

### Be respectful

Readers are DevOps/infra engineers, developers, and architects. Respect their time.

- Hook them immediately: get to the point without unnecessary preamble
- Make content scannable: bulleted lists, action-oriented headers, natural prose
- Cut cruft and padding that only serves SEO or makes us sound "smart"

### Be clearly ngrok-made

Add personal touches — especially in introductions — that signal this is human-written and problem-driven. Use parentheticals and asides to add color without derailing the main thread.

> Note: Reference docs don't need personality markers. Be concise, clear, comprehensive, and technically precise there.

---

## Grammar & Mechanics Quick Reference

### Capitalization

- **Never capitalize** common interfaces or concepts: domains, endpoints, load balancing, traffic management
- **Capitalize the _first_ mention** of a product (Cloud Endpoints, Secure Tunnels), then lowercase for the rest
- **Always capitalize:** Traffic Policy, Universal Gateway

### Headlines and headers

Use sentence casing.

- ✅ How to create a cloud endpoint
- ❌ How to Create a Cloud Endpoint

### Active voice

- ✅ Create an agent endpoint to route traffic to your services.
- ❌ The agent endpoint is created to route traffic to your services.

Quick test: if you can add "by monkeys" to the end of the sentence, it's passive voice.

### Use the imperative — avoid "you can"

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

- ✅ ngrok handles TLS termination, authentication, and routing in one place.
- ✅ ngrok handles TLS termination. It also covers authentication and routing.
- ❌ ngrok handles TLS termination—and authentication—and routing.

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

**Ban vague power adjectives.** "Seamless," "robust," "powerful," "cutting-edge," "comprehensive," "sophisticated." Make a specific claim instead.

- ✅ ngrok adds less than 5ms of latency on average.
- ❌ ngrok provides a powerful, seamless tunneling experience.

**Don't inflate significance.** "Game-changer," "a pivotal moment," "a watershed for the industry." Describe what the thing does and let the reader judge how big it is.

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

- ✅ Our support team sees this misconfiguration a few times a week.
- ❌ Studies show this misconfiguration is common.

**Don't stack hedges.** "Could potentially," "may eventually," "might ultimately." Each hedge cancels the next until the sentence asserts nothing. State the condition instead.

- ✅ Requests fail if the upstream doesn't respond within 60 seconds.
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

**Cut the "no X needed" tail.** This construction reassures the reader about a problem they didn't ask about, and it pads a claim that should stand on its own. State what happens and stop.

- ✅ ngrok terminates TLS automatically.
- ❌ ngrok terminates TLS automatically, no extra configuration needed.

### Bold UI elements, don't italicize

- ✅ Click **+ Cloud Endpoint** to get started.
- ❌ Click on _+ Cloud Endpoint_ to get started.

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
