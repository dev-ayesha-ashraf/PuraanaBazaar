import { createFileRoute } from "@tanstack/react-router";
import { AuthShell } from "./login";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — Purana Bazaar" }] }),
  component: () => <AuthShell mode="signup" />,
});
