# frozen_string_literal: true

require "spec_helper"

# Profile counterpart to spec/requests/pages_landing_embed_csp_spec.rb. Runs the
# full middleware stack so it catches SecureHeaders overwriting the response
# CSP. The profile landing_iframe_content action opts out of SecureHeaders' CSP
# and sets its own strict one; if that opt-out regressed, the seller's inline
# scripts would be silently CSP-blocked.
describe "GET /:username/landing/embed CSP", type: :request do
  let(:seller) { create(:user, username: "landingcreator") }

  before do
    Feature.activate_user(:custom_html_pages, seller)
    seller.update!(custom_html: "<section><script>window.ok = true;</script></section>")
  end

  it "serves the strict custom_html CSP, not the app default from SecureHeaders" do
    get "/#{seller.username}/landing/embed", headers: { "HOST" => VALID_REQUEST_HOSTS.first }

    expect(response).to be_successful
    csp = response.headers["Content-Security-Policy"]
    expect(csp).to include("default-src 'none'")
    expect(csp).to include("script-src 'unsafe-inline'")
    expect(csp).to include("connect-src 'none'")
    img_sources = csp[/img-src([^;]*)/, 1].split
    expect(img_sources).to include(CDN_S3_PROXY_HOST)
    expect(img_sources).not_to include("https:")
    expect(csp).not_to include("default-src 'self'")
  end

  it "sandboxes the response itself so a direct top-level load can't run scripts same-origin" do
    get "/#{seller.username}/landing/embed", headers: { "HOST" => VALID_REQUEST_HOSTS.first }

    csp = response.headers["Content-Security-Policy"]
    expect(csp).to include("sandbox allow-scripts allow-forms")
    expect(csp).not_to include("allow-same-origin")
    expect(csp).not_to include("allow-top-navigation")
  end

  it "404s when the feature flag is off" do
    Feature.deactivate_user(:custom_html_pages, seller)

    get "/#{seller.username}/landing/embed", headers: { "HOST" => VALID_REQUEST_HOSTS.first }

    expect(response).to have_http_status(:not_found)
  end

  it "404s when the seller has no custom HTML" do
    seller.update!(custom_html: "")

    get "/#{seller.username}/landing/embed", headers: { "HOST" => VALID_REQUEST_HOSTS.first }

    expect(response).to have_http_status(:not_found)
  end

  it "interpolates the seller name and bio, and carries no buy-button checkout script" do
    seller.update!(name: "Ada Lovelace", bio: "First programmer")
    seller.update!(custom_html: <<~HTML)
      <main>
        <h1 data-gumroad-field="name"></h1>
        <p data-gumroad-field="bio"></p>
      </main>
    HTML

    get "/#{seller.username}/landing/embed", headers: { "HOST" => VALID_REQUEST_HOSTS.first }

    expect(response.body).to include("Ada Lovelace")
    expect(response.body).to include("First programmer")
    # Profiles have no checkout — the product wrapper's buy-button bridge must
    # never appear on a profile landing page.
    expect(response.body).not_to include("gumroad:checkout")
    expect(response.body).not_to include('data-gumroad-action="buy"')
  end
end
