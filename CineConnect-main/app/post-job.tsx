import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { useCreateJob } from '@/api/jobs';
import { BackHeader } from '@/components/BackHeader';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Select } from '@/components/Select';
import { DEPARTMENTS } from '@/constants/categories';
import { spacing } from '@/constants/layout';

export default function PostJobScreen() {
  const router = useRouter();
  const createJob = useCreateJob();

  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dayRate, setDayRate] = useState('');
  const [description, setDescription] = useState('');

  const onSubmit = () => {
    if (!title.trim() || !department || !location.trim() || !dayRate.trim()) {
      Alert.alert('Missing details', 'Please fill in the title, department, location and rate.');
      return;
    }
    const rate = Number(dayRate.replace(/[^0-9]/g, ''));
    if (!rate) {
      Alert.alert('Invalid rate', 'Enter the day rate as a number, e.g. 8000.');
      return;
    }
    createJob.mutate(
      {
        title: title.trim(),
        department,
        location: location.trim(),
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        dayRate: rate,
        description: description.trim(),
      },
      {
        onSuccess: () => {
          Alert.alert('Job posted', `"${title.trim()}" is now live.`);
          router.back();
        },
        onError: () => Alert.alert('Could not post job', 'Please try again.'),
      },
    );
  };

  return (
    <ScreenContainer>
      <BackHeader label="Post a Job" emphasis="bold" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Input
            label="Job Title"
            placeholder="e.g. Director of Photography"
            value={title}
            onChangeText={setTitle}
          />
          <Select
            label="Department"
            placeholder="Select department"
            value={department}
            options={DEPARTMENTS}
            onChange={setDepartment}
          />
          <Input
            label="Location"
            placeholder="e.g. Nairobi, Kenya"
            value={location}
            onChangeText={setLocation}
          />

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Input
                label="Start Date"
                placeholder="Jul 10, 2025"
                value={startDate}
                onChangeText={setStartDate}
              />
            </View>
            <View style={styles.dateField}>
              <Input
                label="End Date"
                placeholder="Jul 15, 2025"
                value={endDate}
                onChangeText={setEndDate}
              />
            </View>
          </View>

          <Input
            label="Day Rate (KES)"
            placeholder="e.g. 8,000"
            keyboardType="number-pad"
            value={dayRate}
            onChangeText={setDayRate}
          />
          <Input
            label="Description"
            placeholder="Describe the role and requirements..."
            textarea
            value={description}
            onChangeText={setDescription}
          />

          <Button label="Post Job" onPress={onSubmit} loading={createJob.isPending} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dateField: {
    flex: 1,
  },
});
