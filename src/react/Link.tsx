import { createElement, forwardRef, type AnchorHTMLAttributes } from "react";

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  to: string;
}

/**
 * Just an `<a href>` — no click handler. Once a router exists, the adapter's
 * single `navigate` listener already intercepts same-origin link clicks
 * (see `03-navigate-event-and-interception.md`), so there's nothing to hijack here.
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ to, ...rest }, ref) {
  return createElement("a", { ...rest, href: to, ref });
});
