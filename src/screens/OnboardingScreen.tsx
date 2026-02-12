import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Animated,
  Alert,
} from 'react-native';
import {useApp} from '../context/AppContext';
import {COLORS} from '../utils/constants';
import {requestNotificationPermissions} from '../services/notifications';

const {width} = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  icon: string;
  title: string;
  description: string;
  backgroundColor: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    icon: '🛡️',
    title: 'Are You Safe?',
    description:
      'A simple app that helps your loved ones know you\'re safe. Check in daily to let them know you\'re okay.',
    backgroundColor: COLORS.background,
  },
  {
    id: '2',
    icon: '👆',
    title: 'Daily Check-in',
    description:
      'Every day, just tap "I am safe" to confirm you\'re okay. It takes less than a second!',
    backgroundColor: COLORS.background,
  },
  {
    id: '3',
    icon: '⚠️',
    title: 'Miss 2 Days?',
    description:
      'If you don\'t check in for 2 consecutive days, your emergency contacts will be automatically notified via SMS and Email from our server.',
    backgroundColor: COLORS.background,
  },
  {
    id: '4',
    icon: '👨‍👩‍👧‍👦',
    title: 'Add Your Contacts',
    description:
      'Add family members or friends who should be notified if something happens. Choose SMS, Email, or both.',
    backgroundColor: COLORS.background,
  },
  {
    id: '5',
    icon: '🔔',
    title: 'Enable Notifications',
    description:
      'We\'ll send you a daily reminder to check in. Don\'t worry, we won\'t spam you!',
    backgroundColor: COLORS.background,
  },
];

const OnboardingScreen: React.FC = () => {
  const {completeOnboarding} = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      // Last slide - request permissions and complete onboarding
      try {
        await requestNotificationPermissions();
      } catch (error) {
        console.log('Permission request failed:', error);
      }

      await completeOnboarding();
      // Navigation will be handled by the app state change
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Onboarding?',
      'You can always configure your settings later.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Skip',
          onPress: async () => {
            try {
              await requestNotificationPermissions();
            } catch (error) {
              console.log('Permission request failed:', error);
            }
            await completeOnboarding();
          },
        },
      ],
    );
  };

  const renderSlide = ({item}: {item: OnboardingSlide}) => (
    <View style={[styles.slide, {width}]}>
      <Text style={styles.icon}>{item.icon}</Text>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideDescription}>{item.description}</Text>
    </View>
  );

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {slides.map((_, index) => {
        const inputRange = [
          (index - 1) * width,
          index * width,
          (index + 1) * width,
        ];

        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 20, 8],
          extrapolate: 'clamp',
        });

        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.4, 1, 0.4],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index}
            style={[styles.dot, {width: dotWidth, opacity}]}
          />
        );
      })}
    </View>
  );

  const onViewableItemsChanged = useRef(
    ({viewableItems}: {viewableItems: Array<{index: number | null}>}) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {currentIndex < slides.length - 1 && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {x: scrollX}}}],
          {useNativeDriver: false},
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
      />

      {renderDots()}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {currentIndex === slides.length - 1 ? "Let's Go!" : 'Next'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          {currentIndex + 1} of {slides.length}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    paddingTop: 50,
  },
  skipButton: {
    padding: 10,
  },
  skipText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  icon: {
    fontSize: 100,
    marginBottom: 30,
  },
  slideTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  slideDescription: {
    fontSize: 18,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginHorizontal: 4,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 60,
    paddingVertical: 16,
    borderRadius: 30,
    marginBottom: 15,
  },
  nextButtonText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});

export default OnboardingScreen;
