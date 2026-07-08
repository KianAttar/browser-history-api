import { createElement, forwardRef, type CSSProperties, type ReactNode } from "react";
import { useLocation } from "./hooks";
import { Link, type LinkProps } from "./Link";

export interface NavLinkRenderProps {
  isActive: boolean;
}

export interface NavLinkProps extends Omit<LinkProps, "className" | "style" | "children"> {
  /** Require an exact (not prefix) match against `to` before treating the link as active. */
  end?: boolean;
  className?: string | ((props: NavLinkRenderProps) => string | undefined);
  style?: CSSProperties | ((props: NavLinkRenderProps) => CSSProperties | undefined);
  children?: ReactNode | ((props: NavLinkRenderProps) => ReactNode);
}

function stripQueryAndHash(path: string): string {
  return path.split("?")[0]!.split("#")[0]!;
}

function isActivePath(pathname: string, to: string, end: boolean | undefined): boolean {
  const toPathname = stripQueryAndHash(to);
  if (pathname === toPathname) return true;
  return !end && pathname.startsWith(toPathname.endsWith("/") ? toPathname : `${toPathname}/`);
}

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { to, end, className, style, children, ...rest },
  ref
) {
  const { pathname } = useLocation();
  const isActive = isActivePath(pathname, to, end);
  const renderProps: NavLinkRenderProps = { isActive };

  return createElement(Link, {
    ...rest,
    to,
    ref,
    className: typeof className === "function" ? className(renderProps) : className,
    style: typeof style === "function" ? style(renderProps) : style,
    children: typeof children === "function" ? children(renderProps) : children,
  });
});
