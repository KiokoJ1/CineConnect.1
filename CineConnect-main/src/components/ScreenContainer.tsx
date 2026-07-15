import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { layout } from '@/constants/layout';
import { useTheme } from '@/hooks/useTheme';

interface ScreenContainerProps {
  children: ReactNode;
  /** Apply the standard 16px horizontal screen padding. */
  padded?: boolean;
  background?: string;
  edges?: Edge[];
  style?: ViewStyle;
}

export function ScreenContainer({
  children,
  padded = true,
  background,
  edges = ['top'],
  style,
}: ScreenContainerProps) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background ?? colors.background }]} edges={edges}>
      <View style={[styles.inner, padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: layout.screenPadding,
  },
});
