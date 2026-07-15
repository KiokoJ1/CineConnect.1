import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { useConversation, useMarkThreadRead, useMessages, useSendMessage } from '@/api/messages';
import { Avatar } from '@/components/Avatar';
import { ChatBubble, MessageDeliveryStatus } from '@/components/ChatBubble';
import { LoadingState } from '@/components/StateViews';
import { TypingIndicator } from '@/components/TypingIndicator';
import { ThemeColors } from '@/constants/colors';
import { layout, radius, spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { getSocket } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';
import { Message } from '@/types';
import { formatDayDivider } from '@/utils/format';

type Row = { kind: 'divider'; label: string; key: string } | { kind: 'message'; message: Message; key: string };

/** Groups chronological messages into day-divider + bubble rows for the FlatList, Instagram-style. */
function buildRows(messages: Message[]): Row[] {
  const rows: Row[] = [];
  let lastDivider: string | null = null;
  for (const m of messages) {
    const divider = formatDayDivider(m.createdAt);
    if (divider !== lastDivider) {
      rows.push({ kind: 'divider', label: divider, key: `divider_${divider}_${m.id}` });
      lastDivider = divider;
    }
    rows.push({ kind: 'message', message: m, key: m.id });
  }
  return rows;
}

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography } = useTheme();
  const { isTablet } = useResponsive();
  const styles = getStyles(colors, typography);
  const params = useLocalSearchParams<{ id: string; name?: string; avatarColor?: string; draft?: string }>();
  const id = params.id;

  const myId = useAuthStore((s) => s.user?.id);
  const cachedConversation = useConversation(id);
  const { data: history, isLoading } = useMessages(id);
  const sendMessage = useSendMessage(id);
  const markRead = useMarkThreadRead(id);

  const participantName = cachedConversation?.participantName ?? params.name ?? 'Conversation';
  const participantAvatarColor = cachedConversation?.avatarColor ?? params.avatarColor;

  const [draft, setDraft] = useState(params.draft ?? '');
  const [theirTyping, setTheirTyping] = useState(false);
  const [online, setOnline] = useState(false);
  const listRef = useRef<FlatList<Row>>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messages = history ?? [];

  // Mark the thread read whenever this screen is focused (opening a
  // conversation reads the whole thread, mirroring Instagram) — also
  // re-runs whenever new messages arrive while the screen stays open.
  useFocusEffect(
    useCallback(() => {
      if (id) markRead.mutate();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, messages.length]),
  );

  // Presence + typing — purely live, socket-driven, nothing persisted.
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !id) return;

    socket.emit('presence:check', { userId: Number(id) }, (res: { online: boolean }) => {
      setOnline(!!res?.online);
    });

    const onPresence = (payload: { userId: number; online: boolean }) => {
      if (String(payload.userId) === id) setOnline(payload.online);
    };
    const onTyping = (payload: { fromUserId: number; typing: boolean }) => {
      if (String(payload.fromUserId) === id) setTheirTyping(payload.typing);
    };

    socket.on('presence:changed', onPresence);
    socket.on('typing', onTyping);
    return () => {
      socket.off('presence:changed', onPresence);
      socket.off('typing', onTyping);
    };
  }, [id]);

  const scrollToEnd = () => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  const emitTyping = (typing: boolean) => {
    const socket = getSocket();
    socket?.emit('typing', { toUserId: Number(id), typing });
  };

  const onChangeDraft = (text: string) => {
    setDraft(text);
    emitTyping(text.length > 0);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => emitTyping(false), 2000);
  };

  const onSend = () => {
    const text = draft.trim();
    if (!text || sendMessage.isPending) return;
    setDraft('');
    emitTyping(false);
    sendMessage.mutate(text, { onSuccess: scrollToEnd, onError: () => setDraft(text) });
    scrollToEnd();
  };

  const rows = useMemo(() => buildRows(messages), [messages]);

  // Delivery status only shown on my own most-recent outgoing bubble.
  const lastMineId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderId === myId) return messages[i].id;
    }
    return null;
  }, [messages, myId]);

  const statusFor = (m: Message): MessageDeliveryStatus | undefined => {
    if (m.senderId !== myId || m.id !== lastMineId) return undefined;
    if (m.isRead) return 'seen';
    return online ? 'delivered' : 'sent';
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.back}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Avatar name={participantName} color={participantAvatarColor} size={44} />
        <View style={styles.headerText}>
          <Text style={styles.headerName} numberOfLines={1}>
            {participantName}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: online ? colors.success : colors.textMuted }]} />
            <Text style={[styles.statusText, { color: online ? colors.success : colors.textMuted }]}>
              {theirTyping ? 'Typing…' : online ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.body, isTablet && styles.bodyWide]}>
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(r) => r.key}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToEnd}
          renderItem={({ item }) =>
            item.kind === 'divider' ? (
              <Text style={styles.dayLabel}>{item.label}</Text>
            ) : (
              <ChatBubble
                text={item.message.text}
                mine={item.message.senderId === myId}
                createdAt={item.message.createdAt}
                status={statusFor(item.message)}
              />
            )
          }
          ListEmptyComponent={<Text style={styles.emptyLabel}>Say hi 👋 — this is the start of your conversation.</Text>}
          ListFooterComponent={theirTyping ? <TypingIndicator /> : null}
        />

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
          <Pressable
            style={[styles.sendButton, !draft.trim() && styles.sendButtonDisabled]}
            onPress={onSend}
            disabled={!draft.trim() || sendMessage.isPending}
          >
            <Text style={styles.sendArrow}>→</Text>
          </Pressable>
        </View>
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
    },
    backArrow: {
      fontSize: 26,
      color: colors.textPrimary,
    },
    headerText: {
      marginLeft: spacing.md,
      flex: 1,
    },
    headerName: {
      ...typography.headingM,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: radius.circle,
      marginRight: 6,
    },
    statusText: {
      fontSize: 13,
      fontWeight: '600',
    },
    // On tablet/web, cap the chat column width and centre it — full-bleed
    // bubbles at 1200px wide read poorly, same responsive pattern used by
    // the two-column layouts elsewhere in the app (see my-applications.tsx).
    body: {
      flex: 1,
      width: '100%',
    },
    bodyWide: {
      maxWidth: 720,
      alignSelf: 'center',
    },
    messages: {
      padding: spacing.lg,
      flexGrow: 1,
    },
    dayLabel: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: spacing.lg,
      marginTop: spacing.sm,
    },
    emptyLabel: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.xxl,
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
    sendButtonDisabled: {
      opacity: 0.5,
    },
    sendArrow: {
      color: colors.textOnPrimary,
      fontSize: 22,
      fontWeight: '700',
    },
  });
