import { describe, expect, it } from "vitest";
import { matchRoutes } from "./match";
import type { RouteObject } from "./types";

describe("matchRoutes", () => {
  it("matches a static path", () => {
    const routes: RouteObject[] = [{ path: "about" }];

    const matches = matchRoutes(routes, "/about");

    expect(matches).toHaveLength(1);
    expect(matches![0]!.pathname).toBe("/about");
    expect(matches![0]!.params).toEqual({});
  });

  it("matches nested paths and returns the full root-to-leaf branch", () => {
    const routes: RouteObject[] = [
      {
        path: "dashboard",
        children: [{ path: "settings" }],
      },
    ];

    const matches = matchRoutes(routes, "/dashboard/settings");

    expect(matches).toHaveLength(2);
    expect(matches![0]!.pathname).toBe("/dashboard");
    expect(matches![1]!.pathname).toBe("/dashboard/settings");
  });

  it("matches through a pathless layout route without consuming a segment", () => {
    const routes: RouteObject[] = [
      {
        children: [{ path: "about" }],
      },
    ];

    const matches = matchRoutes(routes, "/about");

    expect(matches).toHaveLength(2);
    expect(matches![0]!.pathname).toBe("/");
    expect(matches![1]!.pathname).toBe("/about");
  });

  it("captures dynamic params", () => {
    const routes: RouteObject[] = [{ path: "users/:id" }];

    const matches = matchRoutes(routes, "/users/42");

    expect(matches![0]!.params).toEqual({ id: "42" });
    expect(matches![0]!.pathname).toBe("/users/42");
  });

  it("captures a splat as the remaining path", () => {
    const routes: RouteObject[] = [{ path: "files/*" }];

    const matches = matchRoutes(routes, "/files/a/b/c");

    expect(matches![0]!.params).toEqual({ "*": "a/b/c" });
    expect(matches![0]!.pathname).toBe("/files/a/b/c");
  });

  it("matches an index route at its parent's exact path", () => {
    const routes: RouteObject[] = [
      {
        path: "dashboard",
        children: [{ index: true }, { path: "settings" }],
      },
    ];

    const matches = matchRoutes(routes, "/dashboard");

    expect(matches).toHaveLength(2);
    expect(matches![1]!.route.index).toBe(true);
    expect(matches![1]!.pathname).toBe("/dashboard");
  });

  it("returns null when no route matches", () => {
    const routes: RouteObject[] = [{ path: "about" }];

    expect(matchRoutes(routes, "/contact")).toBeNull();
  });

  it("returns null when the pattern is only a prefix of the pathname", () => {
    const routes: RouteObject[] = [{ path: "about" }];

    expect(matchRoutes(routes, "/about/us")).toBeNull();
  });

  it("ranks a static sibling above a dynamic one for the same pathname", () => {
    const routes: RouteObject[] = [{ path: "users/new" }, { path: "users/:id" }];

    const staticMatch = matchRoutes(routes, "/users/new");
    expect(staticMatch![0]!.route.path).toBe("users/new");

    const dynamicMatch = matchRoutes(routes, "/users/42");
    expect(dynamicMatch![0]!.route.path).toBe("users/:id");
    expect(dynamicMatch![0]!.params).toEqual({ id: "42" });
  });

  it("ranks a dynamic sibling above a splat for the same pathname", () => {
    const routes: RouteObject[] = [{ path: "users/*" }, { path: "users/:id" }];

    const matches = matchRoutes(routes, "/users/42");

    expect(matches![0]!.route.path).toBe("users/:id");
  });

  it("normalizes leading/trailing slashes", () => {
    const routes: RouteObject[] = [{ path: "about" }];

    expect(matchRoutes(routes, "/about/")).not.toBeNull();
    expect(matchRoutes(routes, "about")).not.toBeNull();
  });

  it("matches the root path", () => {
    const routes: RouteObject[] = [{ index: true }];

    const matches = matchRoutes(routes, "/");

    expect(matches).toHaveLength(1);
    expect(matches![0]!.pathname).toBe("/");
  });
});
