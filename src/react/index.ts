export {
  createRouter,
  matchRoutes,
} from "../core";
export type {
  IndexRouteObject,
  NavigateOptions,
  NonIndexRouteObject,
  RouteMatch,
  RouteObject,
  Router,
  RouterLocation,
  RouterState,
} from "../core";

export { Link } from "./Link";
export type { LinkProps } from "./Link";
export { NavLink } from "./NavLink";
export type { NavLinkProps, NavLinkRenderProps } from "./NavLink";
export { Outlet } from "./Outlet";
export { RouterProvider } from "./RouterProvider";
export type { RouterProviderProps } from "./RouterProvider";
export { useLocation, useMatches, useNavigate, useParams, useSearchParams } from "./hooks";
export type { SetSearchParams } from "./hooks";
