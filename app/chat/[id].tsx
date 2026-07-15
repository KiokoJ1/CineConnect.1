import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMarkThreadRead, useMessages, useSendMessage } from '@/api/messages';
import { useUser } from '@/api/users';
import { Avatar } from '@/components/Avatar';
import { ChatBubble } from '@/components/ChatBubble';
import { DateSeparator } from '@/components/DateSeparator';
import { LoadingState } from '@/components/StateViews';
import { TypingIndicator } from '@/components/TypingIndicator';
import { ThemeColors } from '@/constants/colors';
import { layout, radius, spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { getSocket } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';
import { Message } from '@/types';
import { formatDateSeparator, formatMessageTime, isSameDay } from '@/utils/format';

type Row =
  | { kind: 'date'; key: string; label: string }
  | { kind: 'message'; key: string; message: Message; showTime: boolean; grouped: boolean };

/** Groups consecutive same-sender messages within 5 minutes, and inserts date separators between days. */
function buildRows(messages: Message[]): Row[] {
  const rows: Row[] = [];
  messages.forEach((msg, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];

    if (!prev || !isSameDay(prev.createdAt, msg.createdAt)) {
      rows.push({ kind: 'date', key: `date_${msg.id}`, label: formatDateSeparator(msg.createdAt) });
    }

    const grouped = !!prev && prev.senderId === msg.senderId && isSameDay(prev.createdAt, msg.createdAt);
    const gapToNextMs = next ? new Date(next.createdAt).getTime() - new Date(msg.createdAt).getTime() : Infinity;
    const showTime =
      !next || next.senderId !== msg.senderId || !isSameDay(next.createdAt, msg.createdAt) || gapToNextMs > 5 * 60 * 1000;

    rows.push({ kind: 'message', key: msg.id, message: msg, showTime, grouped });
  });
  return rows;
}

/** Route param `id` is the OTHER user's id — there's no separate conversationId; a thread is just every message between two users. */
export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const myId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);

  const { data: otherUser } = useUser(id);
  const { data: history, isLoading } = useMessages(id);
  const sendMessage = useSendMessage(id);
  const markRead = useMarkThreadRead();

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef<FlatList<Row>>(null);

  // Seed local state from history once it loads.
  useEffect(() => {
    if (history) setMessages(history);
  }, [history]);

  // Opening the thread marks everything the other person sent as read.
  useEffect(() => {
    if (id) markRead.mutate(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Real-time: inbound messages, typing, and read receipts for this thread.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onMessage = (msg: {
      messageId: number;
      senderId: number;
      recipientId: number;
      body: string;
      sentAt: string;
      isRead: boolean;
    }) => {
      const otherId = Number(id);
      const involvesThisThread =
        (msg.senderId === otherId && String(msg.recipientId) === myId) ||
        (msg.recipientId === otherId && String(msg.senderId) === myId);
      if (!involvesThisThread) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === String(msg.messageId))) return prev;
        return [
          ...prev,
          {
            id: String(msg.messageId),
            conversationId: id,
            senderId: String(msg.senderId),
            text: msg.body,
            createdAt: msg.sentAt,
            isRead: msg.isRead,
          },
        ];
      });
      // A message just arrived from them while the thread is open — mark it read immediately.
      if (String(msg.senderId) === id) markRead.mutate(id);
    };

    const onTyping = (payload: { fromUserId: number; typing: boolean }) => {
      if (String(payload.fromUserId) === id) setTyping(payload.typing);
    };

    const onRead = (payload: { byUserId: number }) => {
      // The person I'm chatting with just read the thread — flip my sent messages to Seen.
      if (String(payload.byUserId) !== id) return;
      setMessages((prev) => prev.map((m) => (m.senderId === myId ? { ...m, isRead: true } : m)));
    };

    socket.on('message', onMessage);
    socket.on('typing', onTyping);
    socket.on('read', onRead);
    return () => {
      socket.off('message', onMessage);
      socket.off('typing', onTyping);
      socket.off('read', onRead);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, myId]);

  const rows = useMemo(() => buildRows(messages), [messages]);
  // Inverted FlatList expects the newest item first.
  const invertedRows = useMemo(() => [...rows].reverse(), [rows]);

  const lastMineMessage = [...messages].reverse().find((m) => m.senderId === myId);

  const onChangeDraft = (text: string) => {
    setDraft(text);
    const socket = getSocket();
    socket?.emit('typing', { recipientId: Number(id), typing: text.length > 0 });
  };

  const onSend = () => {
    const text = draft.trim();
    if (!text || !myId) return;

    const optimistic: Message = {
      id: `local_${Date.now()}`,
      conversationId: id,
      senderId: myId,
      text,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');

    const socket = getSocket();
    socket?.emit('typing', { recipientId: Number(id), typing: false });

    if (socket) {
      socket.emit(
        'message',
        { recipientId: Number(id), body: text },
        (ack: { ok: boolean; message?: { messageId: number } }) => {
          // Reconcile the optimistic id with the real one once the server confirms.
          if (ack?.ok && ack.message) {
            setMessages((prev) =>
              prev.map((m) => (m.id === optimistic.id ? { ...m, id: String(ack.message!.messageId) } : m)),
            );
            qc.invalidateQueries({ queryKey: ['conversations'] });
          }
        },
      );
    } else {
      sendMessage.mutate(text);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.back}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Avatar name={otherUser?.name ?? 'Chat'} color={otherUser?.avatarColor} size={44} />
        <View style={styles.headerText}>
          <Text style={styles.headerName} numberOfLines={1}>
            {otherUser?.name ?? 'Conversation'}
          </Text>
          {otherUser?.role ? (
            <Text style={styles.headerRole}>{otherUser.role.charAt(0).toUpperCase() + otherUser.role.slice(1)}</Text>
          ) : null}
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={invertedRows}
        inverted
        keyExtractor={(row) => row.key}
        contentContainerStyle={styles.messages}
        showsVerticalScrollIndicator={false}
        // Smooth, native-feeling scroll: an inverted list naturally opens at
        // the bottom (newest message) and only needs to render upward as the
        // person scrolls back, rather than measuring/jumping to the end of a
        // normal list on every load.
        renderItem={({ item }) =>
          item.kind === 'date' ? (
            <DateSeparator label={item.label} />
          ) : (
            <ChatBubble
              text={item.message.text}
              mine={item.message.senderId === myId}
              time={item.showTime ? formatMessageTime(item.message.createdAt) : undefined}
              grouped={!item.showTime}
            />
          )
        }
        ListHeaderComponent={typing ? <TypingIndicator /> : null}
      />

      {lastMineMessage ? (
        <Text style={styles.seenStatus}>{lastMineMessage.isRead ? 'Seen' : 'Delivered'}</Text>
      ) : null}

      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={colors.textMuted}
          value={draft}
          onChangeText={onChangeDraft}
          onSubmitEditing={onSend}
          returnKeyType="send"
          multiline
        />
        <Pressable style={styles.sendButton} onPress={onSend} hitSlop={8}>
          <Text style={styles.sendArrow}>→</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    back: {
      marginRight: spacing.sm,
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'center',
    },
    backArrow: {
      fontSize: 26,
      color: colors.textPrimary,
    },
    headerText: {
      marginLeft: spacing.md,
      flexShrink: 1,
    },
    headerName: {
      ...typography.headingM,
    },
    headerRole: {
      ...typography.caption,
      marginTop: 2,
    },
    messages: {
      padding: spacing.lg,
      flexGrow: 1,
      justifyContent: 'flex-end',
    },
    seenStatus: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'right',
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.xs,
    },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    input: {
      flex: 1,
      minHeight: layout.inputHeight,
      maxHeight: 120,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
      fontSize: 15,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
    },
    sendButton: {
      width: 48,
      height: 48,
      borderRadius: radius.circle,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: spacing.md,
    },
    sendArrow: {
      color: colors.textOnPrimary,
      fontSize: 22,
      fontWeight: '700',
    },
  });
