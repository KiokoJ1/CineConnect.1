import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { useAddRole, useMyRoles, useSwitchActiveRole } from '@/api/roles';
import { Pill } from '@/components/Pill';
import { Select } from '@/components/Select';
import { spacing } from '@/constants/layout';
import { useTheme } from '@/hooks/useTheme';
import { Role } from '@/types';
import { homeRouteForRole } from '@/utils/routing';

/** Every role a person can hold on their own account — 'admin' is never self-granted or self-switched-to here. */
const ADDABLE_ROLES: Role[] = ['freelancer', 'producer', 'client'];

function label(role: Role): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/** Segmented pill switcher for a multi-role account, plus a compact "add a role" picker. */
export function RoleSwitcher() {
  const router = useRouter();
  const { typography } = useTheme();
  const styles = getStyles();
  const { data, isLoading } = useMyRoles();
  const switchRole = useSwitchActiveRole();
  const addRole = useAddRole();

  if (isLoading || !data) return null;

  const { roles, activeRole } = data;
  const addable = ADDABLE_ROLES.filter((r) => !roles.includes(r));

  const onSelectRole = (role: Role) => {
    if (role === activeRole || switchRole.isPending) return;
    Alert.alert(
      `Switch to ${label(role)}?`,
      `Your navigation and dashboard will switch to the ${label(role)} view immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: () =>
            switchRole.mutate(role, {
              onSuccess: () => router.replace(homeRouteForRole(role)),
              onError: () => Alert.alert('Could not switch role', 'Please try again.'),
            }),
        },
      ],
    );
  };

  const onAddRole = (roleLabel: string) => {
    const role = roleLabel.toLowerCase() as Role;
    addRole.mutate(role, {
      onError: () => Alert.alert('Could not add role', 'Please try again.'),
    });
  };

  return (
    <View>
      <Text style={[typography.label, styles.title]}>Switch Role</Text>
      <View style={styles.pills}>
        {roles.map((role) => (
          <Pill
            key={role}
            label={label(role)}
            active={role === activeRole}
            onPress={() => onSelectRole(role)}
          />
        ))}
      </View>

      {addable.length > 0 ? (
        <View style={styles.addWrap}>
          <Select
            label="Add another role"
            placeholder="Select a role to add"
            value={null}
            options={addable.map(label)}
            onChange={onAddRole}
          />
        </View>
      ) : null}
    </View>
  );
}

const getStyles = () =>
  StyleSheet.create({
    title: {
      marginBottom: spacing.sm,
    },
    pills: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    addWrap: {
      marginTop: spacing.md,
    },
  });
