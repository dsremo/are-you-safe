import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import {useApp} from '../context/AppContext';
import {COLORS} from '../utils/constants';
import {CheckInRecord} from '../utils/types';
import {format, parseISO, isToday, isYesterday} from 'date-fns';

const HistoryScreen: React.FC = () => {
  const {checkInHistory, refreshData} = useApp();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = parseISO(dateString);
      if (isToday(date)) {
        return 'Today';
      }
      if (isYesterday(date)) {
        return 'Yesterday';
      }
      return format(date, 'EEEE, MMMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatTime = (timestamp: number): string => {
    try {
      return format(new Date(timestamp), 'h:mm a');
    } catch {
      return '';
    }
  };

  const getStreakCount = (): number => {
    if (checkInHistory.length === 0) {
      return 0;
    }

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < checkInHistory.length; i++) {
      const checkDate = parseISO(checkInHistory[i].date);
      checkDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);

      if (checkDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else if (i === 0 && checkDate.getTime() === expectedDate.getTime() - 86400000) {
        // If today hasn't been checked in yet, start from yesterday
        continue;
      } else {
        break;
      }
    }

    return streak;
  };

  const renderCheckInItem = ({item, index}: {item: CheckInRecord; index: number}) => (
    <View style={styles.historyItem}>
      <View style={styles.historyIconContainer}>
        <Text style={styles.historyIcon}>✓</Text>
      </View>
      <View style={styles.historyContent}>
        <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
        <Text style={styles.historyTime}>
          Checked in at {formatTime(item.timestamp)}
        </Text>
      </View>
      {index === 0 && (
        <View style={styles.latestBadge}>
          <Text style={styles.latestBadgeText}>Latest</Text>
        </View>
      )}
    </View>
  );

  const streak = getStreakCount();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
          Check-in History
        </Text>
        <Text style={styles.subtitle}>Your daily check-in records</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{checkInHistory.length}</Text>
          <Text style={styles.statLabel}>Total Check-ins</Text>
        </View>
        <View style={[styles.statBox, styles.streakBox]}>
          <Text style={[styles.statValue, styles.streakValue]}>
            {streak} 🔥
          </Text>
          <Text style={styles.statLabel}>Current Streak</Text>
        </View>
      </View>

      {checkInHistory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyText}>No check-ins yet</Text>
          <Text style={styles.emptySubtext}>
            Start checking in daily to build your history
          </Text>
        </View>
      ) : (
        <FlatList
          data={checkInHistory}
          renderItem={renderCheckInItem}
          keyExtractor={(item, index) => `${item.date}-${index}`}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 15,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  streakBox: {
    backgroundColor: `${COLORS.warning}20`,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  streakValue: {
    color: COLORS.warning,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  listContainer: {
    padding: 20,
    paddingTop: 0,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  historyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.success}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  historyIcon: {
    fontSize: 20,
    color: COLORS.success,
  },
  historyContent: {
    flex: 1,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flexShrink: 1,
  },
  historyTime: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  latestBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  latestBadgeText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default HistoryScreen;
