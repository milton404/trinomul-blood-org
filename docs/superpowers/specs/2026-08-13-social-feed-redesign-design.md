# Social Feed Redesign Design

## Goal

Redesign the existing community feed into a familiar Facebook-style social experience while preserving the current blood-bank functionality and bilingual support.

## Scope

The redesign is limited to the public feed route and its presentation layer. Existing server actions and feed capabilities remain the source of truth.

Existing capabilities to preserve:

- General posts
- Donation updates
- Admin announcements
- Image uploads
- Public/private visibility
- Likes
- Comments
- Sharing
- Editing and deletion
- Admin pinning
- Feed filters
- Blood-request feed items

## Page Structure

### Desktop

Use a responsive three-column shell:

- Left sidebar: community navigation and shortcuts
- Center column: page header, donation highlights, composer, tabs, and feed items
- Right sidebar: Emergency SOS, inventory summary, active-request preview, and community-impact information

The center column remains the primary reading surface and should have a constrained width for readable post content. Sidebars should remain visually secondary and may become sticky on larger screens without blocking the feed.

### Mobile

Collapse to a single-column layout. Hide the desktop sidebars, retain the page header, highlights, composer, filter tabs, feed items, and urgent emergency action. Controls must remain touch-friendly and horizontally scrollable where necessary.

## Visual Direction

Use a polished social-media visual language adapted to the blood-bank mission:

- Soft slate page background
- White elevated surfaces for feed modules
- Red/rose accents for blood and urgent actions
- Emerald accents for donor impact and successful donation updates
- Amber accents for announcements and pinned content
- Rounded surfaces, subtle borders, restrained shadows, and clear hierarchy
- Compact metadata rows and familiar social action affordances

Avoid adding decorative UI that does not support navigation, posting, discovery, emergency response, or community engagement.

## Main Feed Modules

1. Page header with community title, subtitle, and a clear primary action for requesting blood.
2. Donation highlights row using a stories-like horizontal format. It should be compact, responsive, and based on available feed/community information rather than introducing a new backend data model.
3. Existing FeedComposer with improved placement and visual prominence.
4. Existing all/updates/requests/announcements filters with clearer active state.
5. Existing feed list with posts and request cards.
6. Existing load-more behavior and loading/empty states.

## Sidebar Modules

The sidebar content should use existing routes, auth state, and available server data where practical:

- Community navigation links to feed, donor discovery, blood requests, and profile/activity destinations.
- Emergency SOS action linking to the existing emergency-request flow.
- Blood availability summary linking to donor/request discovery.
- Active blood-request preview linking to the requests page.
- Community impact block using safe aggregate messaging and avoiding private donor data.

If a sidebar metric cannot be obtained without creating a new backend feature, show a static mission-oriented action instead of inventing data.

## Component Boundaries

- Feed page owns the responsive shell and page-level modules.
- FeedList continues to own tab state, loading, pagination, and feed item rendering.
- FeedComposer continues to own post creation, image upload, visibility, and post type selection.
- FeedPostCard continues to own post actions and comments.
- New presentational shell/sidebar/highlight components should remain small and receive data or links through props where possible.

## Interaction and States

Support the existing loading, empty, error-tolerant, logged-out, logged-in, admin, and mobile states. Emergency actions should be visually prominent but not interrupt ordinary feed browsing. Keep keyboard focus indicators and accessible labels for icon-only controls.

## Responsive Rules

- Three columns at large desktop widths.
- Center plus one optional sidebar at medium widths.
- Single column at mobile widths.
- No horizontal page overflow.
- Horizontal scrolling is allowed only for compact tab and highlight rows.
- Preserve usable composer and post action controls at narrow widths.

## Verification

Verify:

- Feed page renders for English and Bengali locales.
- Logged-out users can view the feed and reach login from the composer.
- Logged-in users can create posts and use existing post actions.
- Admin announcement and pin controls remain available only to admins.
- Blood-request feed items still render correctly.
- Mobile layout has no overflow and maintains accessible controls.
- TypeScript, lint, and production build checks pass.
