import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import {useApp} from '../context/AppContext';
import {COLORS, APP_NAME} from '../utils/constants';
import {format, parseISO, differenceInDays} from 'date-fns';

const HomeScreen: React.FC = () => {
  const {lastCheckIn, checkIn, settings, emergencyContacts} = useApp();
  const [isCheckedInToday, setIsCheckedInToday] = useState(false);
  const [daysMissed, setDaysMissed] = useState(0);
  const [buttonScale] = useState(new Animated.Value(1));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setIsCheckedInToday(lastCheckIn === today);
    if (lastCheckIn) {
      try {
        const lastDate = parseISO(lastCheckIn);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        setDaysMissed(differenceInDays(now, lastDate));
      } catch {
        setDaysMissed(0);
      }
    } else {
      setDaysMissed(0);
    }
  }, [lastCheckIn]);

  // Pulse animation for the button when not checked in
  useEffect(() => {
    if (!isCheckedInToday) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isCheckedInToday, pulseAnim]);

  const handleCheckIn = async () => {
    if (isCheckedInToday || isCheckingIn) {
      return;
    }

    setIsCheckingIn(true);

    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      await checkIn();
      Alert.alert(
        'You\'re Safe!',
        'Your check-in has been recorded. See you tomorrow!',
        [{text: 'OK'}],
      );
    } catch {
      Alert.alert('Error', 'Failed to check in. Please try again.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const getStatusMessage = () => {
    if (isCheckedInToday) {
      return "You've checked in today!";
    }
    if (daysMissed === 0) {
      return 'Tap the button to check in!';
    }
    if (daysMissed === 1) {
      return 'You missed yesterday!';
    }
    if (daysMissed >= settings.missedDaysThreshold) {
      return `${daysMissed} days missed! Alerts sending soon!`;
    }
    return `${daysMissed} days since last check-in`;
  };

  const getStatusColor = () => {
    if (isCheckedInToday) {
      return COLORS.success;
    }
    if (daysMissed >= settings.missedDaysThreshold) {
      return COLORS.danger;
    }
    if (daysMissed >= 1) {
      return COLORS.warning;
    }
    return COLORS.textSecondary;
  };

  const getButtonColor = () => {
    if (isCheckedInToday) {
      return COLORS.success;
    }
    if (daysMissed >= settings.missedDaysThreshold) {
      return COLORS.danger;
    }
    return COLORS.primary;
  };

  const formatLastCheckIn = () => {
    if (!lastCheckIn) {
      return 'Never';
    }
    try {
      return format(parseISO(lastCheckIn), 'MMMM d, yyyy');
    } catch {
      return 'Unknown';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
          {APP_NAME}
        </Text>
        <Text style={styles.subtitle}>Daily Check-in</Text>
      </View>

      <View style={styles.statusContainer}>
        <Text style={[styles.statusText, {color: getStatusColor()}]}>
          {getStatusMessage()}
        </Text>
        <Text style={styles.lastCheckInText}>
          Last check-in: {formatLastCheckIn()}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{scale: isCheckedInToday ? 1 : pulseAnim}],
              backgroundColor: isCheckedInToday
                ? 'transparent'
                : `${getButtonColor()}30`,
            },
          ]}
        />
        <Animated.View style={{transform: [{scale: buttonScale}]}}>
          <TouchableOpacity
            style={[
              styles.checkInButton,
              {backgroundColor: getButtonColor()},
              isCheckedInToday && styles.disabledButton,
            ]}
            onPress={handleCheckIn}
            disabled={isCheckedInToday || isCheckingIn}
            activeOpacity={0.8}>
            <Text style={styles.buttonText}>
              {isCheckingIn ? 'Checking in...' : 'I am safe'}
            </Text>
            {isCheckedInToday && <Text style={styles.checkMark}>✓</Text>}
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Emergency Contacts</Text>
          <Text style={styles.infoValue}>{emergencyContacts.length}</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Alert After</Text>
          <Text style={styles.infoValue}>
            {settings.missedDaysThreshold} days
          </Text>
        </View>
      </View>

      {emergencyContacts.length === 0 && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            No emergency contacts configured!
          </Text>
          <Text style={styles.warningSubtext}>
            Add contacts in the Contacts tab
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
    paddingHorizontal: 10,
  },
  lastCheckInText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 10,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  checkInButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  disabledButton: {
    opacity: 0.9,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  checkMark: {
    color: COLORS.text,
    fontSize: 28,
    marginTop: 4,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    minWidth: 140,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  warningContainer: {
    backgroundColor: `${COLORS.warning}20`,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  warningText: {
    color: COLORS.warning,
    fontSize: 16,
    fontWeight: '600',
  },
  warningSubtext: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 5,
  },
});

export default HomeScreen;
