import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { parseSkills, useProfileByUserId, useProfileStats } from '@/api/profile';
import { useUser } from '@/api/users';
import { useFollowActions, useFollowStatus } from '@/api/follows';
import { useReviews } from '@/api/reviews';
import { BackHeader } from '@/components/BackHeader';
import { Button } from '@/components/Button';
import { FreelancerProfileView } from '@/components/FreelancerProfileView';
import { ScreenContainer } from '@/components/ScreenContainer';
import { EmptyState, LoadingState } from '@/components/StateViews';
import { spacing } from '@/constants/layout';
import { useAuthStore } from '@/store/authStore';
import { User } from '@/types';

export default function TalentProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const myRole = useAuthStore((s) => s.role);
  const { data: user, isLoading } = useUser(id);
  // A brand-new account may not have filled in a profile yet — that 404 is
  // expected, not an error, so the base identity from useUser still renders.
  const { data: profile } = useProfileByUserId(id);
  const { data: followStatus } = useFollowStatus(id);
  const { follow, unfollow } = useFollowActions(id);
  const { data: profileStats } = useProfileStats(id);
  const { data: reviewsData } = useReviews(id);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

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

  const displayUser: User = {
    ...user,
    bio: profile?.bio ?? undefined,
    city: profile?.location ?? user.city,
    experienceLevel: profile?.experienceLevel ?? undefined,
    skills: parseSkills(profile?.skills),
    dayRate: profile?.rateAmount ?? user.dayRate,
    photoUri: profile?.profilePhoto,
    coverPhotoUri: profile?.coverPhoto,
    followerCount: followStatus?.followerCount,
    followingCount: followStatus?.followingCount,
    rating: profileStats?.avgRating ?? reviewsData?.avgRating,
    reviewCount: profileStats?.totalReviews ?? reviewsData?.totalReviews,
    completedJobs: profileStats?.completedJobs,
    totalApplications: profileStats?.totalApplications,
  };

  const onToggleFollow = () => {
    const action = followStatus?.isFollowing ? unfollow : follow;
    action.mutate(undefined, {
      onError: () => Alert.alert('Something went wrong', 'Please try again.'),
    });
  };

  const onHire = () => {
    Alert.alert('Hire ' + user.name + '?', "This opens a chat so you can discuss the project and rate.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start Chat',
        onPress: () =>
          router.push({
            pathname: `/chat/${user.id}`,
            params: { draft: `Hi ${user.name}, I'd like to hire you for a project. Are you available?` },
          }),
      },
    ]);
  };

  // Hiring is a producer action; a freelancer viewing another freelancer's
  // profile (e.g. from Browse Talent while switched to that role) doesn't
  // get a Hire button, only Follow/Message.
  const canHire = myRole === 'producer';

  return (
    <FreelancerProfileView
      user={displayUser}
      reviews={reviewsData?.reviews}
      onBack={goBack}
      footer={
        <View style={styles.footer}>
          <View style={styles.row}>
            <Button
              label={followStatus?.isFollowing ? 'Unfollow' : 'Follow'}
              variant={followStatus?.isFollowing ? 'outline' : 'primary'}
              onPress={onToggleFollow}
              loading={follow.isPending || unfollow.isPending}
              style={styles.flexButton}
            />
            <Button
              label="✉️ Message"
              variant="outline"
              onPress={() => router.push(`/chat/${user.id}`)}
              style={styles.flexButton}
            />
          </View>
          {canHire ? <Button label="Hire" onPress={onHire} style={styles.hireButton} /> : null}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  footer: {
    marginTop: 0,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flexButton: {
    flex: 1,
  },
  hireButton: {
    marginTop: spacing.md,
  },
});
