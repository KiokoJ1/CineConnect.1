# Messaging & User Discovery

## What this implements

1. **Message button on every profile** — the freelancer profile screen
   (`talent/[id].tsx`, opened from Browse Talent) and the producer info
   block on a job's detail screen (`job/[id].tsx`) both now have a real
   "Message" button that opens a chat with that person directly. No
   request/approval step — this replaces a "Send Message Request" flow that
   looked functional in the UI but had no backend behind it at all (no
   `/api/message-requests` route ever existed).
2. **Discover tab in Messages** — the Messages screen's second tab
   (previously "Requests", same dead-end as above) is now **Discover**: a
   searchable directory of every user on the platform, filterable by role,
   any of them tappable to start a conversation.
3. **One thread per pair of users, not a separate "conversation" concept** —
   the Oracle schema has no `conversations` table, only `messages` rows with
   a sender/recipient. "Opening a conversation" is just opening
   `/chat/:otherUserId` and reading `GET /api/messages/thread/:userId`; if
   no messages exist yet the thread is simply empty until the first one is
   sent — there's nothing to separately "create."
4. **Real-time** — messages send and arrive over the existing Socket.IO
   connection (built in the previous "Job Application workflow" pass, now
   extended to actually carry chat traffic); a lightweight typing indicator
   rides the same connection.

## Backend endpoints

| Method & path | Purpose | New or existing |
|---|---|---|
| `GET /api/users?search=&role=` | User directory (Discover tab) | **New** — the only similar thing before this was `/api/admin/users`, which is admin-only by design |
| `GET /api/users/:id` | Single user's public info (chat header, Message button target) | **New** |
| `GET /api/messages/inbox` | Every message involving the signed-in user | Existing — frontend was calling a nonexistent `/api/conversations` instead |
| `GET /api/messages/thread/:userId` | One thread's full history | Existing — frontend was calling a nonexistent `/api/messages/:conversationId` instead |
| `POST /api/messages` | Send a message (REST fallback if no socket) | Existing, unchanged |
| `PATCH /api/messages/thread/:userId/read` | Mark a whole thread read at once | **New** — only a single-message mark-read endpoint existed, impractical to call once per message from the client |
| `GET /api/messages/unread-count` | Badge count | Existing, unchanged |
| Socket.IO `message` event | Real-time send/receive | **New handler** — the Socket.IO server itself existed (built last pass for notifications) but had no chat message handling at all |
| Socket.IO `typing` event | Typing indicator | **New handler** |

Per "reuse existing APIs, only build what's genuinely missing": the
message-storage/retrieval endpoints already existed and just needed correct
wiring; user discovery and bulk thread-read did not exist anywhere and were
built.

## Database tables

No new tables. Reused as-is:
- `messages` — every send/receive, thread history, inbox, unread counts.
- `users` — the discovery directory (`GET /api/users`) reuses `userModel.findAll()`, the same function built for the admin panel.

The "conversation list" shown in the Messages tab is **computed at request
time** by grouping the inbox's flat message list by counterpart — not
stored anywhere — since a `conversations` table doesn't exist and building
one wasn't necessary for anything this task asked for.

## Files modified

**Backend**
- `backend/routes/userRoutes.js` **(new)** — `GET /`, `GET /:id`; excludes the caller and admin accounts from directory results.
- `backend/app.js` — mounted `userRoutes` at `/api/users`.
- `backend/models/messageModel.js` — added `markThreadRead()`.
- `backend/routes/messageRoutes.js` — added `PATCH /thread/:userId/read`.
- `backend/services/socketService.js` — added `message` (persists via `messageModel.sendMessage`, then pushes to both sender and recipient rooms, with an ack callback for the sender's optimistic-UI reconciliation) and `typing` (ephemeral, not persisted) event handlers to the existing connection handler.

**Frontend**
- `src/api/messages.ts` — rewritten: `useConversations()` now derives a conversation list from the real inbox endpoint instead of calling a nonexistent `/api/conversations`; `useMessages()`/`useSendMessage()` now target `/thread/:userId` and `POST /api/messages` correctly; added `useMarkThreadRead()` and `useUnreadMessageCount()`; removed `useConversation` (singular)/`useMessageRequests`/`useRequestActions` (all called endpoints that never existed).
- `src/api/users.ts` — `useTalent`/`useUser` fixed to call the real `/api/users` endpoints (envelope unwrapping + field mapping — same class of fix as `admin.ts` and `jobs.ts` in earlier passes); added `useAllUsers()` for the Discover tab.
- `app/chat/[id].tsx` — rewritten around the real model: the route's `id` is the *other user's id*, not a conversation id; fetches the other user via `useUser()`; sends/receives over the socket with `{recipientId, body}`; marks the thread read on open; shows the other user's role in the header instead of a fake "online" presence dot (no presence tracking exists).
- `src/screens/InboxScreen.tsx` — "Requests" tab replaced with **Discover** (search + role filter + tappable user list); "Chats" tab unchanged in appearance, now backed by real data.
- `app/talent/[id].tsx` — "Send Message Request" button replaced with a real "Message" button that opens the chat directly.
- `app/job/[id].tsx` — added a "Message" button next to the producer's info.
- `src/hooks/useNotificationSocket.ts` — extended to also listen for `message` socket events and refresh the conversation list/unread count live (previously only handled `notification` events).
- **Removed** `app/requests.tsx`, `src/components/RequestList.tsx`, `src/components/RequestCard.tsx` — these implemented the message-request flow that never had a working backend and is superseded by direct messaging + Discover. Nothing navigated to `/requests` anymore once the Requests tab was replaced, so this was dead code, not working code.

## Known gaps (documented, not fabricated)

- **No online/presence tracking.** The chat header used to show a fake
  "Online"/"Offline" dot from mock data; since there's no real presence
  system, it now shows the person's role instead of inventing a status.
- **No typing-indicator persistence** (by design — typing state shouldn't
  outlive the socket connection).
- **Discover's role filter is exact** (`freelancer`/`producer`/`client`);
  there's no "client" test account seeded, so that filter is currently
  correct but likely returns nothing until one exists.
