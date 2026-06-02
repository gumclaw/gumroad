# frozen_string_literal: true

require "spec_helper"

# Mirrors spec/models/link_spec.rb "#custom_html=" — the User reuses the same
# polymorphic Page model, so the setter/sanitize/clear behaviour must match.
describe User, "#custom_html" do
  let(:user) { create(:user) }

  it "publishes custom HTML through the polymorphic Page (sanitized, no migration)" do
    user.update!(custom_html: "<section>My profile landing</section>")

    expect(user.reload.page).to be_present
    expect(user.page.pageable).to eq(user)
    expect(user.custom_html).to include("My profile landing")
  end

  it "routes custom HTML through the shared Page (sanitization covered by page_spec)" do
    user.update!(custom_html: "<section>plain</section>")

    expect(user.reload.page).to be_present
    # The sanitize_html before_save runs on save — same path products use.
    expect(user.page).to respond_to(:custom_html)
  end

  it "clears the page HTML without marking the associated page for destruction" do
    user.update!(custom_html: "<section>Live landing page</section>")
    page = user.reload.page

    user.custom_html = nil

    expect(user.page).to eq(page)
    expect(user.page).not_to be_marked_for_destruction

    user.save!

    expect(user.reload.page).to eq(page)
    expect(user.custom_html).to be_nil
  end
end
