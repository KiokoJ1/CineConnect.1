import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { addRole, switchActiveRole } from '@/api/auth';
import { ThemeColors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { Role, User } from '@/types';
import { extractErrorMessage } from '@/utils/errors';
import { homeRouteForRole, roleLabel, SELF_SERVICE_ROLES } from '@/utils/routing';
import { Card } from './Card';

interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Lets the signed-in user switch which of their granted roles is active —
 * no logout required — and grant themselves an additional role. A single
 * toggle button shows the current role; tapping it opens a dropdown of
 * every granted role plus any role they don't have yet ("+ Add ... role").
 * Switching persists via PATCH /api/auth/active-role, adding persists via
 * POST /api/auth/roles (Oracle `users.active_role` / `user_roles`), then
 * both update the auth store and navigate straight to that role's home, so
 * navigation/dashboard/profile/permissions all reflect the new role
 * immediately (every existing role check reads `user.role`, which this
 * updates in place).
 *
 * Always visible (even with only one role) so switching/adding is
 * discoverable — with a single role, the dropdown just offers roles to add.
 */
export function RoleSwitcher() {
  const router = useRouter();
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  const user = useAuthStore((s) => s.user);
  const setActiveRole = useAuthStore((s) => s.setActiveRole);

  const buttonRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const open = anchor !== null;

  const onUpdated = async (updatedUser: User) => {
    setAnchor(null);
    await setActiveRole(updatedUser);
    router.replace(homeRouteForRole(updatedUser.role));
  };
  const onFailed = (label: string) => (error: unknown) => {
    setAnchor(null);
    Alert.alert(label, extractErrorMessage(error) ?? 'Please try again.');
  };

  const switchMutation = useMutation({
    mutationFn: switchActiveRole,
    onSuccess: onUpdated,
    onError: onFailed('Could not switch role'),
  });
  const addMutation = useMutation({
    mutationFn: addRole,
    onSuccess: onUpdated,
    onError: onFailed('Could not add role'),
  });

  if (!user) return null;
  const pending = switchMutation.isPending || addMutation.isPending;
  const rolesToAdd = SELF_SERVICE_ROLES.filter((r) => !user.roles.includes(r));

  const openDropdown = () => {
    buttonRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
    });
  };

  const onSelectExisting = (role: Role) => {
    if (role === user.role || pending) {
      setAnchor(null);
      return;
    }
    switchMutation.mutate(role);
  };

  const onAdd = (role: Role) => {
    if (pending) return;
    addMutation.mutate(role);
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.heading}>Switch Role</Text>
      <Text style={styles.subheading}>
        You're currently viewing CineConnect as a {roleLabel(user.role)}.
      </Text>

      <Pressable
        ref={buttonRef}
        onPress={openDropdown}
        disabled={pending}
        style={[styles.toggle, open && styles.toggleOpen]}
      >
        {pending ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={styles.toggleText}>{roleLabel(user.role)}</Text>
        )}
        <Text style={[styles.chevron, open && styles.chevronOpen]}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setAnchor(null)}>
        <Pressable style={styles.backdrop} onPress={() => setAnchor(null)}>
          {anchor ? (
            <View
              style={[
                styles.dropdown,
                {
                  top: anchor.y + anchor.height + spacing.xs,
                  left: anchor.x,
                  width: anchor.width,
                },
              ]}
            >
              {user.roles.map((role) => {
                const active = role === user.role;
                return (
                  <Pressable
                    key={role}
                    onPress={() => onSelectExisting(role)}
                    style={({ pressed }) => [
                      styles.option,
                      active && styles.optionActive,
                      pressed && styles.optionPressed,
                    ]}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                      {roleLabel(role)}
                    </Text>
                    {active ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                );
              })}

              {rolesToAdd.length > 0 ? (
                <>
                  <View style={styles.divider} />
                  {rolesToAdd.map((role) => (
                    <Pressable
                      key={role}
                      onPress={() => onAdd(role)}
                      style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                    >
                      <Text style={styles.addText}>+ Add {roleLabel(role)} role</Text>
                    </Pressable>
                  ))}
                </>
              ) : null}
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </Card>
  );
}

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
    card: {
      marginTop: spacing.xl,
    },
    heading: {
      ...typography.headingM,
    },
    subheading: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      marginBottom: spacing.md,
    },
    toggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    toggleOpen: {
      borderColor: colors.primary,
    },
    toggleText: {
      ...typography.body,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    chevron: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    chevronOpen: {
      color: colors.primary,
      transform: [{ rotate: '180deg' }],
    },
    backdrop: {
      flex: 1,
    },
    dropdown: {
      position: 'absolute',
      backgroundColor: colors.surface,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.xs,
      // Card-style elevation so the dropdown reads as floating above the
      // page on both platforms.
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    optionPressed: {
      backgroundColor: colors.background,
    },
    optionActive: {
      backgroundColor: colors.primarySoft,
    },
    optionText: {
      ...typography.body,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    optionTextActive: {
      color: colors.primary,
    },
    check: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 16,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.xs,
    },
    addText: {
      ...typography.body,
      fontWeight: '600',
      color: colors.primary,
    },
  });
