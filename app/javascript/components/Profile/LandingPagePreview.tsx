import * as React from "react";

// Profile custom-HTML preview. Loads the same sandboxed landing endpoint a
// visitor sees at /:username/landing/embed, so the seller previews the exact
// sanitized + CSP-constrained output.
//
// Unlike the product LandingPagePreview, profiles have NO buy button, so there
// is no gumroad:checkout postMessage bridge and no ?wanted=true checkout URL
// building — this preview is display-only.
export const LandingPagePreview = ({ username }: { username: string }) => (
  <iframe
    title="Profile landing page preview"
    src={`/${encodeURIComponent(username)}/landing/embed`}
    sandbox="allow-scripts allow-forms"
    referrerPolicy="no-referrer"
    className="h-[75vh] min-h-150 w-full rounded border border-border bg-white"
  />
);
