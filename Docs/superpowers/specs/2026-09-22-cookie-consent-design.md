# Cookie Consent and Visitor Information Design

## Goal

Give visitors a clear, reversible choice over optional analytics while preserving the essential cookies needed for account, basket, security, and site-preference features.

## Scope

Applies to public pages. Admin routes remain excluded from analytics. Existing authentication and server-session cookies remain unchanged.

## Visitor experience

On the first public visit, show a compact, bottom-aligned cookie banner in the existing Akiwumi Photo visual style. The banner says:

> We use essential cookies to make the site work. With your permission, we also use analytics to understand visits and improve the site.

It provides three actions:

- **Accept analytics** — enables analytics and records the choice.
- **Essential only** — records refusal and keeps analytics disabled.
- **Settings** — opens the preference dialog without recording a choice.

The first layer presents acceptance and rejection with equal prominence. Dismissing the settings dialog leaves the choice unresolved and the banner remains available.

## Preference dialog

The accessible dialog contains:

- **Essential cookies**: enabled and not toggleable. Explains that these support security, signed-in accounts, basket/check-out flow, and saved site preferences.
- **Analytics cookies**: disabled by default. Explains that Vercel Web Analytics measures aggregated visits to improve the site.
- **Save choices** action.
- A link to the Cookie Policy.

Keyboard focus is trapped while the dialog is open, Escape closes it without changing consent, and controls have visible labels and focus states.

## Consent storage and analytics behavior

Store a small first-party preference value identifying the visitor's selection (`analytics: true` or `false`) and its decision timestamp. Persist it for six months, then request consent again.

Before explicit acceptance, do not mount Vercel Analytics. When accepted, mount the existing analytics component and retain its exclusion of `/admin`, `/auth`, and `/register/verified` URLs. When a visitor switches analytics off, remove the accepted preference and stop mounting analytics for subsequent client navigation; reload once if necessary to remove any already-loaded analytics runtime.

Existing essential authentication, basket, security, and currency-preference mechanisms remain independent of this preference and are never blocked by the banner.

## Persistent control and policy

Add a **Cookie settings** link to the shared footer. It opens the preference dialog at any time, including after a prior decision, so withdrawal is as easy as acceptance.

Add a public `/cookie-policy` page with:

- Essential and analytics cookie categories.
- Each category's purpose and whether consent is required.
- Vercel Web Analytics as the analytics provider.
- Six-month preference retention.
- Instructions for changing or withdrawing choices through Cookie settings.
- A privacy-question link to `/contact`.

## Components and boundaries

- `CookieConsentProvider`: owns preference loading, persistence, consent changes, and dialog/banner state.
- `CookieBanner`: presents the first-visit decision.
- `CookieSettingsDialog`: exposes categories and allows later changes.
- `SiteAnalytics`: receives or reads the resolved consent state and renders nothing until analytics is accepted.
- `SiteFooter`: exposes the persistent Cookie settings control.
- Cookie Policy page: static visitor information, with no tracking dependency.

## Error handling

If browser storage is unavailable, analytics remains disabled and the banner offers a retryable choice for the current visit. Malformed or expired preferences are treated as unresolved; analytics stays off and the banner is shown. Consent UI must never break public-page rendering.

## Verification

- No analytics component mounts before explicit acceptance.
- Accepting enables analytics; Essential only leaves it disabled.
- A saved selection survives a reload and expires after six months.
- Settings can change an existing choice; withdrawing disables analytics.
- Footer control opens settings on every public page using the shared footer.
- Cookie Policy contains the agreed categories, provider, retention, and contact route.
- Account and basket flows still work with analytics refused.

## Out of scope

- Advertising, retargeting, social-media pixels, and marketing cookies.
- A third-party consent-management platform.
- Geo-specific banner variations.
