import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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

import { useConversation, useMessages, useSendMessage } from '@/api/messages';
import { Avatar } from '@/components/Avatar';
import { ChatBubble } from '@/components/ChatBubble';
import { LoadingState } from '@/components/StateViews';
import { TypingIndicator } from '@/components/TypingIndicator';
import { colors } from '@/constants/colors';
import { layout, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { getSocket } from '@/services/socket';
import { Message } from '@/types';

const ME = 'me';

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: conversation } = useConversation(id);
  const { data: history, isLoading } = useMessages(id);
  const sendMessage = useSendMessage(id);

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  // Seed local state from history once it loads.
  useEffect(() => {
    if (history) setMessages(history);
  }, [history]);

  // Join the socket room and listen for inbound messages / typing events.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('join', { conversationId: id });

    const onMessage = (msg: Message) => {
      if (msg.conversationId === id) setMessages((prev) => [...prev, msg]);
    };
    const onTyping = (payload: { conversationId: string; typing: boolean }) => {
      if (payload.conversationId === id) setTyping(payload.typing);
    };

    socket.on('message', onMessage);
    socket.on('typing', onTyping);
    return () => {
      socket.emit('leave', { conversationId: id });
      socket.off('message', onMessage);
      socket.off('typing', onTyping);
    };
  }, [id]);

  const scrollToEnd = () => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  const onSend = () => {
    const text = draft.trim();
    if (!text) return;

    const optimistic: Message = {
      id: `local_${Date.now()}`,
      conversationId: id,
      senderId: ME,
      text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    scrollToEnd();

    const socket = getSocket();
    if (socket) {
      socket.emit('message', { conversationId: id, text });
    } else {
      // Mock mode: persist via REST and simulate a short typing + reply.
      sendMessage.mutate(text);
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `reply_${Date.now()}`,
            conversationId: id,
            senderId: conversation?.participantId ?? 'them',
            text: 'Got it — thanks for the update! 👍',
            createdAt: new Date().toISOString(),
          },
        ]);
        scrollToEnd();
      }, 1600);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.back}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Avatar
          name={conversation?.participantName ?? 'Chat'}
          color={conversation?.avatarColor}
          size={44}
        />
        <View style={styles.headerText}>
          <Text style={styles.headerName}>{conversation?.participantName ?? 'Conversation'}</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: conversation?.online ? colors.success : colors.textMuted },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: conversation?.online ? colors.success : colors.textMuted },
              ]}
            >
              {conversation?.online ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messages}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToEnd}
        ListHeaderComponent={<Text style={styles.dayLabel}>Today</Text>}
        renderItem={({ item }) => <ChatBubble text={item.text} mine={item.senderId === ME} />}
        ListFooterComponent={typing ? <TypingIndicator /> : null}
      />

      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={colors.textMuted}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={onSend}
          returnKeyType="send"
          multiline
        />
        <Pressable style={styles.sendButton} onPress={onSend}>
          <Text style={styles.sendArrow}>→</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  messages: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  dayLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
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
