import * as React from "react";

import { assertResponseError, request, ResponseError } from "$app/utils/request";

import { Button } from "$app/components/Button";
import { CopyToClipboard } from "$app/components/CopyToClipboard";
import { Modal } from "$app/components/Modal";
import { showAlert } from "$app/components/server-components/Alert";
import { Alert } from "$app/components/ui/Alert";
import { Details, DetailsToggle } from "$app/components/ui/Details";

import { LandingPagePreview } from "$app/components/Profile/LandingPagePreview";

// SPIKE for #5354 — demonstrates the proposed profile custom-HTML UX:
// a left control surface + a right live preview that mirrors the product
// Edit pattern (ProductPreview's `hasLandingPage ? <LandingPagePreview/> :
// defaultPreview` switch), rather than in-place WYSIWYG (impossible across
// the sandboxed iframe boundary).
//
// `defaultPreview` is the existing profile render (current WYSIWYG sections),
// passed in unchanged so a seller on normal sections sees zero difference.

type PreviewMode = "default" | "landing";

type Props = {
  username: string;
  // Live custom_html, or null when the profile is on default sections.
  customHtml: string | null;
  // The existing profile section editor/preview, rendered as the "Default" mode.
  defaultPreview: React.ReactNode;
  customHtmlPagesEnabled: boolean;
  onReset: () => void;
};

export const ProfileLandingPageEditor = ({
  username,
  customHtml,
  defaultPreview,
  customHtmlPagesEnabled,
  onReset,
}: Props) => {
  const hasLandingPage = !!customHtml?.trim();
  const [mode, setMode] = React.useState<PreviewMode>(hasLandingPage ? "landing" : "default");
  const [isRemoveOpen, setIsRemoveOpen] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);

  if (!customHtmlPagesEnabled) return defaultPreview;

  // Profiles have no buy button, so the agent prompt drops the entire
  // data-gumroad-action / checkout contract the product prompt carries.
  const agentPrompt = `Build and publish a custom landing page for my Gumroad profile (@${username}).

Design a unique, on-brand page that introduces me and my work — fully responsive, accessible, light and dark mode. Save it as one self-contained file, landing.html. The page is sanitized and runs sandboxed: inline CSS/JS (animations, scroll effects, modals) and a Tailwind CDN work. For images use only data: URIs or CSS — external image/media hosts are blocked, and the page can't fetch external URLs or read the visitor's account.

This page REPLACES your default profile page (your bio + product sections). It's a marketing/landing surface — there is no checkout or buy button on a profile, so you don't need any buy elements. Link out to your product pages with normal <a href> links.

Then preview, publish, and verify with the Gumroad CLI:
- Sanitize without publishing and read what changed: gumroad profile page preview ./landing.html --json — inspect .sanitization_report.
- Publish once preview is clean: gumroad profile page publish ./landing.html --json
- Confirm it's live: gumroad profile page url --json --jq '.profile.landing_url'
- Restore your default profile: gumroad profile page clear --yes --json`;

  const reset = async () => {
    setIsRemoving(true);
    try {
      const response = await request({
        method: "POST",
        accept: "json",
        url: Routes.settings_profile_path(),
        data: { custom_html: null },
      });
      const json: { success?: boolean; message?: string } = await response.json();
      if (!response.ok || json.success === false) throw new ResponseError(json.message);

      setIsRemoveOpen(false);
      setMode("default");
      onReset();
      showAlert("Landing page removed.", "success");
    } catch (e) {
      assertResponseError(e);
      showAlert(e.message, "error");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr] lg:items-start">
      {/* LEFT: control surface */}
      <section className="grid gap-6">
        <header className="flex items-center justify-between">
          <h2>Landing page</h2>
          <a href="/api#custom-html" target="_blank" rel="noreferrer">
            Learn more
          </a>
        </header>

        {/* The 4-way control from the issue checklist. */}
        <div role="tablist" aria-label="Profile preview mode" className="flex flex-wrap gap-2">
          <Button
            role="tab"
            aria-selected={mode === "default"}
            color={mode === "default" ? "primary" : undefined}
            onClick={() => setMode("default")}
          >
            Default
          </Button>
          <Button
            role="tab"
            aria-selected={mode === "landing"}
            color={mode === "landing" ? "primary" : undefined}
            disabled={!hasLandingPage}
            onClick={() => setMode("landing")}
          >
            Landing{hasLandingPage ? " (live)" : ""}
          </Button>
        </div>

        {hasLandingPage ? (
          <Alert role="status" variant="success">
            A custom landing page is live on your profile.
          </Alert>
        ) : null}

        <div className="grid gap-2">
          <p>
            Replace your default profile with a custom landing page. Copy the prompt and hand it to your AI agent
            (Claude, Cursor, etc.) — it builds and publishes the page for you.
          </p>
          <p className="text-sm text-muted">
            For safety, your landing page is sandboxed: animations and interactive effects work, but it can't reach your
            Gumroad account or send data to other sites.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <CopyToClipboard text={agentPrompt} tooltipPosition="top">
            <Button color="primary">Build with your agent</Button>
          </CopyToClipboard>
          {hasLandingPage ? <Button onClick={() => setIsRemoveOpen(true)}>Reset to default</Button> : null}
        </div>

        <Details>
          <DetailsToggle>Show prompt</DetailsToggle>
          <pre className="rounded border border-border bg-background p-4 text-sm whitespace-pre-wrap">{agentPrompt}</pre>
        </Details>
      </section>

      {/* RIGHT: live preview — swaps on the toggle, mirroring ProductPreview. */}
      <div className="min-w-0">
        {mode === "landing" && hasLandingPage ? <LandingPagePreview username={username} /> : defaultPreview}
      </div>

      {isRemoveOpen ? (
        <Modal
          open
          allowClose={!isRemoving}
          onClose={() => setIsRemoveOpen(false)}
          title="Reset to default profile?"
          footer={
            <>
              <Button disabled={isRemoving} onClick={() => setIsRemoveOpen(false)}>
                Cancel
              </Button>
              <Button color="danger" disabled={isRemoving} onClick={() => void reset()}>
                {isRemoving ? "Resetting..." : "Reset"}
              </Button>
            </>
          }
        >
          This removes your live landing page, so visitors will see your default profile again. You can't undo it — if
          you might want the page back, save its HTML first.
        </Modal>
      ) : null}
    </div>
  );
};
