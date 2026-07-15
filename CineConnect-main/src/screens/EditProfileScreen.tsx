import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  FilmCredit,
  joinSkills,
  parseSkills,
  useAddCredit,
  useDeleteCredit,
  useMyCredits,
  useMyProfile,
  useUpsertProfile,
} from '@/api/profile';
import { Avatar } from '@/components/Avatar';
import { BackHeader } from '@/components/BackHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Select } from '@/components/Select';
import { LoadingState } from '@/components/StateViews';
import { EXPERIENCE_LEVELS } from '@/constants/categories';
import { ThemeColors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { extractErrorMessage } from '@/utils/errors';

/** Opens the device photo library and returns a `data:` URI, or null if cancelled/denied. */
async function pickImage(aspect: [number, number]): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permission needed', 'Allow photo library access to change this picture.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 0.5, // keeps the base64 payload comfortably under the backend's per-image cap
    base64: true,
  });

  if (result.canceled || !result.assets?.[0]?.base64) return null;
  const asset = result.assets[0];
  return `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  const user = useAuthStore((s) => s.user);

  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const { data: credits, isLoading: creditsLoading } = useMyCredits();
  const upsertProfile = useUpsertProfile();
  const addCredit = useAddCredit();
  const deleteCredit = useDeleteCredit();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<string | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const [addingCredit, setAddingCredit] = useState(false);
  const [creditTitle, setCreditTitle] = useState('');
  const [creditRole, setCreditRole] = useState('');
  const [creditYear, setCreditYear] = useState('');

  // Seed local edit state from the fetched profile exactly once — after
  // that, this screen owns the fields until Save/leave, so a background
  // refetch doesn't clobber what the person is mid-typing.
  useEffect(() => {
    if (hydrated || profileLoading) return;
    setAvatarUrl(profile?.avatarUrl ?? null);
    setCoverUrl(profile?.coverUrl ?? null);
    setBio(profile?.bio ?? '');
    setLocation(profile?.location ?? '');
    setExperienceLevel(profile?.experienceLevel ?? null);
    setSkills(parseSkills(profile?.skills));
    setHydrated(true);
  }, [profile, profileLoading, hydrated]);

  const onPickAvatar = async () => {
    const uri = await pickImage([1, 1]);
    if (uri) setAvatarUrl(uri);
  };
  const onPickCover = async () => {
    const uri = await pickImage([16, 9]);
    if (uri) setCoverUrl(uri);
  };

  const onAddSkill = () => {
    const clean = skillDraft.trim();
    if (!clean || skills.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      setSkillDraft('');
      return;
    }
    setSkills([...skills, clean]);
    setSkillDraft('');
  };
  const onRemoveSkill = (skill: string) => setSkills(skills.filter((s) => s !== skill));

  const onSubmitCredit = () => {
    if (!creditTitle.trim() || !creditRole.trim()) {
      Alert.alert('Missing details', 'Enter at least a project title and your role.');
      return;
    }
    addCredit.mutate(
      {
        title: creditTitle.trim(),
        role: creditRole.trim(),
        year: creditYear.trim() ? Number(creditYear.trim()) : null,
      },
      {
        onSuccess: () => {
          setCreditTitle('');
          setCreditRole('');
          setCreditYear('');
          setAddingCredit(false);
        },
        onError: (err) => Alert.alert('Could not add credit', extractErrorMessage(err) ?? 'Please try again.'),
      },
    );
  };

  const onDeleteCredit = (credit: FilmCredit) => {
    Alert.alert('Remove credit?', `Remove "${credit.title}" from your experience?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => deleteCredit.mutate(credit.creditId),
      },
    ]);
  };

  const onSave = () => {
    // Full-row upsert (see useUpsertProfile) — carry forward every field this
    // screen doesn't edit (rate, portfolio URL, availability, payment modes)
    // so saving a new bio can't silently wipe them.
    upsertProfile.mutate(
      {
        bio: bio.trim() || null,
        location: location.trim() || null,
        skills: joinSkills(skills) || null,
        experienceLevel,
        portfolioUrl: profile?.portfolioUrl ?? null,
        availabilityStatus: profile?.availabilityStatus ?? 'available',
        rateAmount: profile?.rateAmount ?? null,
        rateCurrency: profile?.rateCurrency ?? 'KES',
        paymentModes: profile?.paymentModes ?? null,
        avatarUrl,
        coverUrl,
      },
      {
        onSuccess: () => router.back(),
        onError: (err) => Alert.alert('Could not save', extractErrorMessage(err) ?? 'Please try again.'),
      },
    );
  };

  if (!user || (profileLoading && !hydrated)) {
    return (
      <ScreenContainer>
        <BackHeader label="Profile" emphasis="bold" />
        <LoadingState />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false}>
      <View style={styles.headerPad}>
        <BackHeader label="Edit Profile" emphasis="bold" />
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={onPickCover}>
            {coverUrl ? (
              <ImageBackground source={{ uri: coverUrl }} style={styles.cover}>
                <View style={styles.coverScrim}>
                  <Text style={styles.changeText}>Change cover photo</Text>
                </View>
              </ImageBackground>
            ) : (
              <View style={[styles.cover, styles.coverEmpty]}>
                <Text style={styles.changeText}>+ Add cover photo</Text>
              </View>
            )}
          </Pressable>

          <Pressable onPress={onPickAvatar} style={styles.avatarWrap}>
            <Avatar name={user.name} color={user.avatarColor} size={96} imageUri={avatarUrl} />
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarBadgeText}>✎</Text>
            </View>
          </Pressable>

          <View style={styles.form}>
            <Input
              label="Bio"
              placeholder="Tell producers a bit about your work..."
              textarea
              value={bio}
              onChangeText={setBio}
              maxLength={1000}
            />
            <Input
              label="Location"
              placeholder="e.g. Nairobi, Kenya"
              value={location}
              onChangeText={setLocation}
              maxLength={100}
            />
            <Select
              label="Experience Level"
              placeholder="Select experience level"
              value={experienceLevel}
              options={EXPERIENCE_LEVELS}
              onChange={setExperienceLevel}
            />

            <Text style={styles.sectionLabel}>Skills</Text>
            <View style={styles.chipRow}>
              {skills.map((skill) => (
                <Pressable key={skill} style={styles.chip} onPress={() => onRemoveSkill(skill)}>
                  <Text style={styles.chipText}>{skill}</Text>
                  <Text style={styles.chipRemove}>×</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.addSkillRow}>
              <View style={styles.addSkillInput}>
                <Input
                  placeholder="e.g. Steadicam"
                  value={skillDraft}
                  onChangeText={setSkillDraft}
                  onSubmitEditing={onAddSkill}
                  returnKeyType="done"
                />
              </View>
              <Button label="Add" variant="outline" compact onPress={onAddSkill} />
            </View>

            <Text style={styles.sectionLabel}>Experience</Text>
            {creditsLoading ? (
              <ActivityIndicator color={colors.primary} style={styles.creditsLoading} />
            ) : (
              (credits ?? []).map((credit) => (
                <Card key={credit.creditId} style={styles.creditCard}>
                  <View style={styles.creditRow}>
                    <View style={styles.creditText}>
                      <Text style={styles.creditTitle}>{credit.title}</Text>
                      <Text style={styles.creditMeta}>
                        {credit.role}
                        {credit.year ? ` · ${credit.year}` : ''}
                      </Text>
                    </View>
                    <Pressable onPress={() => onDeleteCredit(credit)} hitSlop={8}>
                      <Text style={styles.creditDelete}>Remove</Text>
                    </Pressable>
                  </View>
                </Card>
              ))
            )}

            {addingCredit ? (
              <Card style={styles.creditForm}>
                <Input label="Project Title" placeholder="e.g. Mali — Feature Film" value={creditTitle} onChangeText={setCreditTitle} />
                <Input label="Your Role" placeholder="e.g. Camera Operator" value={creditRole} onChangeText={setCreditRole} />
                <Input
                  label="Year"
                  placeholder="e.g. 2024"
                  keyboardType="number-pad"
                  value={creditYear}
                  onChangeText={setCreditYear}
                  maxLength={4}
                />
                <View style={styles.creditFormActions}>
                  <Button
                    label="Cancel"
                    variant="outline"
                    compact
                    style={styles.creditFormButton}
                    onPress={() => setAddingCredit(false)}
                  />
                  <Button
                    label="Add Credit"
                    compact
                    style={styles.creditFormButton}
                    loading={addCredit.isPending}
                    onPress={onSubmitCredit}
                  />
                </View>
              </Card>
            ) : (
              <Pressable onPress={() => setAddingCredit(true)} style={styles.addCreditRow}>
                <Text style={styles.addCreditText}>+ Add a film credit</Text>
              </Pressable>
            )}

            <Button
              label="Save Changes"
              onPress={onSave}
              loading={upsertProfile.isPending}
              style={styles.saveButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
    flex: { flex: 1 },
    headerPad: {
      paddingHorizontal: spacing.lg,
    },
    scroll: {
      paddingBottom: spacing.xxxl,
    },
    cover: {
      height: 140,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    coverEmpty: {
      backgroundColor: colors.avatarMuted,
    },
    coverScrim: {
      flex: 1,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    changeText: {
      color: colors.textOnPrimary,
      fontWeight: '600',
    },
    avatarWrap: {
      alignSelf: 'center',
      marginTop: -48,
    },
    avatarBadge: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 28,
      height: 28,
      borderRadius: radius.circle,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.background,
    },
    avatarBadgeText: {
      color: colors.textOnPrimary,
      fontSize: 13,
    },
    form: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
    },
    sectionLabel: {
      ...typography.headingM,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primarySoft,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      gap: spacing.xs,
    },
    chipText: {
      ...typography.label,
      color: colors.primary,
      fontWeight: '600',
    },
    chipRemove: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 15,
    },
    addSkillRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    addSkillInput: {
      flex: 1,
    },
    creditsLoading: {
      marginVertical: spacing.md,
    },
    creditCard: {
      marginBottom: spacing.sm,
    },
    creditRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    creditText: {
      flex: 1,
      marginRight: spacing.md,
    },
    creditTitle: {
      ...typography.body,
      fontWeight: '600',
    },
    creditMeta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    creditDelete: {
      ...typography.caption,
      color: colors.primary,
      fontWeight: '600',
    },
    creditForm: {
      marginBottom: spacing.md,
    },
    creditFormActions: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    creditFormButton: {
      flex: 1,
    },
    addCreditRow: {
      paddingVertical: spacing.sm,
      marginBottom: spacing.md,
    },
    addCreditText: {
      ...typography.body,
      color: colors.primary,
      fontWeight: '600',
    },
    saveButton: {
      marginTop: spacing.xl,
    },
  });
