import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useFollowActions, useFollowStatus } from '@/api/follows';
import { usePortfolio } from '@/api/portfolio';
import { useUser } from '@/api/users';
import { BackHeader } from '@/components/BackHeader';
import { Button } from '@/components/Button';
import { FreelancerProfileView } from '@/components/FreelancerProfileView';
import { ScreenContainer } from '@/components/ScreenContainer';
import { EmptyState, LoadingState } from '@/components/StateViews';
import { spacing } from '@/constants/layout';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';

export default function TalentProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: user, isLoading } = useUser(id);
  const viewerRole = useAuthStore((s) => s.role);
  const { colors } = useTheme();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const { data: followStatus } = useFollowStatus(id);
  const { follow, unfollow } = useFollowActions(id);
  const { data: portfolio } = usePortfolio(id);

  if (isLoading) {
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  }

  if (!user) {
    return (
      <ScreenContainer>
        <BackHeader label="Back" />
        <EmptyState emoji="👤" label="This profile is unavailable." />
      </ScreenContainer>
    );
  }

  // Chats have no separate "conversation" record — the thread is created by
  // its first message (see MESSAGING_UI.md) — so this just opens the real
  // chat screen for this user; name/avatar are passed along as params so
  // the header renders correctly before any message exists yet.
  const onMessage = () => {
    router.push({
      pathname: '/chat/[id]',
      params: { id: user.id, name: user.name, avatarColor: user.avatarColor ?? '' },
    });
  };

  // "Hire" opens the same chat with a starter message pre-filled — there's
  // no separate formal offer/contract flow yet (see FOLLOW_SOCIAL.md's
  // known gaps), so hiring starts as a conversation, same as any other
  // Producer/freelancer contact.
  const onHire = () => {
    router.push({
      pathname: '/chat/[id]',
      params: {
        id: user.id,
        name: user.name,
        avatarColor: user.avatarColor ?? '',
        draft: `Hi ${user.name}, I'd like to hire you for a project. Are you available?`,
      },
    });
  };

  const onToggleFollow = () => {
    if (followStatus?.isFollowing) unfollow.mutate();
    else follow.mutate();
  };

  // A producer/client hiring a freelancer is the only direction "Hire" makes
  // sense for — a freelancer viewing another freelancer, or anyone viewing
  // their own profile some other way, shouldn't see it.
  const canHire = (viewerRole === 'producer' || viewerRole === 'client') && user.role === 'freelancer';
  const isFollowPending = follow.isPending || unfollow.isPending;

  return (
    <FreelancerProfileView
      user={user}
      onBack={goBack}
      portfolioItems={portfolio ?? []}
      header={
        <View style={styles.followCounts}>
          <Text style={[styles.followCountsText, { color: colors.textSecondary }]}>
            <Text style={[styles.followCountsNumber, { color: colors.textPrimary }]}>
              {followStatus?.followerCount ?? 0}
            </Text>{' '}
            followers ·{' '}
            <Text style={[styles.followCountsNumber, { color: colors.textPrimary }]}>
              {followStatus?.followingCount ?? 0}
            </Text>{' '}
            following
          </Text>
        </View>
      }
      footer={
        <View style={styles.footer}>
          <Button
            label={followStatus?.isFollowing ? 'Following' : 'Follow'}
            variant={followStatus?.isFollowing ? 'success-outline' : 'primary'}
            loading={isFollowPending}
            onPress={onToggleFollow}
          />
          <View style={styles.gap} />
          <Button label="✉️  Message" variant="outline" onPress={onMessage} />
          {canHire ? (
            <>
              <View style={styles.gap} />
              <Button label="🤝  Hire" onPress={onHire} />
            </>
          ) : null}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  footer: {
    marginTop: 0,
  },
  gap: {
    height: spacing.md,
  },
  followCounts: {
    marginBottom: spacing.md,
  },
  followCountsText: {
    fontSize: 14,
  },
  followCountsNumber: {
    fontWeight: '700',
  },
});
