import { CodeBlock, mantleCode } from "@ngrok/mantle/code-block";

/** JavaScript fold demo — AST strategy. */
export function FoldingJavaScriptDemo() {
	return (
		<CodeBlock.Root>
			<CodeBlock.Header>
				<CodeBlock.Icon preset="file" />
				<CodeBlock.Title>example.js</CodeBlock.Title>
			</CodeBlock.Header>
			<CodeBlock.Body>
				<CodeBlock.CopyButton />
				<CodeBlock.Code
					value={mantleCode("javascript")`
							const config = {
								name: "ngrok",
								listeners: [
									{
										addr: "localhost:8080",
										authtoken_from_env: true,
									},
									{
										addr: "localhost:9090",
										basic_auth: ["admin:secret"],
									},
								],
								on_error: (event) => {
									console.error(\`error: \${event.message}\`);
								},
							};
						`}
				/>
			</CodeBlock.Body>
		</CodeBlock.Root>
	);
}

/** TypeScript fold demo — AST strategy with type literals. */
export function FoldingTypeScriptDemo() {
	return (
		<CodeBlock.Root>
			<CodeBlock.Header>
				<CodeBlock.Icon preset="file" />
				<CodeBlock.Title>users.ts</CodeBlock.Title>
			</CodeBlock.Header>
			<CodeBlock.Body>
				<CodeBlock.CopyButton />
				<CodeBlock.Code
					value={mantleCode("typescript")`
							type User = {
								id: string;
								email: string;
								profile: {
									name: string;
									bio?: string;
								};
							};

							function findUser(users: User[], id: string): User | undefined {
								return users.find((user) => {
									if (user.id === id) {
										return true;
									}
									return false;
								});
							}
						`}
				/>
			</CodeBlock.Body>
		</CodeBlock.Root>
	);
}

/**
 * TSX fold demo — AST strategy folds blocks, objects, JSX elements,
 * multi-line opening tags, and self-closing tags with multi-line attribute
 * lists.
 */
export function FoldingTsxDemo() {
	return (
		<CodeBlock.Root>
			<CodeBlock.Header>
				<CodeBlock.Icon preset="file" />
				<CodeBlock.Title>profile.tsx</CodeBlock.Title>
			</CodeBlock.Header>
			<CodeBlock.Body>
				<CodeBlock.CopyButton />
				<CodeBlock.Code
					value={mantleCode("tsx")`
							export function Profile({ user }: { user: User }) {
								const initials = useMemo(() => {
									return user.name
										.split(" ")
										.map((part) => part[0])
										.join("");
								}, [user.name]);

								return (
									<article
										className="profile"
										aria-labelledby="profile-name"
										data-testid="profile-card"
									>
										<header>
											<h1 id="profile-name">{user.name}</h1>
											<p>{initials}</p>
										</header>
										<Avatar
											src={user.avatarUrl}
											alt={\`Avatar for \${user.name}\`}
											size="lg"
											fallback={initials}
										/>
									</article>
								);
							}
						`}
				/>
			</CodeBlock.Body>
		</CodeBlock.Root>
	);
}

/**
 * JSX fold demo — AST strategy folds blocks, objects, JSX elements,
 * multi-line opening tags, and self-closing tags with multi-line attribute
 * lists.
 */
export function FoldingJsxDemo() {
	return (
		<CodeBlock.Root>
			<CodeBlock.Header>
				<CodeBlock.Icon preset="file" />
				<CodeBlock.Title>card.jsx</CodeBlock.Title>
			</CodeBlock.Header>
			<CodeBlock.Body>
				<CodeBlock.CopyButton />
				<CodeBlock.Code
					value={mantleCode("jsx")`
							export function Card({ title, children }) {
								return (
									<section
										className="card"
										role="region"
										aria-label={title}
									>
										<header>
											<h2>{title}</h2>
										</header>
										<div className="card-body">
											{children}
										</div>
										<img
											src="/icons/star.svg"
											alt=""
											width={16}
											height={16}
										/>
									</section>
								);
							}
						`}
				/>
			</CodeBlock.Body>
		</CodeBlock.Root>
	);
}

/** JSON fold demo — raw-source strategy. */
export function FoldingJsonDemo() {
	return (
		<CodeBlock.Root>
			<CodeBlock.Header>
				<CodeBlock.Icon preset="file" />
				<CodeBlock.Title>package.json</CodeBlock.Title>
			</CodeBlock.Header>
			<CodeBlock.Body>
				<CodeBlock.CopyButton />
				<CodeBlock.Code
					value={mantleCode("json")`
							{
								"name": "@ngrok/mantle",
								"version": "1.0.0",
								"scripts": {
									"build": "tsdown",
									"test": "vitest run",
									"lint": "oxlint"
								},
								"dependencies": {
									"react": "18.3.1",
									"react-dom": "18.3.1"
								},
								"keywords": [
									"react",
									"design-system",
									"tailwind"
								]
							}
						`}
				/>
			</CodeBlock.Body>
		</CodeBlock.Root>
	);
}

/** CSS fold demo — raw-source strategy. */
export function FoldingCssDemo() {
	return (
		<CodeBlock.Root>
			<CodeBlock.Header>
				<CodeBlock.Icon preset="file" />
				<CodeBlock.Title>theme.css</CodeBlock.Title>
			</CodeBlock.Header>
			<CodeBlock.Body>
				<CodeBlock.CopyButton />
				<CodeBlock.Code
					value={mantleCode("css")`
							:root {
								--color-bg: #ffffff;
								--color-fg: #111111;
							}

							.button {
								padding: 0.5rem 1rem;
								border-radius: 0.25rem;
								background: var(--color-bg);

								&:hover {
									background: color-mix(in srgb, var(--color-bg), black 5%);
								}
							}

							@media (prefers-color-scheme: dark) {
								:root {
									--color-bg: #0a0a0a;
									--color-fg: #f5f5f5;
								}
							}
						`}
				/>
			</CodeBlock.Body>
		</CodeBlock.Root>
	);
}

/** Go fold demo — bracket-paired strategy. */
export function FoldingGoDemo() {
	return (
		<CodeBlock.Root>
			<CodeBlock.Header>
				<CodeBlock.Icon preset="file" />
				<CodeBlock.Title>server.go</CodeBlock.Title>
			</CodeBlock.Header>
			<CodeBlock.Body>
				<CodeBlock.CopyButton />
				<CodeBlock.Code
					value={mantleCode("go")`
							package main

							import (
								"fmt"
								"net/http"
							)

							type Server struct {
								Addr string
								mux  *http.ServeMux
							}

							func (s *Server) Start() error {
								s.mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
									fmt.Fprintln(w, "ok")
								})
								return http.ListenAndServe(s.Addr, s.mux)
							}
						`}
				/>
			</CodeBlock.Body>
		</CodeBlock.Root>
	);
}

/** Java fold demo — bracket-paired strategy. */
export function FoldingJavaDemo() {
	return (
		<CodeBlock.Root>
			<CodeBlock.Header>
				<CodeBlock.Icon preset="file" />
				<CodeBlock.Title>UserService.java</CodeBlock.Title>
			</CodeBlock.Header>
			<CodeBlock.Body>
				<CodeBlock.CopyButton />
				<CodeBlock.Code
					value={mantleCode("java")`
							package com.example;

							import java.util.Optional;

							public class UserService {
								private final UserRepository repository;

								public UserService(UserRepository repository) {
									this.repository = repository;
								}

								public Optional<User> findById(String id) {
									return repository.findAll().stream()
										.filter(user -> user.getId().equals(id))
										.findFirst();
								}
							}
						`}
				/>
			</CodeBlock.Body>
		</CodeBlock.Root>
	);
}

/** C# fold demo — bracket-paired strategy. */
export function FoldingCSharpDemo() {
	return (
		<CodeBlock.Root>
			<CodeBlock.Header>
				<CodeBlock.Icon preset="file" />
				<CodeBlock.Title>UserService.cs</CodeBlock.Title>
			</CodeBlock.Header>
			<CodeBlock.Body>
				<CodeBlock.CopyButton />
				<CodeBlock.Code
					value={mantleCode("csharp")`
							namespace Example
							{
								public class UserService
								{
									private readonly IUserRepository _repository;

									public UserService(IUserRepository repository)
									{
										_repository = repository;
									}

									public User? FindById(string id)
									{
										return _repository
											.GetAll()
											.FirstOrDefault(user => user.Id == id);
									}
								}
							}
						`}
				/>
			</CodeBlock.Body>
		</CodeBlock.Root>
	);
}

/** Rust fold demo — bracket-paired strategy. */
export function FoldingRustDemo() {
	return (
		<CodeBlock.Root>
			<CodeBlock.Header>
				<CodeBlock.Icon preset="file" />
				<CodeBlock.Title>main.rs</CodeBlock.Title>
			</CodeBlock.Header>
			<CodeBlock.Body>
				<CodeBlock.CopyButton />
				<CodeBlock.Code
					value={mantleCode("rust")`
							use std::collections::HashMap;

							struct Cache<V> {
								entries: HashMap<String, V>,
							}

							impl<V: Clone> Cache<V> {
								pub fn new() -> Self {
									Self {
										entries: HashMap::new(),
									}
								}

								pub fn get(&self, key: &str) -> Option<V> {
									self.entries.get(key).cloned()
								}
							}
						`}
				/>
			</CodeBlock.Body>
		</CodeBlock.Root>
	);
}

/** Ruby fold demo — bracket + keyword strategy. */
export function FoldingRubyDemo() {
	return (
		<CodeBlock.Root>
			<CodeBlock.Header>
				<CodeBlock.Icon preset="file" />
				<CodeBlock.Title>http_listener.rb</CodeBlock.Title>
			</CodeBlock.Header>
			<CodeBlock.Body>
				<CodeBlock.CopyButton />
				<CodeBlock.Code
					value={mantleCode("ruby")`
							require "thread"

							class HttpListener
								ALLOWED_HEADERS = [
									"X-Forwarded-For",
									"X-Forwarded-Proto",
									"X-Real-IP",
								].freeze

								def initialize(addr:, **options)
									@addr = addr
									@options = {
										compression: true,
										retries: 3,
										headers: ALLOWED_HEADERS,
									}.merge(options)
								end

								def start(configs)
									@workers = configs.map do |config|
										Thread.new { listen(config) }
									end
								end

								private

								def listen(config)
									puts "listening on #{config.fetch(:addr)}"
								end
							end
						`}
				/>
			</CodeBlock.Body>
		</CodeBlock.Root>
	);
}

/** Python fold demo — indentation-based strategy. */
export function FoldingPythonDemo() {
	return (
		<CodeBlock.Root>
			<CodeBlock.Header>
				<CodeBlock.Icon preset="file" />
				<CodeBlock.Title>cache.py</CodeBlock.Title>
			</CodeBlock.Header>
			<CodeBlock.Body>
				<CodeBlock.CopyButton />
				<CodeBlock.Code
					value={mantleCode("python")`
							class Cache:
								def __init__(self):
									self._entries = {}

								def get(self, key):
									if key in self._entries:
										return self._entries[key]
									return None

								def put(self, key, value):
									self._entries[key] = value


							def main():
								cache = Cache()
								cache.put("hello", "world")
								print(cache.get("hello"))
						`}
				/>
			</CodeBlock.Body>
		</CodeBlock.Root>
	);
}

/** YAML fold demo — indentation-based strategy. */
export function FoldingYamlDemo() {
	return (
		<CodeBlock.Root>
			<CodeBlock.Header>
				<CodeBlock.Icon preset="file" />
				<CodeBlock.Title>config.yaml</CodeBlock.Title>
			</CodeBlock.Header>
			<CodeBlock.Body>
				<CodeBlock.CopyButton />
				<CodeBlock.Code
					value={mantleCode("yaml")`
							server:
							  host: localhost
							  port: 8080
							  tls:
							    cert: /etc/ssl/server.crt
							    key: /etc/ssl/server.key
							clients:
							  - name: web
							    retries: 3
							    timeout: 5s
							  - name: mobile
							    retries: 1
							    timeout: 30s
							features:
							  streaming: true
							  compression: gzip
						`}
				/>
			</CodeBlock.Body>
		</CodeBlock.Root>
	);
}

/** HTML fold demo — parse5 AST strategy. */
export function FoldingHtmlDemo() {
	return (
		<CodeBlock.Root>
			<CodeBlock.Header>
				<CodeBlock.Icon preset="file" />
				<CodeBlock.Title>index.html</CodeBlock.Title>
			</CodeBlock.Header>
			<CodeBlock.Body>
				<CodeBlock.CopyButton />
				<CodeBlock.Code
					value={mantleCode("html")`
							<!doctype html>
							<html lang="en">
								<head>
									<meta charset="utf-8" />
									<title>ngrok</title>
								</head>
								<body>
									<header>
										<h1>Welcome</h1>
									</header>
									<main>
										<section>
											<p>Connect your local services to the internet.</p>
										</section>
									</main>
								</body>
							</html>
						`}
				/>
			</CodeBlock.Body>
		</CodeBlock.Root>
	);
}

/** XML fold demo — parse5-based strategy (foreign-content / XML mode). */
export function FoldingXmlDemo() {
	return (
		<CodeBlock.Root>
			<CodeBlock.Header>
				<CodeBlock.Icon preset="file" />
				<CodeBlock.Title>pom.xml</CodeBlock.Title>
			</CodeBlock.Header>
			<CodeBlock.Body>
				<CodeBlock.CopyButton />
				<CodeBlock.Code
					value={mantleCode("xml")`
							<?xml version="1.0" encoding="UTF-8"?>
							<project>
								<groupId>com.example</groupId>
								<artifactId>example</artifactId>
								<version>1.0.0</version>
								<dependencies>
									<dependency>
										<groupId>org.junit.jupiter</groupId>
										<artifactId>junit-jupiter</artifactId>
										<version>5.10.0</version>
										<scope>test</scope>
									</dependency>
								</dependencies>
							</project>
						`}
				/>
			</CodeBlock.Body>
		</CodeBlock.Root>
	);
}

/**
 * HTML multi-line opening tag fold demo — exercises parse5's `startTag`
 * span so the attribute list collapses into the tag name.
 */
export function FoldingHtmlMultilineTagDemo() {
	return (
		<CodeBlock.Root>
			<CodeBlock.Header>
				<CodeBlock.Icon preset="file" />
				<CodeBlock.Title>form.html</CodeBlock.Title>
			</CodeBlock.Header>
			<CodeBlock.Body>
				<CodeBlock.CopyButton />
				<CodeBlock.Code
					value={mantleCode("html")`
							<form
								action="/submit"
								method="post"
								enctype="multipart/form-data"
								novalidate
							>
								<input
									type="email"
									name="email"
									placeholder="you@example.com"
									required
								/>
								<button type="submit">Send</button>
							</form>
						`}
				/>
			</CodeBlock.Body>
		</CodeBlock.Root>
	);
}

/** Bash fold demo — keyword-paired strategy folds `if/fi`, `for/done`, brace groups. */
export function FoldingBashDemo() {
	return (
		<CodeBlock.Root>
			<CodeBlock.Header>
				<CodeBlock.Icon preset="cli" />
				<CodeBlock.Title>deploy.sh</CodeBlock.Title>
			</CodeBlock.Header>
			<CodeBlock.Body>
				<CodeBlock.CopyButton />
				<CodeBlock.Code
					value={mantleCode("bash")`
							#!/usr/bin/env bash
							set -euo pipefail

							deploy() {
								if [ -z "\${1:-}" ]; then
									echo "usage: deploy <env>" >&2
									return 1
								fi
								for region in us-east-1 eu-west-1; do
									echo "deploying to $region in $1"
								done
							}

							case "$1" in
								staging)
									deploy staging
									;;
								prod)
									deploy prod
									;;
							esac
						`}
				/>
			</CodeBlock.Body>
		</CodeBlock.Root>
	);
}
