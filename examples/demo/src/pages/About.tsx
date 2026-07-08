import { useNavigate } from "browser-history-api";

export function About() {
  const navigate = useNavigate();

  return (
    <section>
      <h2>About</h2>
      <p>This page demonstrates programmatic navigation via useNavigate().</p>
      <button onClick={() => navigate("/")}>navigate("/")</button>{" "}
      <button onClick={() => navigate("/users/7", { replace: true })}>
        navigate("/users/7", {"{"} replace: true {"}"})
      </button>
    </section>
  );
}
