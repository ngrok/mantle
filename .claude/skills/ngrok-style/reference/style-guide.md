# The ngrok style guide (full reference)

> Source: https://www.notion.so/ngrok/The-ngrok-style-guide-1a1d19ffb65480ed976ddde0b50690a0

---

We've all read a piece of ngrok writing and thought:

> _That doesn't **feel** like ngrok._

There are many reasons why something doesn't feel quite right. Maybe it doesn't feel technical enough. Feels like it was written to optimize for keywords instead of trying to reach out and connect with someone on the other side of all these screens and networks. Feels too much about _what we've built_ and not _why anyone should care_. Feels like we're masquerading as an enterprise, not a scrappy Series A. Hell, maybe it just feels plain humorless or humanless.

No matter the reason, we (mostly) forgive ourselves. We read past the inconsistencies and quickly forget about the places where things don't feel quite right. That's because we love ngrok and know enough about the product and people to fill in the gaps.

Our audience—random readers, eager prospects, and long-term customers alike—don't have that same luxury. When something doesn't feel right to them, it tends to stick in a bad way. They might not love us, and they're certainly not eager to forget.

That's why style—this **feeling** (this smell?)—is a small thing we sweat over. A lot.

---

## How to create a consistent feeling

That's hard. Definitely more involved than a long list of grammatical rules (but we have those, too). The best way for us to start down this path is to get consistent on a few core elements.

Our written corpus—that's our website messaging, product copy, blog posts, documentation, social media posts, community outreach, and emails (maybe even video)—should always **be created genuinely** out of a desire to:

1. Solve a specific problem for our users,
2. Make an argument our users need to hear, or
3. Share something phenomenally cool we've built.

### Be human

We're people, not a monolith.

Even if ngrok were a monolith, it would have some _pizazz_ to it. It would certainly not be a staid, enterprise-y monolith.

When we write for ngrok, we do so from our individual perspectives—we bring our beliefs, curiosities, challenges, and unique ways of thinking to everything we do. As often as possible, inject your writing with your personal flair of style, personality, questions you're concerned about, things you're curious about, and what makes you excited about the world we work in.

That work also means taking a lot of care in thinking about how we meet the individual perspectives on the other side of the screen. What do they know about ngrok? Are they current users or complete unknowns? Power users in all things infra, or junior DevOps engineers hoping to ship quickly without having to learn a lifetime's worth of networking?

How do we be human in all these different situations?

- Write in a conversational tone, as you might when giving a talk or presentation.
- Be funny if that feels natural to you.
- Aim for a "minimally viable technical language complexity level" to describe your topics or walk the audience through a process, always modulating based on who they are and what they know about ngrok.
- Clearly define concepts, interfaces, or features the first time you mention them—don't assume the audience already knows.
- Always internally link to other resources for those who want to catch up without distracting from the story at hand.

### Be valuable

You should always write for and about ngrok because you know it'll be meaningfully valuable to whoever spends their time reading it. That ties back to the idea of starting from a genuine place.

How can you be valuable?

- Always answer the question or solve the problem as completely as possible in one place—don't force people to hop around to cobble together a solution.
- Be ready to admit that ngrok isn't the right fit for everyone.
- Focus on what readers get from something, not what it is or why we built it.
- Do better than similar content other people have made about the same topic.
- Internally link to other posts, docs, and beyond to create a useful network of resources.

If you're writing solely because it can capture an SEO keyword or offer some other tactical benefit _to us_, take a beat and consider whether you're coming at it from the right approach. Who are you being valuable to? Us or them?

### Be respectful

Our readers are DevOps/infrastructure engineers, software developers, system architects, and tech leadership. Aside from being valuable, we can go a few steps further.

Being respectful means:

- Start with a strong hook that gets to the point without unnecessary preamble and with clarity about _what this does for users and why they care_ OR _what we built and why_.
- Make your work scannable with bulleted lists and action-oriented headers, but also flowing with more natural and conversational prose.
- Actively excise cruft and padding that only meets SEO targets or makes us sound "smart."

### Be clearly ngrok-made™️

Our writing should be distinctly ours, but not read like a monolith lacking personal style. The more we follow these concepts, but also encourage personality, the better we can create narrative consistency across people, channels, and time.

One way we do this effectively is to add "markers" to our writing that signals where it's coming from. These markers should be scalable, in that they're easy to implement and don't require authors/developers to create new styles/components every time we use them.

Our markers are:

- **Personal touches in our introductions.** When we introduce our writing this way, we reinforce the idea that 1) we're human, and 2) we're creating this because we noticed a problem and wanted to help solve it.

  > As a customer engineer, I get to discuss and help improve networks in places I'd never otherwise go, like smart factories. The problem is, once these folks show me what their networks look like, all I see is a mess of complex firewall access, dated VPN troubleshooting, and exposed private networks.

- **Parentheticals.** Useful for leading readers into an educational aside without distracting too much from the content itself.

Other opportunities:

- A blunt opener that leads directly into a solution: _Self-hosting LLMs, and making them both accessible and secure, shouldn't have to be hard. Start by deploying Ollama to your GPU-accelerated VM…_
- A callout box at the beginning that details who the ideal audience is.

> **Note:** Some writing doesn't need or shouldn't have markers. Reference docs are a good example: those are places to be concise and clear, comprehensive, and technically precise, not driven by personality or voice.

### Be accessible

The web is for everyone, and we should be stewards of that by creating content that is accessible.

Run your page through https://pagespeed.web.dev/ before publishing. We should be scoring 100 for accessibility in all of our content.

Things to keep in mind:

1. All `<img>` tags should have an `alt=` attribute that describes the image.
2. All text should have sufficient contrast against its background. Contrast required increases as text size decreases. Particularly relevant in syntax highlighted code.
3. Visual elements that aren't `<img>` tags (e.g., dynamic/interactive animations) should have appropriate aria labels. Often `role="figure" aria-label="description of visual"`.
4. Color shouldn't be the only visual differentiator. For example, a line graph should use shapes or line patterns (dotted, dashed) as secondary indicators.
5. Be mindful of text size in screenshots. A full-screen desktop screenshot on mobile will be unreadable. When in doubt, make text slightly bigger than you think it needs to be.
6. Limit image file sizes. Resize and compress appropriately; https://squoosh.app/ is a good tool.

---

## Grammar and mechanics

### Capitalize mentions of ngrok products/features/interfaces consistently

Two rules:

1. Never capitalize common interfaces or concepts: **domains**, **endpoints**, **load balancing**, **traffic management**.
2. Capitalize the _first_ mention of a product, like **Cloud Endpoints**, then revert to lowercase for the rest of the content.

Always capitalize (these represent differentiated features beyond primitives):

- Traffic Policy
- Universal Gateway

ngrok product names (use the singular or plural form the context needs):

- AI Gateway
- Cloud Endpoint
- Gateway
- Secure Tunnel
- Share Localhost
- Traffic Policy
- Universal Gateway
- Vault

### Use sentence casing for headlines and headers

- ✅ How to create a cloud endpoint
- ❌ How to Create a Cloud Endpoint

### Write in active verbs

Passive verbs make for unclear sentences. Unclear sentences leave readers wondering why they care or what they should do next.

- ✅ Create an agent endpoint to route traffic to your services.
- ❌ The agent endpoint is created to route traffic to your services.

**Quick test:** "If you can add 'by monkeys' to the end of the sentence, it's passive voice."

### Use the imperative whenever possible (aka avoid "you can")

Don't just tell someone they _can_ do something. Give them a bit of a push. We don't want to come off as pushy, but rather empowering. _Go get something done with ngrok!_

- ✅ Protect your upstream services with the OAuth Traffic Policy action.
- ❌ You can use the OAuth Traffic Policy action to protect your upstream services.

### Write to your reader

Use "you," not "we," unless you're speaking as ngrok itself, e.g. "We recently shipped cloud endpoints."

You're also welcome to use first-person ("I did X and Y") when writing about your personal accomplishments at ngrok.

When you write about someone whose gender you don't know, use they/them/their as gender-neutral pronouns.

### Minimize technical language

We create a very technical product, and our readers are very technical people, but that doesn't mean we have to always speak to them like we're writing a technical manual for aircraft maintenance procedures.

If you can reduce the number of product terms and buzzwords without sacrificing clarity, do it.

- ✅ When you create multiple endpoints with the same URL and binding, ngrok pools them by default, load-balancing traffic between them. This can improve your API's performance and resiliency.
- ❌ When you create two endpoints with the same URL (and binding), those endpoints automatically form a "pool" and share incoming traffic. For handling API traffic in a multi-cloud environment, you'll create two internal agent endpoints…

### Use contractions

It isn't bad to write "isn't" instead of "is not." The idea that this is informal is antiquated, so let's write the way we talk.

### Bold, not italicize, UI elements

- ✅ Click **+ Cloud Endpoint** to get started.
- ❌ Click on _+ Cloud Endpoint_ to get started.

### UI microcopy

**Buttons: sentence case, verb first.** Start with the verb, and add the object when the verb alone is ambiguous. Capitalize only proper nouns and ngrok product names (see the list above). Skip "Click here," "Please," and "now."

- ✅ Save changes
- ❌ Save Changes
- ❌ Click here to save your changes

**Error messages: say what failed and what to do next.** Name the thing that failed, give the reason if you know it, and give one next step the user can take. Skip "Oops," "Something went wrong," and "Please." A vague error sends the reader to support instead of to the fix.

- ✅ Couldn't save the policy. Fix the invalid expression on line 4 and save again.
- ❌ Something went wrong. Please try again.

**Empty states: say what goes here and how to add the first one.** An empty page is often a new user's first view of a feature. Pair the message with an action that creates the first item.

- ✅ No API keys yet. Create one to call the ngrok API.
- ❌ Nothing to see here!

### Traffic Policy YAML style

Write Traffic Policy rules in a consistent manner so users don't encounter friction or confusion.

```yaml
on_http_request:
  # A single action without an expression
  - name: DefaultAction # Optional, use CamelCase and no quotes
    actions:
      - type: custom-response # No quotations around action types
        config:
          content: "Hello, world!" # Double quote strings
          status_code: 200

  # A single action with an expression
  - name: DefaultAction
    # The list of expressions should be nested beneath `expressions`
    expressions:
      - "actions.ngrok.oauth.identity.email.endsWith('ngrok.com')" # Double quote expressions
      - "req.url.path.startsWith('/foo')"
    actions:
      - type: custom-response
        config:
          content: "Hello, world!"
```

### Variables in code snippets

Always bracket variables in `<` and `>`, not `{}`, as those have literal meaning in YAML:

```
ngrok http 80 --url https://<YOUR_NGROK_DOMAIN>
```

### Avoid AI writing patterns

These patterns appear constantly in LLM-generated writing. Never use them.

**Em dashes: no spaces, used sparingly.** When you use an em dash, write it without surrounding spaces (`word—word`, not `word — word`). Better yet, rewrite the sentence to avoid the em dash entirely. Prefer a comma, a period, or a colon instead.

- ✅ ngrok terminates TLS and authenticates requests in one place.
- ✅ ngrok terminates TLS. It also authenticates requests.
- ❌ ngrok terminates TLS—and authenticates requests—in one place.

**Never use the "Not X. Not Y. Just Z." construction.** This is a tired rhetorical device that reads as AI-generated filler. Say the thing directly.

- ✅ ngrok is the simplest way to expose a local service to the internet.
- ❌ Not a VPN. Not a firewall. Just ngrok.

**Never write "Whether you're X or Y."** The construction claims a breadth you can't deliver, and it usually pairs two reader types that need different content. Name the one reader you're writing for.

- ✅ This guide is for teams that run Kubernetes across more than one cluster.
- ❌ Whether you're a solo developer or a large enterprise team, ngrok has you covered.

**Lists must grammatically continue the introductory sentence.** Write the intro as an incomplete sentence the items finish. Don't use a bolded label followed by an em dash as the list format.

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

**Cut filler transition phrases.** Delete these on sight: "It's worth noting that," "Keep in mind that," "It's important to remember," "In conclusion," "To summarize." They add zero information. Start with the actual sentence.

- ✅ ngrok doesn't require opening inbound firewall ports.
- ❌ It's worth noting that ngrok doesn't require opening inbound firewall ports.

**Cut formulaic openings.** Don't open with the state of the industry, the pace of change, or why the topic matters in general. Open with the reader's problem or the thing you built. Readers who clicked the title already accept the premise.

- ✅ Your webhook provider needs a public URL. Your laptop doesn't have one.
- ❌ In today's rapidly evolving cloud-native landscape, connectivity matters more than ever.

**Don't open with a rhetorical question.** "So why should you care?" "What if you could do X in seconds?" You know the answer, and the reader knows you know. The question delays the point by a sentence and buys nothing. Give the answer.

- ✅ Endpoint pooling removes the load balancer you'd otherwise run yourself.
- ❌ So why does endpoint pooling matter?

**Don't end with a generic conclusion.** "The future looks bright," "only time will tell," "as we move forward," "the possibilities are endless." A closer that would fit any article on any topic is padding. End with the reader's next action, or just stop when you're done.

- ✅ Create a cloud endpoint in the dashboard, then attach a Traffic Policy rule to route it.
- ❌ As the ingress landscape keeps evolving, only time will tell what comes next.

**Ban vague power adjectives.** "Seamless," "robust," "powerful," "cutting-edge," "comprehensive," "sophisticated," "meticulous," "pivotal," "intricate," "vibrant," "bustling," "multifaceted," "commendable," "tapestry," "interplay," "underscore," "garner," "bolster." These say nothing. Make a specific claim instead.

- ✅ ngrok provisions and renews TLS certificates for your custom domains.
- ❌ ngrok provides a powerful, seamless tunneling experience.

**Don't inflate significance.** "Game-changer," "a pivotal moment," "a watershed for the industry," "the future of X," "stands as a testament to," "plays a crucial role in." These treat a routine release as history. Describe what the thing does and let the reader judge how big it is. This matters most in announcement posts, where the temptation is strongest.

- ✅ Cloud endpoints accept traffic without an agent running anywhere.
- ❌ Cloud endpoints mark a pivotal moment for ingress.

**Swap wordy verbs for plain ones.** LLMs reach for the longer verb and for constructions that avoid "is" and "has."

| Write   | Not                            |
| ------- | ------------------------------ |
| use     | utilize, leverage              |
| to      | in order to                    |
| is      | serves as, acts as             |
| has     | boasts, features _(as a verb)_ |
| start   | commence, initiate             |
| because | due to the fact that           |

- ✅ Traffic Policy has four phases.
- ❌ Traffic Policy boasts a comprehensive set of four distinct phases.

**Cut superficial -ing clauses.** "Enabling teams to ship faster," "allowing you to scale," "providing greater flexibility," "ensuring reliability," "streamlining your workflow." These tack an unprovable benefit onto the end of a sentence that had already made its point. The clause sounds like analysis but adds no fact. Name the mechanism instead, and let the benefit follow from it.

- ✅ Traffic Policy rejects unauthorized requests at the edge, so they never reach your origin.
- ❌ Traffic Policy runs at the edge, enabling teams to secure their services and providing greater flexibility.

**Name your sources.** Never write "experts agree," "studies show," "research suggests," or "many teams find." Attribution without a name is decoration. Say who, link to it, or cut the claim.

- ✅ Our support team sees this misconfiguration `<N>` times a week.
- ❌ Studies show this misconfiguration is common.

**Don't stack hedges.** "Could potentially," "may eventually," "might ultimately." Each hedge cancels the next until the sentence asserts nothing. One hedge is sometimes honest; two is always evasion. In docs, state the condition that decides the outcome.

- ✅ Requests fail if the upstream doesn't respond within `<N>` seconds.
- ❌ Requests may potentially fail if the upstream doesn't respond in time.

**Never write "dive into" or "delve into."** Just say what you're doing.

- ✅ Let's set up a cloud endpoint.
- ❌ Let's dive into setting up a cloud endpoint.

**Never call something "load-bearing."** The metaphor is an AI tell, and it substitutes a vague sense of importance for the real claim. Name what the thing does and what breaks without it.

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

---

## Content types

| Type          | Goals                                                                                                             | Where published        |
| ------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **Blog post** | Announce a feature; introduce a problem + solution; teach a skill; make an argument; showcase engineering work    | ngrok.com/blog         |
| **Guide**     | Solve one specific problem of relatively small scope                                                              | Docs, under Guides     |
| **Tutorial**  | Walk end-to-end through setting up ngrok for a production use case (e.g., API gateway, site-to-site connectivity) | Docs, under Guides     |
| **Document**  | Describe an ngrok primitive, interface, product, or feature in exhaustive detail                                  | Docs, relevant section |

The borders between types are always moving. Content re-use is a _good_ thing: it's better to err on the side of getting it "wrong" the first time and then translating to another content type later.

---

## Content ownership

Creating and improving content is open to everyone. If you see something, say something.

| Content type        | Primary owner          |
| ------------------- | ---------------------- |
| Messaging / website | GTM / Product / Design |
| Documentation       | Product                |
| Blog posts          | GTM                    |
| Emails              | GTM                    |
| Video               | GTM                    |
| Social media        | GTM                    |

If you want to contribute: reach out to that team. If you own a type: don't be a gatekeeper. Take contributions with open arms and walk peers through the process with empathy.
