import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemeColors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';

interface Slide {
  key: string;
  title: string;
  subtitle: string;
  illustration: 'crew' | 'profile' | 'pay';
}

const SLIDES: Slide[] = [
  {
    key: '1',
    title: 'Find Film Crew Fast',
    subtitle: 'Connect with skilled professionals for your next production in Kenya',
    illustration: 'crew',
  },
  {
    key: '2',
    title: 'Showcase Your Skills',
    subtitle: 'Build a profile that gets you noticed by top Kenyan productions',
    illustration: 'profile',
  },
  {
    key: '3',
    title: 'Get Paid Fairly',
    subtitle: 'Transparent day rates. No middlemen. Direct producer contact.',
    illustration: 'pay',
  },
];

function Illustration({ kind }: { kind: Slide['illustration'] }) {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  return (
    <View style={styles.illustration}>
      {kind === 'crew' && (
        <View style={styles.crew}>
          <View style={[styles.shape, styles.shapeGrey]} />
          <View style={[styles.shape, styles.shapeRed]} />
          <View style={[styles.shape, styles.shapeNavy]} />
        </View>
      )}
      {kind === 'profile' && (
        <View style={styles.profile}>
          <View style={styles.profileAvatar} />
          <View style={styles.profileLineLong} />
          <View style={styles.profileLineShort} />
        </View>
      )}
      {kind === 'pay' && (
        <View style={styles.pay}>
          <View style={styles.coin}>
            <Text style={styles.coinText}>KES</Text>
          </View>
          <View style={styles.payBars}>
            <View style={[styles.payBar, { height: 28 }]} />
            <View style={[styles.payBar, { height: 44 }]} />
            <View style={[styles.payBar, { height: 60 }]} />
          </View>
        </View>
      )}
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const finish = async () => {
    await AsyncStorage.setItem('cc_onboarded', 'true');
    router.replace('/register');
  };

  const onNext = () => {
    if (index < SLIDES.length - 1) {
      const next = index + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setIndex(next);
    } else {
      finish();
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    if (page !== index) setIndex(page);
  };

  const isLast = index === SLIDES.length - 1;

  return (
    <ScreenContainer padded={false}>
      <View style={styles.listWrap}>
        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(item) => item.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width }]}>
              <Illustration kind={item.illustration} />
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          )}
        />
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Button label={isLast ? 'Get Started' : 'Next →'} onPress={onNext} />
        <Pressable onPress={finish} hitSlop={8} style={styles.skip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
  listWrap: {
    flex: 1,
  },
  slide: {
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  illustration: {
    width: 260,
    height: 220,
    backgroundColor: colors.border,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxxl,
  },
  title: {
    ...typography.headingXL,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
  // Slide 1 — overlapping cards
  crew: {
    width: 200,
    height: 130,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shape: {
    width: 70,
    height: 110,
    borderRadius: radius.card,
    position: 'absolute',
  },
  shapeGrey: {
    backgroundColor: colors.textMuted,
    left: 30,
  },
  shapeRed: {
    backgroundColor: colors.primary,
    left: 75,
    top: -10,
    height: 100,
  },
  shapeNavy: {
    backgroundColor: colors.splash,
    left: 110,
    top: 10,
    height: 95,
  },
  // Slide 2 — profile card
  profile: {
    alignItems: 'center',
  },
  profileAvatar: {
    width: 70,
    height: 70,
    borderRadius: radius.circle,
    backgroundColor: colors.primary,
    marginBottom: spacing.lg,
  },
  profileLineLong: {
    width: 150,
    height: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.splash,
    marginBottom: spacing.md,
  },
  profileLineShort: {
    width: 100,
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.textMuted,
  },
  // Slide 3 — coin + bars
  pay: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  coin: {
    width: 80,
    height: 80,
    borderRadius: radius.circle,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xl,
  },
  coinText: {
    color: colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  payBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  payBar: {
    width: 20,
    backgroundColor: colors.primary,
    borderRadius: radius.input,
    marginHorizontal: 4,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.circle,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  skip: {
    alignSelf: 'center',
    marginTop: spacing.lg,
  },
  skipText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
