# frozen_string_literal: true

# Profile-side custom-HTML rendering, mirroring LinksController's product flow
# (render_custom_html_if_present + landing_iframe_content) but without any buy
# button / checkout — a profile landing page is a pure marketing surface.
#
# - #render_custom_html_if_present: before_action on the public profile show.
#   When the seller has published custom HTML and the flag is on, render the
#   sandboxed wrapper iframe instead of the default Inertia profile page.
# - #landing_iframe_content: the iframe target (/:username/landing/embed) that
#   serves the sanitized HTML under the strict seller-scoped CSP.
module ProfileCustomHtml
  extend ActiveSupport::Concern

  def landing_iframe_content
    return head :not_found unless profile_custom_html_visible?

    # Opt out of SecureHeaders' default CSP so the strict, seller-scoped CSP we
    # set below survives (otherwise the middleware strips 'unsafe-inline' and
    # silently blocks the seller's inline scripts).
    SecureHeaders.opt_out_of_header(request, :csp)
    response.set_header("Content-Security-Policy", Pages::Renderer::CUSTOM_HTML_CSP)
    response.set_header("X-Frame-Options", "SAMEORIGIN")
    response.set_header("Referrer-Policy", "no-referrer")
    interpolated = Pages::ProfileInterpolator.interpolate(@user.custom_html, seller: @user)
    render html: Pages::Renderer.document(interpolated).html_safe, layout: false
  end

  private
    def profile_custom_html_visible?
      @user.present? &&
        Feature.active?(:custom_html_pages, @user) &&
        @user.custom_html.present?
    end

    def render_custom_html_if_present
      return unless profile_custom_html_visible?

      render html: profile_custom_html_wrapper_document(@user).html_safe, layout: false
    end

    # Omitting allow-same-origin keeps the seller's HTML on an opaque origin —
    # no access to gumroad.com cookies or the parent DOM. No buy button means no
    # checkout postMessage listener (the product wrapper's only script): the
    # wrapper is a thin, script-free frame around the sandboxed iframe.
    def profile_custom_html_wrapper_document(user)
      # The embed route differs by host: on the seller's subdomain/custom domain
      # the profile is served at "/" so the iframe target is "/landing/embed";
      # on the main domain it's "/:username" so the target is
      # "/:username/landing/embed". Deriving it from the current request path
      # keeps the wrapper correct on every host the profile renders on.
      base_path = request.path.chomp("/")
      iframe_src = ERB::Util.h("#{base_path}/landing/embed")
      title = ERB::Util.h(user.name_or_username.to_s)
      canonical = ERB::Util.h(user.profile_url.to_s)
      avatar = user.resized_avatar_url(size: 240) rescue nil
      og_image_tag = avatar ? %(<meta property="og:image" content="#{ERB::Util.h(avatar)}">) : ""
      <<~HTML
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>#{title}</title>
            <link rel="canonical" href="#{canonical}">
            <meta property="og:title" content="#{title}">
            <meta property="og:type" content="profile">
            <meta property="og:url" content="#{canonical}">
            #{og_image_tag}
            <style>html,body{margin:0;padding:0;height:100%;overflow:hidden}iframe{display:block;width:100%;height:100%;border:0}</style>
          </head>
          <body>
            <iframe
              id="gumroad-profile-landing-frame"
              src="#{iframe_src}"
              title="#{title}"
              sandbox="allow-scripts allow-forms"
            ></iframe>
          </body>
        </html>
      HTML
    end
end
