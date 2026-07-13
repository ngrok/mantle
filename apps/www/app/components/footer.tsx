import type { ComponentProps } from "react";

import { cx } from "@ngrok/mantle/cx";
import { Icon } from "@ngrok/mantle/icon";
import { NgrokWordmarkIcon } from "@ngrok/mantle/icons";
import { Popover } from "@ngrok/mantle/popover";
import { ThemeSwitcher } from "@ngrok/mantle/theme-switcher";
import { CaretDownIcon, RssSimpleIcon, XLogoIcon, YoutubeLogoIcon } from "@phosphor-icons/react";
import { BlueskyIcon } from "./icons/bluesky";
import { GitHubIcon } from "./icons/github";
import { LinkedInIcon } from "./icons/linkedin";

import { DocsLink } from "./docs-link";
import {
	getConfigForStatusIndicatorLevel,
	useStatusPageStatus,
	type StatusIndicator,
	type StatusIndicatorLevel,
} from "./use-status-page";

type Props = Omit<ComponentProps<"footer">, "children">;

/**
 * Footer for the whole docs page
 */
export function PrimaryFooter({ className, ...props }: Props) {
	return (
		<footer className={cx("py-12 sm:py-20 px-4 flex justify-center", className)} {...props}>
			<div className="flex w-full max-w-270 flex-col items-center">
				<div className="grid w-full max-w-2xl grid-cols-2 gap-6 gap-y-12 font-mono text-[0.8125rem] min-[70.625rem]:max-w-none min-[70.625rem]:grid-cols-5">
					{/* Product Column */}
					<div className="flex flex-col gap-3">
						<h3 className="text-strong leading-none font-semibold tracking-wider uppercase">
							Product
						</h3>
						<div className="flex flex-col gap-2">
							<DocsLink
								href="https://ngrok.com/docs/universal-gateway/overview"
								className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								Universal Gateway
							</DocsLink>
							<a
								href="https://ngrok.ai"
								className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								AI Gateway
							</a>
							<DocsLink
								href="https://ngrok.com/docs/traffic-policy"
								className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								Traffic Policy
							</DocsLink>
							<DocsLink
								href="https://ngrok.com/docs/agent/overview"
								className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								Secure Tunnels
							</DocsLink>
							<DocsLink
								href="https://ngrok.com/docs/obs"
								className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								Traffic Observability
							</DocsLink>
							<DocsLink
								href="https://ngrok.com/docs/k8s"
								className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								Kubernetes Operator
							</DocsLink>
						</div>
					</div>

					{/* Problems we Solve Column */}
					<div className="flex flex-col gap-3">
						<h3 className="text-strong leading-none font-semibold tracking-wider uppercase">
							Problems We Solve
						</h3>
						<div className="flex flex-col gap-2">
							<Popover.Root>
								<Popover.Trigger asChild>
									<button
										className="text-muted hover:text-strong flex items-center gap-1 text-left font-mono text-[0.8125rem] leading-[1.5em] font-medium"
										type="button"
									>
										Delivery
										<Icon className="size-3" svg={<CaretDownIcon weight="bold" />} />
									</button>
								</Popover.Trigger>
								<Popover.Content className="grid grid-cols-1 gap-2 p-3">
									<DocsLink
										href="https://ngrok.com/docs/guides/api-gateway/get-started"
										className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
									>
										API gateway
									</DocsLink>
									<a
										href="https://ngrok.ai/"
										className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
									>
										AI gateway
									</a>
									<DocsLink
										href="https://ngrok.com/docs/universal-gateway/examples/webhook-gateway"
										className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
									>
										Webhook gateway
									</DocsLink>
									<DocsLink
										href="https://ngrok.com/docs/universal-gateway/examples/ephemeral-workloads"
										className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
									>
										Ephemeral workloads
									</DocsLink>
								</Popover.Content>
							</Popover.Root>
							<Popover.Root>
								<Popover.Trigger asChild>
									<button
										className="text-muted hover:text-strong flex items-center gap-1 text-left font-mono text-[0.8125rem] leading-[1.5em] font-medium"
										type="button"
									>
										Connectivity
										<Icon className="size-3" svg={<CaretDownIcon weight="bold" />} />
									</button>
								</Popover.Trigger>
								<Popover.Content className="grid grid-cols-1 gap-2 p-3">
									<a
										href="https://ngrok.com/use-cases/site-to-site-connectivity"
										className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
									>
										Site-to-site connectivity
									</a>
									<DocsLink
										href="https://ngrok.com/docs/guides/device-gateway/agent"
										className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
									>
										Device gateway
									</DocsLink>
									<DocsLink
										href="https://ngrok.com/docs/guides/ssh-rdp"
										className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
									>
										Remote access
									</DocsLink>
								</Popover.Content>
							</Popover.Root>
							<Popover.Root>
								<Popover.Trigger asChild>
									<button
										className="text-muted hover:text-strong flex items-center gap-1 text-left font-mono text-[0.8125rem] leading-[1.5em] font-medium"
										type="button"
									>
										Development
										<Icon className="size-3" svg={<CaretDownIcon weight="bold" />} />
									</button>
								</Popover.Trigger>
								<Popover.Content className="grid grid-cols-1 gap-2 p-3">
									<a
										href="https://ngrok.com/use-cases/developer-preview"
										className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
									>
										Share localhost
									</a>
									<DocsLink
										href="https://ngrok.com/docs/using-ngrok-with/using-mcp"
										className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
									>
										Connect MCPs to AI providers
									</DocsLink>
									<a
										href="https://ngrok.com/use-cases/webhook-testing"
										className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
									>
										Test webhooks
									</a>
									<DocsLink
										href="https://ngrok.com/docs/k8s/guides/local-projection"
										className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
									>
										Access remote K8s clusters from dev
									</DocsLink>
								</Popover.Content>
							</Popover.Root>
							<DocsLink
								href="https://ngrok.com/docs/universal-gateway/examples/minecraft"
								className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								Minecraft
							</DocsLink>
						</div>
					</div>

					{/* Resources Column */}
					<div className="flex flex-col gap-3">
						<h3 className="text-strong leading-none font-semibold tracking-wider uppercase">
							Resources
						</h3>
						<div className="flex flex-col gap-2">
							<DocsLink
								href="https://ngrok.com/docs/start"
								className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								Docs
							</DocsLink>
							<DocsLink
								href="https://ngrok.com/docs/guides"
								className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								Guides
							</DocsLink>
							<a
								href="https://ngrok.com/pricing"
								className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								Pricing
							</a>
							<a
								href="https://ngrok.com/download"
								className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								Download
							</a>
							<a
								href="https://ngrok.com/security"
								className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								Security
							</a>
							<a
								href="https://trust.ngrok.com/"
								className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								Trust
							</a>
							<a
								href="https://ngrok.com/customers"
								className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								Case studies
							</a>
							<DocsLink
								href="https://ngrok.com/docs/integrations"
								className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								Integrations
							</DocsLink>
							<a
								href="https://ngrok.com/support"
								className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								Support
							</a>
							<a
								href="https://ngrok.com/abuse"
								className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								Abuse
							</a>
							<a
								href="https://status.ngrok.com/"
								className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								Status
							</a>
						</div>
					</div>

					{/* Company Column */}
					<div className="flex flex-col gap-3">
						<h3 className="text-strong leading-none font-semibold tracking-wider uppercase">
							Company
						</h3>
						<div className="flex flex-col gap-2">
							<a
								href="https://ngrok.com/about"
								className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								About
							</a>
							<a
								href="https://ngrok.com/contact"
								className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								Contact
							</a>
							<a
								href="https://ngrok.com/blog"
								className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								Blog
							</a>
							<a
								href="https://ngrok.com/newsletter"
								className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								Newsletter
							</a>
							<a
								href="https://ngrok.com/press"
								className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								Press
							</a>
							<a
								href="https://ngrok.com/brand"
								className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								Brand
							</a>
							<a
								href="https://ngrok.com/careers"
								className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								Careers
							</a>
							<Popover.Root>
								<Popover.Trigger asChild>
									<button
										className="text-muted hover:text-strong flex items-center gap-1 text-left font-mono text-[0.8125rem] leading-[1.5em] font-medium"
										type="button"
									>
										Legal
										<Icon className="size-3" svg={<CaretDownIcon weight="bold" />} />
									</button>
								</Popover.Trigger>
								<Popover.Content className="grid grid-cols-1 gap-2 p-3">
									<a
										href="https://ngrok.com/tos"
										className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
									>
										Terms of service
									</a>
									<a
										href="https://ngrok.com/privacy"
										className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
									>
										Privacy policy
									</a>
									<a
										href="https://ngrok.com/privacy-preferences"
										className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
									>
										Privacy preferences
									</a>
									<a
										href="https://ngrok.com/dpa"
										className="text-muted hover:text-strong font-mono text-[0.8125rem] leading-[1.5em] font-medium"
									>
										DPA
									</a>
								</Popover.Content>
							</Popover.Root>
						</div>
					</div>

					{/* Social Column */}
					<div className="flex flex-col gap-3">
						<h3 className="text-strong leading-none font-semibold tracking-wider uppercase">
							Social
						</h3>
						<div className="flex flex-row gap-2 min-[70.625rem]:flex-col">
							<a
								href="https://github.com/ngrok"
								className="text-muted hover:text-strong flex items-center gap-1 font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								<Icon svg={<GitHubIcon />} />
								<span className="hidden min-[70.625rem]:block">GitHub</span>
							</a>
							<a
								href="https://x.com/ngrokHQ"
								className="text-muted hover:text-strong flex items-center gap-1 font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								<Icon svg={<XLogoIcon />} />
								<span className="hidden min-[70.625rem]:block">X</span>
							</a>
							<a
								href="https://bsky.app/profile/ngrok.com"
								className="text-muted hover:text-strong flex items-center gap-1 font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								<Icon svg={<BlueskyIcon />} />
								<span className="hidden min-[70.625rem]:block">Bluesky</span>
							</a>
							<a
								href="https://www.linkedin.com/company/ngrok/"
								className="text-muted hover:text-strong flex items-center gap-1 font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								<Icon svg={<LinkedInIcon />} />
								<span className="hidden min-[70.625rem]:block">LinkedIn</span>
							</a>
							<a
								href="https://www.youtube.com/@ngrokHQ"
								className="text-muted hover:text-strong flex items-center gap-1 font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								<Icon svg={<YoutubeLogoIcon weight="fill" />} />
								<span className="hidden min-[70.625rem]:block">YouTube</span>
							</a>
							<a
								href="https://ngrok.com/blog/rss.xml"
								className="text-muted hover:text-strong flex items-center gap-1 font-mono text-[0.8125rem] leading-[1.5em] font-medium"
							>
								<Icon svg={<RssSimpleIcon weight="bold" />} />
								<span className="hidden min-[70.625rem]:block">RSS</span>
							</a>
						</div>
					</div>
				</div>

				<div className="flex w-full flex-col items-end justify-between gap-6 sm:flex-row">
					<div className="order-last -mt-4 self-start sm:order-first sm:mt-0 sm:self-auto">
						<ThemeSwitcher
							contentProps={{ className: "shadow-2xl", collisionPadding: { right: 16 } }}
						/>
					</div>
					<div className="relative ml-auto max-w-full">
						<NgrokWordmarkIcon
							width="504"
							height="187"
							className="h-auto w-full max-w-126 text-neutral-200"
						/>
						<StatusIndicator />
					</div>
				</div>
			</div>
		</footer>
	);
}

type StatusIndicatorProps = Omit<ComponentProps<"a">, "children" | "href">;

/**
 * Live status indicator using React Query to fetch from the status page API
 */
function StatusIndicator({ className, ...props }: StatusIndicatorProps) {
	const statusQuery = useStatusPageStatus();

	// fall back to "we're fine" if loading or error
	if (statusQuery.status === "pending" || statusQuery.status === "error") {
		return (
			<StatusIndicatorAnchor className={className} {...props}>
				<StatusIndicatorContent level="none" />
			</StatusIndicatorAnchor>
		);
	}

	const data = statusQuery.data;
	const level = data.status.indicator;
	const config = getConfigForStatusIndicatorLevel(level);

	return (
		<StatusIndicatorAnchor className={cx(config.color, config.hoverColor, className)}>
			<StatusIndicatorContent level={level} />
		</StatusIndicatorAnchor>
	);
}

type StatusIndicatorAnchorProps = Omit<ComponentProps<"a">, "href">;

function StatusIndicatorAnchor({ className, children, ...props }: StatusIndicatorAnchorProps) {
	return (
		<a
			href="https://status.ngrok.com/"
			className={cx(
				"2xs:absolute 2xs:left-[44.5%] 2xs:justify-start 2xs:pt-0 2xs:pl-0 bottom-[7%] flex items-center gap-2 pt-4 pl-1.5 font-mono text-xs text-emerald-600 hover:text-emerald-700 min-[27rem]:left-[44.8%] min-[27rem]:text-sm",
				className,
			)}
			{...props}
		>
			{children}
		</a>
	);
}

type StatusIndicatorContentProps = { level: StatusIndicatorLevel };

function StatusIndicatorContent({ level }: StatusIndicatorContentProps) {
	const config = getConfigForStatusIndicatorLevel(level);

	return (
		<>
			<span className="relative flex size-2">
				{config.animatePulse && (
					<span
						className={cx(
							"absolute inline-flex size-full animate-ping rounded-full",
							config.bgColor,
							"opacity-75",
						)}
					/>
				)}
				<span className={cx("relative inline-flex size-2 rounded-full", config.bgColor)} />
			</span>
			{config.description}
		</>
	);
}
