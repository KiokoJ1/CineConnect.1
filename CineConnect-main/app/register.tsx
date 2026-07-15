import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { register } from '@/api/auth';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useAuthStore } from '@/store/authStore';
import { homeRouteForRole } from '@/utils/routing';
import { isValidEmail } from '@/utils/validation';
import { extractErrorMessage } from '@/utils/errors';

type SignupRole = 'freelancer' | 'producer';

interface Errors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

const ROLES: { key: SignupRole; label: string; emoji: string }[] = [
  { key: 'freelancer', label: 'Freelancer', emoji: '🎭' },
  { key: 'producer', label: 'Producer', emoji: '🎬' },
];

export default function RegisterScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [role, setRole] = useState<SignupRole>('freelancer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  const clearError = (field: keyof Errors) => {
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  };

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: async (result) => {
      await setAuth(result);
      router.replace(homeRouteForRole(result.user.role));
    },
    onError: (error) => {
      const backendMessage = extractErrorMessage(error);
      Alert.alert('Registration failed', backendMessage ?? 'Please try again in a moment.');
    },
  });

  const onSubmit = () => {
    const trimmedEmail = email.trim();
    const next: Errors = {};
    if (!name.trim()) next.name = 'Full name is required.';
    if (!trimmedEmail) next.email = 'Email is required.';
    else if (!isValidEmail(trimmedEmail)) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Password is required.';
    else if (password.length < 8) next.password = 'Use at least 8 characters.';
    if (!confirm) next.confirm = 'Please confirm your password.';
    else if (password && password !== confirm) next.confirm = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    mutation.mutate({ name: name.trim(), email: trimmedEmail, password, role });
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heading}>Create Account</Text>
          <Text style={styles.subtitle}>Join Kenya&apos;s film community</Text>

          <View style={styles.segment}>
            {ROLES.map((r) => {
              const active = role === r.key;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => setRole(r.key)}
                  style={[styles.segmentItem, active && styles.segmentItemActive]}
                >
                  <Text style={styles.segmentEmoji}>{r.emoji}</Text>
                  <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Input
            label="Full Name"
            placeholder="Brian Kamau"
            value={name}
            onChangeText={(t) => {
              setName(t);
              clearError('name');
            }}
            error={errors.name}
          />
          <Input
            label="Email Address"
            placeholder="brian@gmail.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              clearError('email');
            }}
            error={errors.email}
          />
          <Input
            label="Password"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              clearError('password');
            }}
            error={errors.password}
          />
          <Input
            label="Confirm Password"
            placeholder="••••••••"
            secureTextEntry
            value={confirm}
            onChangeText={(t) => {
              setConfirm(t);
              clearError('confirm');
            }}
            error={errors.confirm}
          />

          <Button label="Create Account" onPress={onSubmit} loading={mutation.isPending} />

          <Pressable style={styles.footer} onPress={() => router.replace('/login')}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Text style={styles.footerLink}>Login</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  heading: {
    ...typography.headingXL,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
  },
  segment: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  segmentItem: {
    flex: 1,
    height: 90,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  segmentEmoji: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  segmentLabel: {
    ...typography.label,
    fontSize: 15,
    color: colors.textSecondary,
  },
  segmentLabelActive: {
    color: colors.primary,
  },
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    ...typography.body,
    color: colors.textMuted,
  },
  footerLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
});
