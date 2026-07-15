import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useMyProfile, useUpdateProfile } from '@/api/profile';
import { Avatar } from '@/components/Avatar';
import { BackHeader } from '@/components/BackHeader';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Select } from '@/components/Select';
import { LoadingState } from '@/components/StateViews';
import { ThemeColors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';

const EXPERIENCE_OPTIONS = ['Entry Level', 'Intermediate', 'Experienced', 'Expert'] as const;

/** Opens the photo library, compresses on the way out, returns a data URI ready to send to the backend. */
async function pickPhoto(aspect: [number, number]): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permission needed', 'Allow photo library access to set a photo.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 0.5, // keeps the base64 payload well under the backend's 8MB body limit
    base64: true,
  });

  if (result.canceled || !result.assets[0]?.base64) return null;
  const asset = result.assets[0];
  const mime = asset.mimeType ?? 'image/jpeg';
  return `data:${mime};base64,${asset.base64}`;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const authUser = useAuthStore((s) => s.user);
  const { data: profile, isLoading } = useMyProfile();
  const updateProfile = useUpdateProfile();
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);

  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [skills, setSkills] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Pre-fill the form once the current profile loads — only once, so the
  // person's in-progress edits aren't clobbered by a background refetch.
  useEffect(() => {
    if (hydrated) return;
    if (profile === undefined) return; // still loading
    setBio(profile?.bio ?? '');
    setLocation(profile?.location ?? '');
    setSkills(profile?.skills ?? '');
    setExperienceLevel(profile?.experienceLevel ?? null);
    setProfilePhoto(profile?.profilePhoto ?? null);
    setCoverPhoto(profile?.coverPhoto ?? null);
    setHydrated(true);
  }, [profile, hydrated]);

  const onPickProfilePhoto = async () => {
    const uri = await pickPhoto([1, 1]);
    if (uri) setProfilePhoto(uri);
  };

  const onPickCoverPhoto = async () => {
    const uri = await pickPhoto([16, 9]);
    if (uri) setCoverPhoto(uri);
  };

  const onSave = () => {
    updateProfile.mutate(
      {
        bio,
        location,
        skills,
        experienceLevel: experienceLevel ?? '',
        profilePhoto,
        coverPhoto,
        // Round-tripped as-is — this screen doesn't edit these, but the
        // backend save is a full replace, so omitting them would erase them.
        portfolioUrl: profile?.portfolioUrl ?? undefined,
        availabilityStatus: profile?.availabilityStatus ?? undefined,
        rateAmount: profile?.rateAmount ?? undefined,
        rateCurrency: profile?.rateCurrency ?? undefined,
        paymentModes: profile?.paymentModes ?? undefined,
      },
      {
        onSuccess: () => {
          Alert.alert('Profile saved', 'Your changes have been saved.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        },
        onError: (error: any) => {
          const message = error?.response?.data?.errors?.join('\n') ?? error?.response?.data?.message;
          Alert.alert('Could not save profile', message ?? 'Please try again.');
        },
      },
    );
  };

  if (isLoading || !hydrated) {
    return (
      <ScreenContainer>
        <BackHeader label="Back to profile" />
        <LoadingState />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false}>
      <View style={styles.headerPad}>
        <BackHeader label="Back to profile" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Pressable onPress={onPickCoverPhoto} style={styles.coverWrap}>
          {coverPhoto ? (
            <Image source={{ uri: coverPhoto }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <Text style={styles.coverPlaceholderText}>Tap to add a cover photo</Text>
            </View>
          )}
          <View style={styles.coverEditBadge}>
            <Text style={styles.editBadgeIcon}>✎</Text>
          </View>
        </Pressable>

        <View style={styles.avatarRow}>
          <Pressable onPress={onPickProfilePhoto} style={styles.avatarWrap}>
            <Avatar name={authUser?.name ?? ''} color={authUser?.avatarColor} photoUri={profilePhoto} size={96} />
            <View style={styles.avatarEditBadge}>
              <Text style={styles.editBadgeIcon}>✎</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.form}>
          <Input
            label="Bio"
            textarea
            placeholder="Tell producers about yourself and your work..."
            value={bio}
            onChangeText={setBio}
            maxLength={1000}
          />

          <Input
            label="Skills"
            placeholder="e.g. Cinematography, Drone Operation, Color Grading"
            value={skills}
            onChangeText={setSkills}
            maxLength={1000}
          />
          <Text style={styles.hint}>Separate multiple skills with commas.</Text>

          <Select
            label="Experience"
            placeholder="Select your experience level"
            value={experienceLevel}
            options={EXPERIENCE_OPTIONS}
            onChange={setExperienceLevel}
          />

          <Input
            label="Location"
            placeholder="e.g. Nairobi, Kenya"
            value={location}
            onChangeText={setLocation}
            maxLength={100}
          />

          <Button
            label={updateProfile.isPending ? 'Saving...' : 'Save Changes'}
            onPress={onSave}
            loading={updateProfile.isPending}
            style={styles.saveButton}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
    headerPad: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    scroll: {
      paddingBottom: spacing.xxxl,
    },
    coverWrap: {
      width: '100%',
    },
    cover: {
      width: '100%',
      height: 160,
    },
    coverPlaceholder: {
      backgroundColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    coverPlaceholderText: {
      ...typography.caption,
      fontWeight: '600',
    },
    coverEditBadge: {
      position: 'absolute',
      right: spacing.lg,
      bottom: spacing.md,
      width: 36,
      height: 36,
      borderRadius: radius.circle,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarRow: {
      alignItems: 'center',
      marginTop: -48,
    },
    avatarWrap: {
      borderWidth: 4,
      borderColor: colors.background,
      borderRadius: radius.circle,
    },
    avatarEditBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 32,
      height: 32,
      borderRadius: radius.circle,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.background,
    },
    editBadgeIcon: {
      color: colors.textOnPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
    form: {
      paddingHorizontal: spacing.lg,
      marginTop: spacing.xl,
    },
    hint: {
      ...typography.caption,
      marginTop: -spacing.md,
      marginBottom: spacing.lg,
    },
    saveButton: {
      marginTop: spacing.md,
    },
  });
