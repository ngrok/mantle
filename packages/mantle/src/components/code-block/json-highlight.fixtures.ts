// GENERATED GOLDEN FIXTURES — do not edit by hand.
//
// Captured from Mantle’s real Shiki engine (@ngrok/mantle-server-syntax-highlighter,
// shiki 4.2.0) via codeToHtml(code, { lang: "json", theme: "mantle-css-variables" }),
// extracting the <code> inner HTML. These lock jsonToShikiHtml to byte-for-byte parity
// with server/build-time highlighting WITHOUT pulling Shiki into the browser. Regenerate
// when the pinned shiki version changes.

type JsonHighlightFixture = { name: string; code: string; expected: string };

const jsonHighlightFixtures: JsonHighlightFixture[] = [
	{
		name: "flat object",
		code: '{\n  "id": "m5gr84i9",\n  "amount": 316,\n  "ok": true,\n  "note": null\n}',
		expected:
			'<span class="line"><span style="color:var(--shiki-foreground)">{</span></span>\n<span class="line"><span style="color:var(--shiki-token-keyword)">  "id"</span><span style="color:var(--shiki-token-punctuation)">:</span><span style="color:var(--shiki-token-string-expression)"> "m5gr84i9"</span><span style="color:var(--shiki-token-punctuation)">,</span></span>\n<span class="line"><span style="color:var(--shiki-token-keyword)">  "amount"</span><span style="color:var(--shiki-token-punctuation)">:</span><span style="color:var(--shiki-token-constant)"> 316</span><span style="color:var(--shiki-token-punctuation)">,</span></span>\n<span class="line"><span style="color:var(--shiki-token-keyword)">  "ok"</span><span style="color:var(--shiki-token-punctuation)">:</span><span style="color:var(--shiki-token-constant)"> true</span><span style="color:var(--shiki-token-punctuation)">,</span></span>\n<span class="line"><span style="color:var(--shiki-token-keyword)">  "note"</span><span style="color:var(--shiki-token-punctuation)">:</span><span style="color:var(--shiki-token-constant)"> null</span></span>\n<span class="line"><span style="color:var(--shiki-foreground)">}</span></span>',
	},
	{
		name: "nested + array",
		code: '{\n  "tags": [\n    "a",\n    "b"\n  ],\n  "nested": {\n    "url": "https://x.test/p?q=1&r=2",\n    "weird key": 1500\n  }\n}',
		expected:
			'<span class="line"><span style="color:var(--shiki-foreground)">{</span></span>\n<span class="line"><span style="color:var(--shiki-token-keyword)">  "tags"</span><span style="color:var(--shiki-token-punctuation)">:</span><span style="color:var(--shiki-foreground)"> [</span></span>\n<span class="line"><span style="color:var(--shiki-token-string-expression)">    "a"</span><span style="color:var(--shiki-token-punctuation)">,</span></span>\n<span class="line"><span style="color:var(--shiki-token-string-expression)">    "b"</span></span>\n<span class="line"><span style="color:var(--shiki-foreground)">  ]</span><span style="color:var(--shiki-token-punctuation)">,</span></span>\n<span class="line"><span style="color:var(--shiki-token-keyword)">  "nested"</span><span style="color:var(--shiki-token-punctuation)">:</span><span style="color:var(--shiki-foreground)"> {</span></span>\n<span class="line"><span style="color:var(--shiki-token-keyword)">    "url"</span><span style="color:var(--shiki-token-punctuation)">:</span><span style="color:var(--shiki-token-string-expression)"> "https://x.test/p?q=1&#x26;r=2"</span><span style="color:var(--shiki-token-punctuation)">,</span></span>\n<span class="line"><span style="color:var(--shiki-token-keyword)">    "weird key"</span><span style="color:var(--shiki-token-punctuation)">:</span><span style="color:var(--shiki-token-constant)"> 1500</span></span>\n<span class="line"><span style="color:var(--shiki-foreground)">  }</span></span>\n<span class="line"><span style="color:var(--shiki-foreground)">}</span></span>',
	},
	{
		name: "escapes in value",
		code: '{\n  "msg": "line1\\nline2 \\"q\\" é \\\\ </tag> a&b\\t end",\n  "path": "C:\\\\x"\n}',
		expected:
			'<span class="line"><span style="color:var(--shiki-foreground)">{</span></span>\n<span class="line"><span style="color:var(--shiki-token-keyword)">  "msg"</span><span style="color:var(--shiki-token-punctuation)">:</span><span style="color:var(--shiki-token-string-expression)"> "line1</span><span style="color:var(--shiki-token-escape, var(--shiki-token-constant))">\\n</span><span style="color:var(--shiki-token-string-expression)">line2 </span><span style="color:var(--shiki-token-escape, var(--shiki-token-constant))">\\"</span><span style="color:var(--shiki-token-string-expression)">q</span><span style="color:var(--shiki-token-escape, var(--shiki-token-constant))">\\"</span><span style="color:var(--shiki-token-string-expression)"> é </span><span style="color:var(--shiki-token-escape, var(--shiki-token-constant))">\\\\</span><span style="color:var(--shiki-token-string-expression)"> &#x3C;/tag> a&#x26;b</span><span style="color:var(--shiki-token-escape, var(--shiki-token-constant))">\\t</span><span style="color:var(--shiki-token-string-expression)"> end"</span><span style="color:var(--shiki-token-punctuation)">,</span></span>\n<span class="line"><span style="color:var(--shiki-token-keyword)">  "path"</span><span style="color:var(--shiki-token-punctuation)">:</span><span style="color:var(--shiki-token-string-expression)"> "C:</span><span style="color:var(--shiki-token-escape, var(--shiki-token-constant))">\\\\</span><span style="color:var(--shiki-token-string-expression)">x"</span></span>\n<span class="line"><span style="color:var(--shiki-foreground)">}</span></span>',
	},
	{
		name: "html special chars",
		code: '{\n  "html": "<div class=\\"x\\"> & </div>",\n  "gt": "a > b < c"\n}',
		expected:
			'<span class="line"><span style="color:var(--shiki-foreground)">{</span></span>\n<span class="line"><span style="color:var(--shiki-token-keyword)">  "html"</span><span style="color:var(--shiki-token-punctuation)">:</span><span style="color:var(--shiki-token-string-expression)"> "&#x3C;div class=</span><span style="color:var(--shiki-token-escape, var(--shiki-token-constant))">\\"</span><span style="color:var(--shiki-token-string-expression)">x</span><span style="color:var(--shiki-token-escape, var(--shiki-token-constant))">\\"</span><span style="color:var(--shiki-token-string-expression)">> &#x26; &#x3C;/div>"</span><span style="color:var(--shiki-token-punctuation)">,</span></span>\n<span class="line"><span style="color:var(--shiki-token-keyword)">  "gt"</span><span style="color:var(--shiki-token-punctuation)">:</span><span style="color:var(--shiki-token-string-expression)"> "a > b &#x3C; c"</span></span>\n<span class="line"><span style="color:var(--shiki-foreground)">}</span></span>',
	},
	{
		name: "numbers",
		code: '{\n  "neg": -42,\n  "float": -1.5,\n  "exp": 6.02e+23,\n  "zero": 0\n}',
		expected:
			'<span class="line"><span style="color:var(--shiki-foreground)">{</span></span>\n<span class="line"><span style="color:var(--shiki-token-keyword)">  "neg"</span><span style="color:var(--shiki-token-punctuation)">:</span><span style="color:var(--shiki-token-constant)"> -42</span><span style="color:var(--shiki-token-punctuation)">,</span></span>\n<span class="line"><span style="color:var(--shiki-token-keyword)">  "float"</span><span style="color:var(--shiki-token-punctuation)">:</span><span style="color:var(--shiki-token-constant)"> -1.5</span><span style="color:var(--shiki-token-punctuation)">,</span></span>\n<span class="line"><span style="color:var(--shiki-token-keyword)">  "exp"</span><span style="color:var(--shiki-token-punctuation)">:</span><span style="color:var(--shiki-token-constant)"> 6.02e+23</span><span style="color:var(--shiki-token-punctuation)">,</span></span>\n<span class="line"><span style="color:var(--shiki-token-keyword)">  "zero"</span><span style="color:var(--shiki-token-punctuation)">:</span><span style="color:var(--shiki-token-constant)"> 0</span></span>\n<span class="line"><span style="color:var(--shiki-foreground)">}</span></span>',
	},
	{
		name: "empties",
		code: '{\n  "obj": {},\n  "arr": [],\n  "str": ""\n}',
		expected:
			'<span class="line"><span style="color:var(--shiki-foreground)">{</span></span>\n<span class="line"><span style="color:var(--shiki-token-keyword)">  "obj"</span><span style="color:var(--shiki-token-punctuation)">:</span><span style="color:var(--shiki-foreground)"> {}</span><span style="color:var(--shiki-token-punctuation)">,</span></span>\n<span class="line"><span style="color:var(--shiki-token-keyword)">  "arr"</span><span style="color:var(--shiki-token-punctuation)">:</span><span style="color:var(--shiki-foreground)"> []</span><span style="color:var(--shiki-token-punctuation)">,</span></span>\n<span class="line"><span style="color:var(--shiki-token-keyword)">  "str"</span><span style="color:var(--shiki-token-punctuation)">:</span><span style="color:var(--shiki-token-string-expression)"> ""</span></span>\n<span class="line"><span style="color:var(--shiki-foreground)">}</span></span>',
	},
	{
		name: "unicode escape control char",
		code: '{\n  "ctrl": "a\\u0001b\\u001fc"\n}',
		expected:
			'<span class="line"><span style="color:var(--shiki-foreground)">{</span></span>\n<span class="line"><span style="color:var(--shiki-token-keyword)">  "ctrl"</span><span style="color:var(--shiki-token-punctuation)">:</span><span style="color:var(--shiki-token-string-expression)"> "a</span><span style="color:var(--shiki-token-escape, var(--shiki-token-constant))">\\u0001</span><span style="color:var(--shiki-token-string-expression)">b</span><span style="color:var(--shiki-token-escape, var(--shiki-token-constant))">\\u001f</span><span style="color:var(--shiki-token-string-expression)">c"</span></span>\n<span class="line"><span style="color:var(--shiki-foreground)">}</span></span>',
	},
	{
		name: "key with escape (compact)",
		code: '{"a\\nb":"v"}',
		expected:
			'<span class="line"><span style="color:var(--shiki-foreground)">{</span><span style="color:var(--shiki-token-keyword)">"a</span><span style="color:var(--shiki-token-escape, var(--shiki-token-constant))">\\n</span><span style="color:var(--shiki-token-keyword)">b"</span><span style="color:var(--shiki-token-punctuation)">:</span><span style="color:var(--shiki-token-string-expression)">"v"</span><span style="color:var(--shiki-foreground)">}</span></span>',
	},
	{
		name: "bare string",
		code: '"hi <there> & you"',
		expected:
			'<span class="line"><span style="color:var(--shiki-token-string-expression)">"hi &#x3C;there> &#x26; you"</span></span>',
	},
	{
		name: "bare number",
		code: "42",
		expected: '<span class="line"><span style="color:var(--shiki-token-constant)">42</span></span>',
	},
	{
		name: "bare bool",
		code: "true",
		expected:
			'<span class="line"><span style="color:var(--shiki-token-constant)">true</span></span>',
	},
	{
		name: "bare null",
		code: "null",
		expected:
			'<span class="line"><span style="color:var(--shiki-token-constant)">null</span></span>',
	},
	{
		name: "empty object pretty",
		code: "{}",
		expected: '<span class="line"><span style="color:var(--shiki-foreground)">{}</span></span>',
	},
	{
		name: "deeply nested",
		code: '{\n  "a": {\n    "b": {\n      "c": [\n        1,\n        {\n          "d": "e"\n        }\n      ]\n    }\n  }\n}',
		expected:
			'<span class="line"><span style="color:var(--shiki-foreground)">{</span></span>\n<span class="line"><span style="color:var(--shiki-token-keyword)">  "a"</span><span style="color:var(--shiki-token-punctuation)">:</span><span style="color:var(--shiki-foreground)"> {</span></span>\n<span class="line"><span style="color:var(--shiki-token-keyword)">    "b"</span><span style="color:var(--shiki-token-punctuation)">:</span><span style="color:var(--shiki-foreground)"> {</span></span>\n<span class="line"><span style="color:var(--shiki-token-keyword)">      "c"</span><span style="color:var(--shiki-token-punctuation)">:</span><span style="color:var(--shiki-foreground)"> [</span></span>\n<span class="line"><span style="color:var(--shiki-token-constant)">        1</span><span style="color:var(--shiki-token-punctuation)">,</span></span>\n<span class="line"><span style="color:var(--shiki-foreground)">        {</span></span>\n<span class="line"><span style="color:var(--shiki-token-keyword)">          "d"</span><span style="color:var(--shiki-token-punctuation)">:</span><span style="color:var(--shiki-token-string-expression)"> "e"</span></span>\n<span class="line"><span style="color:var(--shiki-foreground)">        }</span></span>\n<span class="line"><span style="color:var(--shiki-foreground)">      ]</span></span>\n<span class="line"><span style="color:var(--shiki-foreground)">    }</span></span>\n<span class="line"><span style="color:var(--shiki-foreground)">  }</span></span>\n<span class="line"><span style="color:var(--shiki-foreground)">}</span></span>',
	},
];

export { jsonHighlightFixtures };
export type { JsonHighlightFixture };
