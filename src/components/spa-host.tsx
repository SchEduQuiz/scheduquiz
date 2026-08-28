import { useEffect } from "react";

/**
 * Hosts the pre-built production bundle of the EduQuiz Vite/React app.
 *
 * The compiled assets live in `public/assets` (copied verbatim from the
 * shipped `dist/` output), so nothing has to be re-installed or re-compiled
 * to serve the app. We render the mount node, then load the built entry chunk
 * after hydration so the SPA's own root render is never discarded.
 */

const ENTRY_SCRIPT = "/assets/index-Wviw5V5-.js";
const ENTRY_STYLES = "/assets/index-CfaqcnAN.css";
const PRELOAD_CHUNKS = [
  "/assets/vendor-B1QZAsoL.js",
  "/assets/router-CN5hptJQ.js",
  "/assets/ui-DY79clDH.js",
  "/assets/supabase-C1mDbcUM.js",
];

export const spaHead = (
  title: string,
  description: string,
): {
  meta: Array<Record<string, string>>;
  links: Array<Record<string, string>>;
} => ({
  meta: [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "theme-color", content: "#000000" },
    { name: "apple-mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-title", content: "EduQuiz Platform" },
  ],
  links: [
    { rel: "stylesheet", href: ENTRY_STYLES },
    { rel: "manifest", href: "/manifest.json" },
    ...PRELOAD_CHUNKS.map((href) => ({ rel: "modulepreload", href })),
  ],
});

export function SpaMount() {
  useEffect(() => {
    if (document.querySelector(`script[data-eduquiz-entry]`)) return;
    const script = document.createElement("script");
    script.type = "module";
    script.src = ENTRY_SCRIPT;
    script.dataset["eduquizEntry"] = "true";
    document.body.appendChild(script);
  }, []);

  return <div id="root" suppressHydrationWarning />;
}
