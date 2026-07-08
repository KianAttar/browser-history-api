import { createRouter, type RouteObject } from "browser-history-api";
import { Layout } from "./pages/Layout";
import { Home } from "./pages/Home";
import { About } from "./pages/About";
import { UsersList } from "./pages/UsersList";
import { UserDetail } from "./pages/UserDetail";
import { Files } from "./pages/Files";
import { NotFound } from "./pages/NotFound";

const routes: RouteObject[] = [
  {
    path: "",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "about", Component: About },
      {
        path: "users",
        children: [
          { index: true, Component: UsersList },
          { path: ":id", Component: UserDetail },
        ],
      },
      { path: "files/*", Component: Files },
      { path: "*", Component: NotFound },
    ],
  },
];

export const router = createRouter(routes);
