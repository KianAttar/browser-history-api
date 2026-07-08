import { RouterProvider } from "browser-history-api";
import { router } from "./router";

export function App() {
  return <RouterProvider router={router} />;
}
