import { NavLink, Outlet, useLocation } from "browser-history-api";

const linkStyle = ({ isActive }: { isActive: boolean }) => (isActive ? "nav-link active" : "nav-link");

export function Layout() {
  const location = useLocation();

  return (
    <div className="app">
      <header>
        <h1>browser-history-api demo</h1>
        <nav>
          <NavLink to="/" end className={linkStyle}>
            Home
          </NavLink>
          <NavLink to="/about" className={linkStyle}>
            About
          </NavLink>
          <NavLink to="/users" className={linkStyle}>
            Users
          </NavLink>
          <NavLink to="/files/a/b/c" className={linkStyle}>
            Files (splat)
          </NavLink>
          <NavLink to="/nowhere" className={linkStyle}>
            404 demo
          </NavLink>
        </nav>
      </header>

      <main>
        <Outlet />
      </main>

      <footer>
        <code>
          location: {location.pathname}
          {location.search}
          {location.hash}
        </code>
      </footer>
    </div>
  );
}
