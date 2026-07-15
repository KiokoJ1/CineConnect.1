# Messaging UI — Instagram-style Chat

Builds on [`MESSAGING_DISCOVERY.md`](./MESSAGING_DISCOVERY.md) (which wired
the Messages tab, Discover, and basic real-time send/receive to the real
backend). This pass is purely about how the chat *looks and feels* and
closing two real gaps: read receipts and a proper chronological/grouped
message view.

## What changed

### Conversation list
Already backed by real data since the previous pass (`GET /api/messages/inbox`,
grouped client-side into one row per counterpart). No `conversations` table
exists or is needed — a "conversation" is just every `messages` row between
two users, so sending the first message to someone is all it takes for them
to appear in the Chats list on the next refresh/live update. Each row already
showed the latest message + relative time; unchanged this pass.

### Chat bubbles, grouped like Instagram
- Consecutive messages from the same sender, on the same day, sent within 5
  minutes of each other are visually grouped (tight spacing, no repeated
  timestamp on every single bubble).
- A small timestamp (`10:42 AM`) appears once under the **last** bubble of
  each group, not under every message — matches the IG pattern of a quiet,
  low-noise timeline rather than a timestamp-per-line wall of text.
- A date separator pill ("Today" / "Yesterday" / "12 March") is inserted
  wherever the day changes.

### Chronological order, permanent history
`getThread()` already ordered by `sent_at ASC` (unchanged, reused). Nothing
is ever deleted — there's no delete/expire route on `messages` — so history
is permanent by construction, not by a special flag.

### Seen / Delivered
This is the one genuinely new piece of backend behavior:
- Opening a thread calls the existing `PATCH /api/messages/thread/:userId/read`
  (built last pass), which now **also emits a `read` socket event** to the
  original sender.
- The sender's chat screen listens for that event and flips their sent
  messages to "Seen" live, without a refetch.
- The status line ("Delivered" / "Seen") is shown once, under the most
  recent message *I* sent — exactly where Instagram puts it, not repeated
  under every bubble.
- If the other person isn't connected when they read it (e.g. they read it
  from a fresh app-open after being offline), the REST call still marks it
  read in Oracle; the sender will see "Seen" next time their thread refreshes
  even without having received the live event.

### Smooth scrolling
Switched the message list from a normal `FlatList` (which had to
`scrollToEnd()` itself after every render) to an **inverted `FlatList`** —
the idiomatic React Native pattern for chat UIs. It opens already scrolled
to the newest message, only renders upward as the person scrolls back
through history, and new messages simply prepend without any manual
scroll-management code. The typing indicator now renders as the (visually
bottom-most) `ListHeaderComponent`, which is the correct slot in an inverted
list.

### Responsive
Bubble width is percentage-based (`maxWidth: '78%'`), the input bar and
header are flex-based with safe-area insets, and nothing here introduces a
fixed pixel width — verified logically against phone/tablet/web the same
way as previous passes; no layout in this file changed its responsiveness
model, just its content.

## Backend endpoints

| Method & path / event | Purpose | New or existing |
|---|---|---|
| `GET /api/messages/thread/:userId` | Chronological message history | Existing, unchanged |
| `PATCH /api/messages/thread/:userId/read` | Mark thread read | Existing route, **behavior extended**: now also emits `read` over the socket |
| `POST /api/messages` | REST fallback send | Existing route, **behavior extended**: now also emits `message` over the socket (previously only the socket path did — the REST fallback silently didn't push live) |
| Socket.IO `read` event | Real-time seen-receipt push | **New** |
| Socket.IO `message` / `typing` events | Real-time send/typing | Existing (previous pass) |

## Oracle tables

No schema changes. `messages.is_read` (already existed) is what both the
Seen/Delivered indicator and the unread dot in the Chats list are computed
from — this pass just started reading and pushing that column's value
instead of dropping it on the frontend.

## Files modified

**Backend**
- `backend/routes/messageRoutes.js` — `PATCH /thread/:userId/read` now emits a `read` socket event to the original sender; `POST /` now emits a `message` event too (parity with the socket send path).

**Frontend**
- `src/types/index.ts` — `Message` gained `isRead: boolean`.
- `src/api/messages.ts` — `mapBackendMessage()` now carries `isRead` through instead of dropping it.
- `src/utils/format.ts` — added `formatMessageTime()`, `formatDateSeparator()`, `isSameDay()`.
- `src/components/ChatBubble.tsx` — added optional `time` caption and a `grouped` tight-spacing mode.
- `src/components/DateSeparator.tsx` **(new)** — the "Today"/"Yesterday"/date pill.
- `app/chat/[id].tsx` — rewritten message list: groups consecutive bubbles, inserts date separators, shows Seen/Delivered under the last sent message, listens for the new `read` socket event, switched to an inverted `FlatList`.
- `src/services/mock.ts` — 7 mock `Message` objects updated with `isRead` to satisfy the type (this file is otherwise unused — see `README.md`'s Project Progress — but still type-checked as part of the project).

## Known gaps (documented, not fabricated)

- **No "delivered while offline, seen later" distinction beyond the two
  states shown.** Real messaging apps sometimes show three states
  (Sent/Delivered/Seen, where Delivered means "reached the device" as
  opposed to "was read"). This app only distinguishes Sent-but-unread
  ("Delivered") vs read ("Seen") — there's no device-delivery acknowledgement
  layer, which would need push-notification-level infrastructure this
  project doesn't have.
- **Typing indicator is per-thread, not per-message** — if the other person
  is typing in a *different* thread, this screen won't show it (correctly
  filtered by `payload.fromUserId === id`), but there's no "X is typing…" on
  the conversation list itself, only inside an open thread.
