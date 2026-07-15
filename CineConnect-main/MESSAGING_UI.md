# Messaging (Chats) — Instagram-DM-style Direct Messages

This continues the messaging feature on the existing backend/Oracle/Socket.IO
architecture. The REST persistence layer (`messages` table, `messageModel.js`,
`messageRoutes.js`) already existed but the frontend was pointed at
endpoints that don't exist (`/api/conversations`, `/api/messages/:id`) and
ran entirely on mock data with fake `join`/`message`/`typing` socket events
the backend never implemented. This pass wires the real thing end to end and
adds the pieces that were genuinely missing: a conversations list endpoint,
live delivery, read receipts, typing indicators, and presence.

There's no separate "conversations" table — as before this app's design, a
conversation *is* the set of `messages` rows between two `users`, identified
by the other participant's `user_id`. That's what "a conversation is created
by its first message" means concretely: nothing is pre-created, the first
`POST /api/messages` row **is** the conversation, and it shows up in
`GET /api/messages/conversations` from that point on.

## Workflow implemented

1. **Starting a chat.** Tapping "Message" on a talent profile
   (`app/talent/[id].tsx`) opens `/chat/[id]` with that user's real
   `user_id`, name, and avatar colour passed as route params (no backend
   call needed just to open an empty chat screen). Typing a message and
   sending it calls `POST /api/messages`; that insert is the conversation's
   first row.
2. **Chats list.** `GET /api/messages/conversations` (new) returns one row
   per thread — the other participant, their latest message, when, and how
   many of their messages are still unread — ordered most-recent-first.
   `InboxScreen` → `ConversationRow` renders this exactly like before,
   just fed real data now.
3. **Permanent history.** Every message is a row in Oracle's `messages`
   table (pre-existing schema, untouched) — there's no delete/expiry path,
   so history is permanent by construction. `GET /api/messages/thread/:userId`
   returns the full thread `ORDER BY sent_at ASC` (already true before this
   pass), so the chat screen renders strictly chronologically.
4. **Timestamps + day dividers.** Each bubble shows its send time
   (`formatMessageTime`, e.g. "10:24 AM"); the list groups bubbles under
   "Today" / "Yesterday" / "Mon, 5 Jul" dividers (`formatDayDivider`), both
   new in `src/utils/format.ts`.
5. **Chat preview.** The Chats list shows the latest message body (prefixed
   "You: " when it was the current user's own last message) and a relative
   timestamp ("5 minutes ago"), reusing the existing `formatRelativeTime`.
6. **Instagram-style UI:**
   - **Conversation list** — unchanged `ConversationRow` (unread highlight,
     bold preview, unread dot), now backed by real data.
   - **Chat bubbles** — `ChatBubble` rewritten to show a per-message
     timestamp and, on the sender's single most recent outgoing bubble, a
     trailing **Sent / Delivered / Seen** status line (see below).
   - **Seen/Delivered status** — computed from real signals, not
     fabricated: `Seen` once the backend's `is_read` flag is true for that
     message (set when the recipient opens the thread); `Delivered` if the
     recipient is currently online (live via Socket.IO presence) but hasn't
     read it yet; otherwise `Sent`.
   - **Typing indicator** — existing `TypingIndicator` bubble, now driven by
     a real ephemeral Socket.IO `typing` event instead of a fake timeout.
   - **Smooth scrolling** — `FlatList` auto-scrolls to the newest message on
     content size change and after sending; day dividers and bubbles are
     both list rows so scrolling stays a single native `FlatList`, not
     nested scroll views.
   - **Responsive layout** — the chat column caps at 720px and centers on
     tablet/web (same pattern as `my-applications.tsx`'s 2-column layout),
     full-width on phone; `KeyboardAvoidingView` keeps the input bar above
     the keyboard on iOS.
7. **Real-time delivery.** `POST /api/messages` pushes the new message over
   Socket.IO to the recipient's room (`message:new`) — and echoes it back to
   the sender's own other sessions/tabs too. The frontend's
   `useMessagingSocket` hook (mounted once at the app root, mirroring
   `useNotificationSocket`) invalidates the React Query caches for
   `['conversations']` and `['messages', otherUserId]` on that event, so
   both Producer and Freelancer see new messages the instant they arrive —
   no polling required (a 30s poll on the conversations list remains as a
   safety net only).
8. **Read receipts.** Opening a chat (`useFocusEffect`) calls
   `PATCH /api/messages/thread/:userId/read` (new), which marks every
   unread message from that person as read in Oracle and pushes a
   `message:seen` event back to them — their last outgoing bubble flips to
   "Seen" live.
9. **Typing indicator (live).** The input's `onChangeText` emits a
   `typing` Socket.IO event (debounced to auto-clear after 2s of
   inactivity); the backend relays it to the other participant's socket
   room only — nothing is persisted, exactly like Instagram's ephemeral
   typing state.
10. **Presence (Online/Offline).** The Socket.IO server now tracks how many
    live connections each user has open. Opening a chat does a one-shot
    `presence:check` (Socket.IO acknowledgement) for the other participant;
    after that, `presence:changed` events (pushed to everyone that user has
    ever messaged, on every connect/disconnect) keep the header's
    Online/Offline dot live without polling.

## Backend endpoints

| Method & path | Purpose | Status |
|---|---|---|
| `GET /api/messages/conversations` | Chats list — latest message + unread count per thread | **New** |
| `GET /api/messages/thread/:userId` | Full chronological history with one user | Existing, now actually called by the frontend |
| `PATCH /api/messages/thread/:userId/read` | Mark a whole thread read; pushes a `message:seen` receipt | **New** |
| `POST /api/messages` | Send a message | Existing — now also pushes `message:new` over Socket.IO to the recipient (and the sender's other sessions) |
| `GET /api/messages/inbox` | Flat message list (legacy) | Unchanged, unused by any screen after this pass — left in place, not removed |
| `PATCH /api/messages/:messageId/read` | Mark a single message read (legacy) | Unchanged, superseded by the thread-read endpoint for the chat screen but left in place |
| `GET /api/messages/unread-count` | Global unread count | Unchanged, not currently consumed by any screen |
| Socket.IO `message:new` | Real-time message delivery | **New** |
| Socket.IO `message:seen` | Real-time read receipt | **New** |
| Socket.IO `typing` (client → server → other participant) | Ephemeral typing indicator relay | **New** |
| Socket.IO `presence:check` (ack) / `presence:changed` (push) | Online/offline status | **New** |

## Database tables

| Table | How it's used here |
|---|---|
| `messages` | Unchanged schema. `getConversations()` (new query) groups by the other participant using `CASE WHEN sender_id = :userId THEN recipient_id ELSE sender_id END`, joins the latest row per partner via `CROSS APPLY`, and counts unread with a correlated subquery. `markThreadRead()` (new) does a bulk `UPDATE ... SET is_read = 1` for every unread message from one specific sender. Both reuse the same `sender_id` / `recipient_id` / `is_read` / `sent_at` columns the table already had — no migration needed. |
| `users` | Joined for the other participant's `full_name` in the conversations list and thread rows (unchanged join pattern from the existing `SELECT`). |
| `projects` | Left-joined, unchanged — messages can optionally reference a project (`project_id`), not used by the new DM screens but preserved. |

No migration was needed — every column used by the new queries already
existed.

## Files modified

**Backend**
- `backend/models/messageModel.js` — added `getConversations()`,
  `getConversationPartnerIds()`, `markThreadRead()`; exports updated.
- `backend/routes/messageRoutes.js` — added `GET /conversations` and
  `PATCH /thread/:userId/read`; `POST /` now calls `emitToUser()` after a
  successful send.
- `backend/services/socketService.js` — added online-connection tracking
  (`onlineCounts`, `isUserOnline()`), a `presence:changed` broadcast to a
  user's conversation partners on connect/disconnect, a `presence:check`
  acknowledgement handler, and a `typing` relay handler.

**Frontend**
- `src/api/messages.ts` — `useConversations`, `useConversation`,
  `useMessages`, `useSendMessage` rewritten against the real endpoints
  above (`useConversation` now reads from the `['conversations']` React
  Query cache instead of calling a nonexistent per-id endpoint); added
  `useMarkThreadRead`. `useMessageRequests`/`useRequestActions` (the
  separate, still-backend-less "message request" gating feature — see
  Known gaps) were left untouched.
- `src/hooks/useMessagingSocket.ts` **(new)** — mirrors
  `useNotificationSocket`: invalidates `['conversations']` and
  `['messages', otherUserId]` on `message:new` / `message:seen`.
- `app/_layout.tsx` — mounts `useMessagingSocket()` alongside the existing
  `useNotificationSocket()`.
- `app/chat/[id].tsx` — rewritten: real data, `useTheme()`/`useResponsive()`
  (was hardcoded light-only styles before), day dividers, per-bubble
  Sent/Delivered/Seen status, live typing + presence, read-on-focus,
  responsive centred column on tablet/web.
- `src/components/ChatBubble.tsx` — added `createdAt`/`status` props and the
  timestamp + delivery-status row under each bubble.
- `src/types/index.ts` — `Message` gained `isRead: boolean`.
- `src/utils/format.ts` — added `formatMessageTime()` and
  `formatDayDivider()`.
- `app/talent/[id].tsx` — the "Message" action now opens `/chat/[id]`
  directly (real `user_id`, name, avatar passed as params) instead of
  firing the mock "Send Message Request" flow, since that's what actually
  lets someone start a real, persisted conversation.
- `src/services/mock.ts` — `mockMessages` entries gained `isRead: true` so
  the file still type-checks against the extended `Message` type (the mock
  data itself is no longer read by any live screen after this pass, but is
  left in place rather than deleted).

## Known gaps / notes

- **Message requests** (the "Requests" tab / Accept-Decline-before-you-can-
  chat gating in `RequestList`/`RequestCard`/`app/requests.tsx`) has no
  backend (no `message_requests` table, no route) and is out of scope for
  this pass — it's untouched and still mock-only. Direct messaging (this
  feature) has no such gate: any two users can message each other once one
  of them sends a first message, matching what the task asked for.
- **Group chats / project-wide threads**: `messages.project_id` exists in
  the schema and is preserved end-to-end, but there's no UI surfacing
  project context on a message yet — every thread is a plain 1:1 DM.
- **Presence** is connection-based (in-memory `Map` on the Socket.IO
  process), not stored in Oracle — restarting the backend resets everyone
  to "offline" until they reconnect, which is expected for ephemeral
  presence and matches how most chat apps behave.
- **Delivered vs Sent** is inferred from live presence, not a persisted
  "delivered" flag — if the recipient's app is open but their socket
  briefly reconnects, the label may show "Sent" for a moment even though
  the message safely landed in Oracle regardless.
