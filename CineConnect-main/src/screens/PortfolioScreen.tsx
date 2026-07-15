import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  PortfolioItem,
  useAddPortfolioItem,
  useDeletePortfolioItem,
  useMyPortfolio,
  useSetPortfolioFeatured,
} from '@/api/portfolio';
import { BackHeader } from '@/components/BackHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { PortfolioGrid } from '@/components/PortfolioGrid';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Select } from '@/components/Select';
import { LoadingState } from '@/components/StateViews';
import { ThemeColors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { extractErrorMessage } from '@/utils/errors';

const MEDIA_TYPE_OPTIONS = ['Image', 'Video'] as const;

export default function PortfolioScreen() {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);

  const { data: items, isLoading } = useMyPortfolio();
  const addItem = useAddPortfolioItem();
  const setFeatured = useSetPortfolioFeatured();
  const deleteItem = useDeletePortfolioItem();

  const [adding, setAdding] = useState(false);
  const [mediaTypeLabel, setMediaTypeLabel] = useState<(typeof MEDIA_TYPE_OPTIONS)[number] | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [pickedImageUri, setPickedImageUri] = useState<string | null>(null);
  const [title, setTitle] = useState('');

  const resetForm = () => {
    setAdding(false);
    setMediaTypeLabel(null);
    setVideoUrl('');
    setPickedImageUri(null);
    setTitle('');
  };

  const onPickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to add a portfolio image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    const asset = result.assets[0];
    setPickedImageUri(`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);
  };

  const onSubmit = () => {
    if (mediaTypeLabel === 'Image') {
      if (!pickedImageUri) {
        Alert.alert('Choose a photo', 'Pick an image from your library first.');
        return;
      }
      addItem.mutate(
        { mediaType: 'image', mediaUrl: pickedImageUri, title: title.trim() || null },
        { onSuccess: resetForm, onError: (err) => Alert.alert('Could not add image', extractErrorMessage(err) ?? 'Please try again.') },
      );
    } else if (mediaTypeLabel === 'Video') {
      if (!videoUrl.trim()) {
        Alert.alert('Missing link', 'Paste a YouTube, Vimeo, or other video URL.');
        return;
      }
      addItem.mutate(
        { mediaType: 'video', mediaUrl: videoUrl.trim(), title: title.trim() || null },
        { onSuccess: resetForm, onError: (err) => Alert.alert('Could not add video', extractErrorMessage(err) ?? 'Please try again.') },
      );
    } else {
      Alert.alert('Choose a type', 'Select Image or Video first.');
    }
  };

  const onToggleFeatured = (item: PortfolioItem) => {
    setFeatured.mutate({ portfolioItemId: item.portfolioItemId, isFeatured: !item.isFeatured });
  };

  const onDelete = (item: PortfolioItem) => {
    Alert.alert('Remove item?', `Remove "${item.title || 'this item'}" from your portfolio?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteItem.mutate(item.portfolioItemId) },
    ]);
  };

  return (
    <ScreenContainer>
      <BackHeader label="Portfolio" emphasis="bold" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.hint}>
            Showcase images and videos of your work. Tap the star on any item to feature it.
          </Text>

          {isLoading ? (
            <LoadingState />
          ) : (
            <PortfolioGrid
              items={items ?? []}
              editable
              onToggleFeatured={onToggleFeatured}
              onDelete={onDelete}
              emptyLabel="No portfolio items yet — add your first below."
            />
          )}

          {adding ? (
            <Card style={styles.form}>
              <Select
                label="Type"
                placeholder="Image or Video"
                value={mediaTypeLabel}
                options={MEDIA_TYPE_OPTIONS}
                onChange={(v) => setMediaTypeLabel(v as (typeof MEDIA_TYPE_OPTIONS)[number])}
              />

              {mediaTypeLabel === 'Image' ? (
                <View style={styles.imagePickRow}>
                  <Button
                    label={pickedImageUri ? 'Change Photo' : 'Choose Photo'}
                    variant="outline"
                    compact
                    onPress={onPickImage}
                  />
                  {pickedImageUri ? <Text style={styles.pickedLabel}>Photo selected ✓</Text> : null}
                </View>
              ) : null}

              {mediaTypeLabel === 'Video' ? (
                <Input
                  label="Video URL"
                  placeholder="https://youtube.com/watch?v=..."
                  autoCapitalize="none"
                  value={videoUrl}
                  onChangeText={setVideoUrl}
                />
              ) : null}

              <Input
                label="Title (optional)"
                placeholder="e.g. Wedding Highlight Reel"
                value={title}
                onChangeText={setTitle}
              />

              <View style={styles.formActions}>
                <Button label="Cancel" variant="outline" compact style={styles.formButton} onPress={resetForm} />
                <Button
                  label="Add to Portfolio"
                  compact
                  style={styles.formButton}
                  loading={addItem.isPending}
                  onPress={onSubmit}
                />
              </View>
            </Card>
          ) : (
            <Button label="+ Add Portfolio Item" onPress={() => setAdding(true)} style={styles.addButton} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
    flex: { flex: 1 },
    scroll: {
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.lg,
    },
    form: {
      marginTop: spacing.lg,
    },
    imagePickRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    pickedLabel: {
      ...typography.caption,
      color: colors.success,
      fontWeight: '600',
    },
    formActions: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    formButton: {
      flex: 1,
    },
    addButton: {
      marginTop: spacing.xl,
    },
  });
