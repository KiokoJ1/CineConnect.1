import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { useSendMessageRequest, useUser } from '@/api/users';
import { BackHeader } from '@/components/BackHeader';
import { Button } from '@/components/Button';
import { FreelancerProfileView } from '@/components/FreelancerProfileView';
import { ScreenContainer } from '@/components/ScreenContainer';
import { EmptyState, LoadingState } from '@/components/StateViews';

export default function TalentProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: user, isLoading } = useUser(id);
  const sendRequest = useSendMessageRequest();
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

  const onMessage = () => {
    sendRequest.mutate(user.id, {
      onSuccess: () =>
        Alert.alert('Request sent', `Your message request to ${user.name} has been sent.`),
      onError: () => Alert.alert('Could not send', 'Please try again.'),
    });
  };

  return (
    <FreelancerProfileView
      user={user}
      onBack={goBack}
      footer={
        <View style={styles.footer}>
          <Button
            label="✉️  Send Message Request"
            onPress={onMessage}
            loading={sendRequest.isPending}
          />
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
