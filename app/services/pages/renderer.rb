# frozen_string_literal: true

# Shared builder for the sandboxed custom-HTML iframe document. Mirrors the
# document/CSP that LinksController uses for product landing pages so profiles
# render through the identical security model (opaque-origin sandbox, strict
# seller-scoped CSP, inlined Tailwind). The product controller keeps its own
# copy for the buy-button flow; this is the buy-free surface profiles share.
class Pages::Renderer
  PAGE_ASSET_HOSTS = [CDN_S3_PROXY_HOST, PUBLIC_STORAGE_CDN_S3_PROXY_HOST].compact.uniq.join(" ")

  CUSTOM_HTML_CSP = [
    "sandbox allow-scripts allow-forms",
    "default-src 'none'",
    "script-src 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://unpkg.com",
    "style-src 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com https://fonts.bunny.net",
    "img-src data: blob: #{PAGE_ASSET_HOSTS}",
    "media-src data: blob: #{PAGE_ASSET_HOSTS}",
    "font-src data: https://fonts.gstatic.com https://fonts.bunny.net",
    "connect-src 'none'",
    "form-action 'self'",
  ].join("; ") + ";"

  # Memoized per process — the file ships with the deployed artifact and only
  # changes on deploy, which restarts the process.
  def self.tailwind_inline
    path = Rails.root.join("public/pages-tailwind.css")
    return "" unless File.exist?(path)

    @tailwind_inline ||= "<style>#{File.read(path)}</style>"
  end

  # The buy-free document: no checkout postMessage bridge, no delegated buy
  # click handler. Profiles have no purchase flow, so the seller's HTML is just
  # rendered inside the sandbox as-is.
  def self.document(custom_html)
    <<~HTML
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          #{tailwind_inline}
        </head>
        <body>
          #{custom_html}
        </body>
      </html>
    HTML
  end
end
