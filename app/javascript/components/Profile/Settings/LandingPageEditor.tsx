import * as React from "react";

import { assertResponseError, request, ResponseError } from "$app/utils/request";

import { Button } from "$app/components/Button";
import { CopyToClipboard } from "$app/components/CopyToClipboard";
import { Modal } from "$app/components/Modal";
import { showAlert } from "$app/components/server-components/Alert";
import { Alert } from "$app/components/ui/Alert";
import { Details, DetailsToggle } from "$app/components/ui/Details";

// Profile-side counterpart to ProductEdit/ShareTab/LandingPageEditor. Same
// control surface (copy-prompt / live status / reset modal), but the agent
// prompt drops every buy-button instruction -- a profile landing page has no
// checkout, so there are no data-gumroad-action / option / price / recurrence
// attributes and no "unpurchasable" warning. It's a pure marketing surface.
export const LandingPageEditor = ({
  username,
  profileUrl,
  hasLandingPage,
  onRemoved,
}: {
  username: string;
  profileUrl: string;
  hasLandingPage: boolean;
  onRemoved: () => void;
}) => {
  const [isRemoveOpen, setIsRemoveOpen] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);

  const agentPrompt = `Build and publish a custom landing page for my Gumroad profile (@${username}).

Design a unique, on-brand page that introduces me and my work -- fully responsive, accessible, and supporting light and dark mode. Save it as one self-contained file, profile.html. The page is sanitized and runs sandboxed: inline CSS/JS (animations, scroll effects, modals) and a Tailwind CDN work. For images and media, use only inline data: URIs or CSS -- external image/media hosts are blocked, and the page can't fetch external URLs or read the visitor's account.

NOTE: a profile landing page REPLACES your default profile page (your sections, bio, and products grid). Unlike a product page it has NO buy button or checkout -- it's a marketing surface, so link out to your individual product pages (gumroad.com/l/...) if you want visitors to purchase.

Publish it with the Gumroad CLI:
- Preview the local request without publishing: gumroad profile update --custom-html ./profile.html --dry-run --json --no-input --non-interactive
- Publish (or update) the page: gumroad profile update --custom-html ./profile.html --json --no-input --non-interactive
- Inspect .result.sanitization_report in the publish response; if Gumroad removed tags or attributes, edit and publish again.
- Remove the landing page and restore your default profile: gumroad profile update --custom-html '' --json --no-input --non-interactive

If the gumroad CLI isn't installed: brew install antiwork/cli/gumroad (or curl -fsSL https://gumroad.com/install-cli.sh | bash), then run gumroad auth login.`;

  const removeLandingPage = async () => {
    setIsRemoving(true);
    try {
      const response = await request({
        method: "PUT",
        accept: "json",
        url: Routes.settings_profile_path(),
        data: { user: { custom_html: null } },
      });
      const json: { success?: boolean; message?: string; error_message?: string } = await response.json();
      if (!response.ok || json.success === false) throw new ResponseError(json.message ?? json.error_message);

      setIsRemoveOpen(false);
      onRemoved();
      showAlert("Landing page removed.", "success");
    } catch (e) {
      assertResponseError(e);
      showAlert(e.message, "error");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <section className="grid gap-8 border-t border-border p-4 md:p-8">
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2>Landing page</h2>
        <a href="/api#custom-html" target="_blank" rel="noreferrer">
          Learn more
        </a>
      </header>
      {hasLandingPage ? (
        <Alert role="status" variant="success">
          <div className="flex flex-col justify-between sm:flex-row">
            A custom landing page is live on your profile.
            <a href={profileUrl} target="_blank" rel="noreferrer">
              View
            </a>
          </div>
        </Alert>
      ) : null}
      <div className="grid gap-2">
        <p>
          Replace your default profile page with a custom landing page. Copy the prompt and hand it to your AI agent
          (Claude, Cursor, etc.) -- it builds and publishes the page for you.
        </p>
        <p className="text-sm text-muted">
          For safety, your landing page is sandboxed: animations and interactive effects work, but it can't reach your
          Gumroad account or send data to other sites.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <CopyToClipboard text={agentPrompt} tooltipPosition="top">
          <Button color="primary">Copy prompt</Button>
        </CopyToClipboard>
        {hasLandingPage ? <Button onClick={() => setIsRemoveOpen(true)}>Remove landing page</Button> : null}
      </div>
      <Details>
        <DetailsToggle>Show prompt</DetailsToggle>
        <pre className="rounded border border-border bg-background p-4 text-sm whitespace-pre-wrap">{agentPrompt}</pre>
      </Details>
      {isRemoveOpen ? (
        <Modal
          open
          allowClose={!isRemoving}
          onClose={() => setIsRemoveOpen(false)}
          title="Remove landing page?"
          footer={
            <>
              <Button disabled={isRemoving} onClick={() => setIsRemoveOpen(false)}>
                Cancel
              </Button>
              <Button color="danger" disabled={isRemoving} onClick={() => void removeLandingPage()}>
                {isRemoving ? "Removing..." : "Remove"}
              </Button>
            </>
          }
        >
          This removes your live landing page, so visitors will see your default profile page again. You can't undo it --
          if you might want the page back, save its HTML first.
        </Modal>
      ) : null}
    </section>
  );
};
