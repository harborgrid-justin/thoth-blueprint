<!-- Raw research capture — background, feeds frontend/backend collaboration requirements. Not a normative requirements doc. -->
# Research capture — collaborative canvas mechanics

Source: background research agent (Figma, Miro, FigJam, Google Docs). Collaboration mechanics only.

## Multiplayer editing & conflict handling
- Real-time multiplayer editing; changes streamed live; continuous autosave to server.
- Server-reconciled shared state so concurrent edits converge (Figma: server-authoritative, last-write-wins-per-property; OT/CRDT-style under the hood).
- Multiplayer cursors (named, uniquely colored); cursor gestures (wave/point); live typing preview.

## Presence, live cursors & observation
- Presence roster / who-is-here (avatars, online indicators).
- Follow mode — track a collaborator's viewport/cursor/zoom/page.
- Spotlight / present-to-collaborators; follower-awareness indicators; silent follow.
- Cursor chat (ephemeral); emotes/stamps/high-fives; live audio chat; voting sessions.
- Live selection sharing — see what objects others have selected in real time.
- Note: these tools use static object locking, not presence-aware exclusive locks — true presence-aware locking could differentiate multi-planner site editing.

## Comments & review
- Threaded comments with replies; pinned/anchored comments (click-to-anchor, drag region, cluster on zoom-out).
- @mentions with notification; resolve/reopen; emoji reactions; notification granularity (email + in-app).
- Comments follow branches and archive with them; suggesting mode (tracked edit suggestions accepted/rejected); comment-to-task assignment.

## Sharing & permissions
- Roles: owner / co-owner / editor / commenter / viewer (view includes comment).
- Seat vs permission separation; link sharing vs explicit email invite; public vs restricted scope.
- Permission inheritance hierarchy: Org → Team → Project → File; explicit grants override inherited.
- Password-protected links; link expiry (1h–31d); guest access (external) with org toggle; unregistered visitor tier; embed; view-only present mode.
- Admin controls (reset/disable invite links; content-admin oversight; SSO/enterprise).

## Versioning & branching
- Continuous autosave + periodic checkpoints (Figma ~every 30 min); version history browse & restore.
- Named/annotated versions; retention windows (Miro 90 days); restore gated by role.
- Branching (isolated branch off main), merge with diff review, branch archiving; scenario duplication as lightweight alternative.

## Notifications, activity & audit
- In-app + email for comments/mentions/replies/reactions/spotlight/invitations; per-user granularity.
- Version history doubles as activity/audit trail (who/what/when); enterprise admin audit & access governance.

## Sources
- https://www.figma.com/blog/multiplayer-editing-in-figma/
- https://help.figma.com/hc/en-us/articles/360040322673-Follow-along-with-observation-mode
- https://help.figma.com/hc/en-us/articles/1500007609322-Guide-to-sharing-and-permissions
- https://help.figma.com/hc/en-us/articles/360063144053-Guide-to-branching
- https://help.figma.com/hc/en-us/articles/360038006754-View-a-file-s-version-history
- https://help.miro.com/hc/en-us/articles/360017571194-Roles-in-Miro
- https://help.miro.com/hc/en-us/articles/360021668819-Board-history-versions
- https://support.google.com/docs/answer/6033474
