# frozen_string_literal: true

require "spec_helper"

# Profile counterpart to spec/requests/products/show/custom_html_spec.rb. When a
# seller publishes custom HTML and the flag is on, the public profile page is
# replaced by the sandboxed wrapper iframe instead of the default Inertia
# profile. Unlike the product page there is no buy button / checkout to drive,
# so this verifies the swap and the buy-free wrapper.
describe "Custom HTML profile page", type: :system, js: true do
  let(:seller) { create(:user, username: "customcreator") }

  before do
    Feature.activate_user(:custom_html_pages, seller)
    create(:seller_profile, seller:)
  end

  it "renders the sandboxed landing iframe in place of the default profile when custom HTML is live" do
    seller.update!(custom_html: "<main><h1>My custom profile</h1></main>")

    visit seller.subdomain_with_protocol

    expect(page).to have_selector("iframe#gumroad-profile-landing-frame")
    within_frame(find("iframe#gumroad-profile-landing-frame")) do
      expect(page).to have_text("My custom profile")
    end
    # The buy-button checkout bridge from the product wrapper must not exist.
    expect(page).not_to have_selector("#gumroad-landing-frame")
  end

  it "shows the default profile when no custom HTML is published" do
    seller.update!(name: "Default Creator")

    visit seller.subdomain_with_protocol

    expect(page).not_to have_selector("iframe#gumroad-profile-landing-frame")
    expect(page).to have_text("Default Creator")
  end
end
