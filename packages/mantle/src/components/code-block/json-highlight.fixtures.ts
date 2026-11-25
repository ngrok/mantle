// GENERATED GOLDEN FIXTURES: do not edit by hand.
//
// Captured from Mantle’s real Shiki engine (@ngrok/mantle-server-syntax-highlighter,
// shiki 4.2.0) via codeToHtml(code, { lang: "json", theme: "mantle-css-variables" }),
// with the `mantle:token-classes` transformer,
// extracting the <code> inner HTML. These lock jsonToShikiHtml to byte-for-byte parity
// with server/build-time highlighting WITHOUT pulling Shiki into the browser. Regenerate
// when the pinned shiki version changes.

type JsonHighlightFixture = { name: string; code: string; expected: string };

const jsonHighlightFixtures: JsonHighlightFixture[] = [
	{
		name: "flat object",
		code: '{\n  "id": "m5gr84i9",\n  "amount": 316,\n  "ok": true,\n  "note": null\n}',
		expected:
			'<span class="line">{</span>\n<span class="line"><span class="tk">  "id"</span><span class="tu">:</span><span class="tx"> "m5gr84i9"</span><span class="tu">,</span></span>\n<span class="line"><span class="tk">  "amount"</span><span class="tu">:</span><span class="tn"> 316</span><span class="tu">,</span></span>\n<span class="line"><span class="tk">  "ok"</span><span class="tu">:</span><span class="tn"> true</span><span class="tu">,</span></span>\n<span class="line"><span class="tk">  "note"</span><span class="tu">:</span><span class="tn"> null</span></span>\n<span class="line">}</span>',
	},
	{
		name: "nested + array",
		code: '{\n  "tags": [\n    "a",\n    "b"\n  ],\n  "nested": {\n    "url": "https://x.test/p?q=1&r=2",\n    "weird key": 1500\n  }\n}',
		expected:
			'<span class="line">{</span>\n<span class="line"><span class="tk">  "tags"</span><span class="tu">:</span> [</span>\n<span class="line"><span class="tx">    "a"</span><span class="tu">,</span></span>\n<span class="line"><span class="tx">    "b"</span></span>\n<span class="line">  ]<span class="tu">,</span></span>\n<span class="line"><span class="tk">  "nested"</span><span class="tu">:</span> {</span>\n<span class="line"><span class="tk">    "url"</span><span class="tu">:</span><span class="tx"> "https://x.test/p?q=1&#x26;r=2"</span><span class="tu">,</span></span>\n<span class="line"><span class="tk">    "weird key"</span><span class="tu">:</span><span class="tn"> 1500</span></span>\n<span class="line">  }</span>\n<span class="line">}</span>',
	},
	{
		name: "escapes in value",
		code: '{\n  "msg": "line1\\nline2 \\"q\\" é \\\\ </tag> a&b\\t end",\n  "path": "C:\\\\x"\n}',
		expected:
			'<span class="line">{</span>\n<span class="line"><span class="tk">  "msg"</span><span class="tu">:</span><span class="tx"> "line1</span><span class="te">\\n</span><span class="tx">line2 </span><span class="te">\\"</span><span class="tx">q</span><span class="te">\\"</span><span class="tx"> é </span><span class="te">\\\\</span><span class="tx"> &#x3C;/tag> a&#x26;b</span><span class="te">\\t</span><span class="tx"> end"</span><span class="tu">,</span></span>\n<span class="line"><span class="tk">  "path"</span><span class="tu">:</span><span class="tx"> "C:</span><span class="te">\\\\</span><span class="tx">x"</span></span>\n<span class="line">}</span>',
	},
	{
		name: "html special chars",
		code: '{\n  "html": "<div class=\\"x\\"> & </div>",\n  "gt": "a > b < c"\n}',
		expected:
			'<span class="line">{</span>\n<span class="line"><span class="tk">  "html"</span><span class="tu">:</span><span class="tx"> "&#x3C;div class=</span><span class="te">\\"</span><span class="tx">x</span><span class="te">\\"</span><span class="tx">> &#x26; &#x3C;/div>"</span><span class="tu">,</span></span>\n<span class="line"><span class="tk">  "gt"</span><span class="tu">:</span><span class="tx"> "a > b &#x3C; c"</span></span>\n<span class="line">}</span>',
	},
	{
		name: "numbers",
		code: '{\n  "neg": -42,\n  "float": -1.5,\n  "exp": 6.02e+23,\n  "zero": 0\n}',
		expected:
			'<span class="line">{</span>\n<span class="line"><span class="tk">  "neg"</span><span class="tu">:</span><span class="tn"> -42</span><span class="tu">,</span></span>\n<span class="line"><span class="tk">  "float"</span><span class="tu">:</span><span class="tn"> -1.5</span><span class="tu">,</span></span>\n<span class="line"><span class="tk">  "exp"</span><span class="tu">:</span><span class="tn"> 6.02e+23</span><span class="tu">,</span></span>\n<span class="line"><span class="tk">  "zero"</span><span class="tu">:</span><span class="tn"> 0</span></span>\n<span class="line">}</span>',
	},
	{
		name: "empties",
		code: '{\n  "obj": {},\n  "arr": [],\n  "str": ""\n}',
		expected:
			'<span class="line">{</span>\n<span class="line"><span class="tk">  "obj"</span><span class="tu">:</span> {}<span class="tu">,</span></span>\n<span class="line"><span class="tk">  "arr"</span><span class="tu">:</span> []<span class="tu">,</span></span>\n<span class="line"><span class="tk">  "str"</span><span class="tu">:</span><span class="tx"> ""</span></span>\n<span class="line">}</span>',
	},
	{
		name: "unicode escape control char",
		code: '{\n  "ctrl": "a\\u0001b\\u001fc"\n}',
		expected:
			'<span class="line">{</span>\n<span class="line"><span class="tk">  "ctrl"</span><span class="tu">:</span><span class="tx"> "a</span><span class="te">\\u0001</span><span class="tx">b</span><span class="te">\\u001f</span><span class="tx">c"</span></span>\n<span class="line">}</span>',
	},
	{
		name: "key with escape (compact)",
		code: '{"a\\nb":"v"}',
		expected:
			'<span class="line">{<span class="tk">"a</span><span class="te">\\n</span><span class="tk">b"</span><span class="tu">:</span><span class="tx">"v"</span>}</span>',
	},
	{
		name: "bare string",
		code: '"hi <there> & you"',
		expected: '<span class="line"><span class="tx">"hi &#x3C;there> &#x26; you"</span></span>',
	},
	{
		name: "bare number",
		code: "42",
		expected: '<span class="line"><span class="tn">42</span></span>',
	},
	{
		name: "bare bool",
		code: "true",
		expected: '<span class="line"><span class="tn">true</span></span>',
	},
	{
		name: "bare null",
		code: "null",
		expected: '<span class="line"><span class="tn">null</span></span>',
	},
	{
		name: "empty object pretty",
		code: "{}",
		expected: '<span class="line">{}</span>',
	},
	{
		name: "deeply nested",
		code: '{\n  "a": {\n    "b": {\n      "c": [\n        1,\n        {\n          "d": "e"\n        }\n      ]\n    }\n  }\n}',
		expected:
			'<span class="line">{</span>\n<span class="line"><span class="tk">  "a"</span><span class="tu">:</span> {</span>\n<span class="line"><span class="tk">    "b"</span><span class="tu">:</span> {</span>\n<span class="line"><span class="tk">      "c"</span><span class="tu">:</span> [</span>\n<span class="line"><span class="tn">        1</span><span class="tu">,</span></span>\n<span class="line">        {</span>\n<span class="line"><span class="tk">          "d"</span><span class="tu">:</span><span class="tx"> "e"</span></span>\n<span class="line">        }</span>\n<span class="line">      ]</span>\n<span class="line">    }</span>\n<span class="line">  }</span>\n<span class="line">}</span>',
	},
];

export { jsonHighlightFixtures };
export type { JsonHighlightFixture };
