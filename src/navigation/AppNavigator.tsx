import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {View, ActivityIndicator, StyleSheet} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {useApp} from '../context/AppContext';
import {AddContactScreen, LoginScreen} from '../screens';
import TabNavigator from './TabNavigator';
import {COLORS} from '../utils/constants';
import {RootStackParamList} from '../utils/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const LoadingScreen: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={COLORS.primary} />
  </View>
);

const AppNavigator: React.FC = () => {
  const {isAuthenticated, isLoading: authLoading} = useAuth();
  const {loading: appLoading} = useApp();

  if (authLoading || (isAuthenticated && appLoading)) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: {backgroundColor: COLORS.background},
          animation: 'slide_from_right',
        }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen
              name="AddContact"
              component={AddContactScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});

export default AppNavigator;
