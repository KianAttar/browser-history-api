import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { RouteMatch, RouteObject, Router, RouterState } from "../core";
import { Link, NavLink, Outlet, RouterProvider, useLocation, useNavigate, useParams } from "./index";

function fakeRouter(state: RouterState): Router {
  return {
    getState: () => state,
    subscribe: () => () => {},
    navigate: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    dispose: vi.fn(),
  };
}

function match(route: RouteObject, params: Record<string, string>, pathname: string): RouteMatch {
  return { route, params, pathname };
}

describe("RouterProvider / Outlet", () => {
  it("renders nested Outlets for a matched branch, passing params/location down", () => {
    function Layout() {
      return (
        <div>
          <span>layout</span>
          <Outlet />
        </div>
      );
    }
    function UserPage() {
      const params = useParams<{ id: string }>();
      const location = useLocation();
      return (
        <span>
          user:{params.id} at {location.pathname}
        </span>
      );
    }

    const router = fakeRouter({
      location: { pathname: "/users/42", search: "", hash: "" },
      matches: [
        match({ path: "", Component: Layout }, { id: "42" }, "/"),
        match({ path: "users/:id", Component: UserPage }, { id: "42" }, "/users/42"),
      ],
    });

    const html = renderToStaticMarkup(<RouterProvider router={router} />);
    expect(html).toContain("layout");
    expect(html).toContain("user:42 at /users/42");
  });

  it("renders nothing when no route matched", () => {
    const router = fakeRouter({ location: { pathname: "/nope", search: "", hash: "" }, matches: null });
    expect(renderToStaticMarkup(<RouterProvider router={router} />)).toBe("");
  });
});

describe("Link", () => {
  it("renders a plain <a href>, no click handler", () => {
    const html = renderToStaticMarkup(<Link to="/about">About</Link>);
    expect(html).toBe('<a href="/about">About</a>');
  });
});

describe("NavLink", () => {
  it("exposes isActive to function-valued className/children", () => {
    function Page() {
      return (
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : "idle")}>
          {({ isActive }) => (isActive ? "Here" : "Dashboard")}
        </NavLink>
      );
    }
    const router = fakeRouter({
      location: { pathname: "/dashboard", search: "", hash: "" },
      matches: [match({ path: "dashboard", Component: Page }, {}, "/dashboard")],
    });

    const html = renderToStaticMarkup(<RouterProvider router={router} />);
    expect(html).toContain('class="active"');
    expect(html).toContain(">Here<");
  });

  it("is inactive for an unrelated pathname", () => {
    function Page() {
      return <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : "idle")} />;
    }
    const router = fakeRouter({
      location: { pathname: "/other", search: "", hash: "" },
      matches: [match({ path: "other", Component: Page }, {}, "/other")],
    });

    expect(renderToStaticMarkup(<RouterProvider router={router} />)).toContain('class="idle"');
  });
});

describe("useNavigate", () => {
  it("forwards to router.navigate", () => {
    let navigate!: (to: string) => void;
    function Page() {
      navigate = useNavigate();
      return null;
    }
    const router = fakeRouter({
      location: { pathname: "/", search: "", hash: "" },
      matches: [match({ index: true, Component: Page }, {}, "/")],
    });

    renderToStaticMarkup(<RouterProvider router={router} />);
    navigate("/next");
    expect(router.navigate).toHaveBeenCalledWith("/next", undefined);
  });
});
