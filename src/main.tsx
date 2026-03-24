import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry, sentryEnabled, Sentry } from "@/lib/sentry";

initSentry();

const root = createRoot(document.getElementById("root")!);

root.render(
  sentryEnabled ? (
    <Sentry.ErrorBoundary fallback={<div className="min-h-screen bg-background" />}>
      <App />
    </Sentry.ErrorBoundary>
  ) : (
    <App />
  ),
);
