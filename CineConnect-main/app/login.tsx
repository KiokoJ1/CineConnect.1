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

import { login } from '@/api/auth';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useAuthStore } from '@/store/authStore';
import { homeRouteForRole } from '@/utils/routing';
import { isValidLoginIdentifier } from '@/utils/validation';
import { extractErrorMessage } from '@/utils/errors';

interface Errors {
  email?: string;
  password?: string;
}

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: async (result) => {
      await setAuth(result);
      router.replace(homeRouteForRole(result.user.role));
    },
    onError: (error) => {
      const backendMessage = extractErrorMessage(error);
      Alert.alert('Login failed', backendMessage ?? 'Please check your email and password and try again.');
    },
  });

  const onLogin = () => {
    const trimmedEmail = email.trim();
    const next: Errors = {};
    if (!trimmedEmail) next.email = 'Email is required.';
    else if (!isValidLoginIdentifier(trimmedEmail)) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Password is required.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    mutation.mutate({ email: trimmedEmail, password });
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
          <Text style={styles.brand}>CINECONNECTKE</Text>
          <Text style={styles.heading}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <View style={styles.form}>
            <Input
              label="Email Address"
              placeholder="brian@gmail.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
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
                if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
              }}
              error={errors.password}
            />
            <Pressable
              hitSlop={8}
              style={styles.forgot}
              onPress={() => router.push('/forgot-password')}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>
          </View>

          <Button label="Login" onPress={onLogin} loading={mutation.isPending} />
          <View style={styles.gap} />
          <Button label="Register" variant="outline" onPress={() => router.push('/register')} />

          <Pressable style={styles.footer} onPress={() => router.push('/register')}>
            <Text style={styles.footerText}>Don&apos;t have an account? Register</Text>
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
    paddingVertical: spacing.xxxl,
  },
  brand: {
    ...typography.label,
    color: colors.primary,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  heading: {
    ...typography.headingXL,
    fontSize: 34,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xxxl,
  },
  form: {
    marginBottom: spacing.sm,
  },
  forgot: {
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  forgotText: {
    ...typography.label,
    color: colors.primary,
  },
  gap: {
    height: spacing.md,
  },
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
