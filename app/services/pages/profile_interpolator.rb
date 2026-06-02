# frozen_string_literal: true

# Profile counterpart to Pages::Interpolator. Runs server-side at render time so
# crawlers and link previewers see real profile values, not placeholders.
# Unlike the product interpolator there are NO buy buttons to wire up — a
# profile landing page is a pure marketing surface — so this only fills in the
# seller's name and bio. Unknown markers pass through unchanged.
class Pages::ProfileInterpolator
  FIELDS = {
    "name" => ->(seller) { seller.name_or_username.to_s },
    "bio" => ->(seller) { seller.bio.to_s },
  }.freeze

  def self.interpolate(html, seller:)
    return html if html.blank?

    fragment = Loofah.fragment(html)

    fragment.css("[data-gumroad-field]").each do |node|
      handler = FIELDS[node["data-gumroad-field"]]
      node.inner_html = ERB::Util.h(handler.call(seller)) if handler
    end

    fragment.to_html
  end
end
