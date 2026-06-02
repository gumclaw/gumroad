import * as React from "react";

// Loads the same /:username/landing/embed endpoint visitors see, rendered in
// the sandboxed iframe with the seller-scoped CSP set server-side. Unlike the
// product LandingPagePreview, profiles have no buy button, so there is no
// "gumroad:checkout" postMessage bridge and no ?wanted=true checkout URL
// building — the profile landing page is a pure marketing surface, so the
// preview is strictly display-only.
export const LandingPagePreview = ({ username }: { username: string }) => (
  <iframe
    title="Profile landing page preview"
    src={`/${encodeURIComponent(username)}/landing/embed`}
    sandbox="allow-scripts allow-forms"
    referrerPolicy="no-referrer"
    className="h-[75vh] min-h-150 w-full rounded border border-border bg-white"
  />
);
