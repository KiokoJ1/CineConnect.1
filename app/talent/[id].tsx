import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { parseSkills, useProfileByUserId } from '@/api/profile';
import { useUser } from '@/api/users';
import { BackHeader } from '@/components/BackHeader';
import { Button } from '@/components/Button';
import { FreelancerProfileView } from '@/components/FreelancerProfileView';
import { ScreenContainer } from '@/components/ScreenContainer';
import { EmptyState, LoadingState } from '@/components/StateViews';
import { User } from '@/types';

export default function TalentProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: user, isLoading } = useUser(id);
  // A brand-new account may not have filled in a profile yet — that 404 is
  // expected, not an error, so the base identity from useUser still renders.
  const { data: profile } = useProfileByUserId(id);
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
  };

  return (
    <FreelancerProfileView
      user={displayUser}
      onBack={goBack}
      footer={
        <View style={styles.footer}>
          <Button label="✉️  Message" onPress={() => router.push(`/chat/${user.id}`)} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  footer: {
    marginTop: 0,
  },
});
