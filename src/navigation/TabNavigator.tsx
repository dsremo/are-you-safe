import React, {useCallback} from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {View, Text, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  HomeScreen,
  ContactsScreen,
  HistoryScreen,
  SettingsScreen,
} from '../screens';
import {COLORS} from '../utils/constants';
import {MainTabParamList} from '../utils/types';

const Tab = createBottomTabNavigator<MainTabParamList>();

interface TabIconProps {
  focused: boolean;
  icon: string;
  label: string;
}

const TabIcon: React.FC<TabIconProps> = ({focused, icon, label}) => (
  <View style={styles.tabIconContainer}>
    <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      {icon}
    </Text>
    <Text
      style={[styles.tabLabel, focused && styles.tabLabelFocused]}
      numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const TabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();

  const renderHomeIcon = useCallback(
    ({focused}: {focused: boolean}) => (
      <TabIcon focused={focused} icon="🏠" label="Home" />
    ),
    [],
  );

  const renderContactsIcon = useCallback(
    ({focused}: {focused: boolean}) => (
      <TabIcon focused={focused} icon="👥" label="Contacts" />
    ),
    [],
  );

  const renderHistoryIcon = useCallback(
    ({focused}: {focused: boolean}) => (
      <TabIcon focused={focused} icon="📅" label="History" />
    ),
    [],
  );

  const renderSettingsIcon = useCallback(
    ({focused}: {focused: boolean}) => (
      <TabIcon focused={focused} icon="⚙️" label="Settings" />
    ),
    [],
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          ...styles.tabBar,
          height: 70 + Math.max(insets.bottom, 10),
          paddingBottom: Math.max(insets.bottom, 15),
        },
        tabBarShowLabel: false,
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: renderHomeIcon,
        }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{
          tabBarIcon: renderContactsIcon,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarIcon: renderHistoryIcon,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: renderSettingsIcon,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.surfaceLight,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  tabIcon: {
    fontSize: 22,
    opacity: 0.6,
  },
  tabIconFocused: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  tabLabelFocused: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default TabNavigator;
