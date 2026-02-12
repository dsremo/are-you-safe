import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useApp} from '../context/AppContext';
import {COLORS, ALERT_METHODS} from '../utils/constants';
import {EmergencyContact, RootStackParamList, AlertMethod} from '../utils/types';
import {apiClient} from '../services/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ContactsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {emergencyContacts, removeEmergencyContact} = useApp();
  const [testingContact, setTestingContact] = useState<string | null>(null);

  const handleAddContact = () => {
    navigation.navigate('AddContact', {});
  };

  const handleEditContact = (contact: EmergencyContact) => {
    navigation.navigate('AddContact', {contact});
  };

  const handleDeleteContact = (contact: EmergencyContact) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to remove ${contact.name} from your emergency contacts?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeEmergencyContact(contact.contactId || contact.id);
            } catch {
              Alert.alert('Error', 'Failed to delete contact');
            }
          },
        },
      ],
    );
  };

  const handleTestAlert = async (
    contact: EmergencyContact,
    method: AlertMethod,
  ) => {
    const contactId = contact.contactId || contact.id;
    setTestingContact(`${contactId}-${method}`);
    try {
      await apiClient.testAlert(contactId, method);
      Alert.alert(
        'Test Sent',
        `Test ${method} alert sent to ${contact.name}`,
      );
    } catch {
      Alert.alert('Failed', `Could not send test ${method} alert`);
    } finally {
      setTestingContact(null);
    }
  };

  const getMethodIcon = (method: AlertMethod) => {
    switch (method) {
      case ALERT_METHODS.EMAIL:
        return '📧';
      case ALERT_METHODS.SMS:
        return '📱';
      default:
        return '📤';
    }
  };

  const renderContact = ({item}: {item: EmergencyContact}) => (
    <View style={styles.contactCard}>
      <View style={styles.contactHeader}>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name}</Text>
          {item.phone ? (
            <Text style={styles.contactDetail}>📞 {item.phone}</Text>
          ) : null}
          {item.email ? (
            <Text style={styles.contactDetail}>📧 {item.email}</Text>
          ) : null}
        </View>
        <View style={styles.contactActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditContact(item)}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteContact(item)}>
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.alertMethods}>
        <Text style={styles.methodsLabel}>Alert Methods:</Text>
        <View style={styles.methodsContainer}>
          {item.alertMethods.map(method => (
            <TouchableOpacity
              key={method}
              style={[
                styles.methodBadge,
                testingContact === `${item.contactId || item.id}-${method}` &&
                  styles.methodBadgeActive,
              ]}
              onPress={() => handleTestAlert(item, method)}>
              <Text style={styles.methodText}>
                {getMethodIcon(method)}{' '}
                {method.charAt(0).toUpperCase() + method.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {item.customMessage ? (
        <View style={styles.customMessageContainer}>
          <Text style={styles.customMessageLabel}>Custom Message:</Text>
          <Text style={styles.customMessageText} numberOfLines={2}>
            {item.customMessage}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.testButton}
        onPress={() => {
          if (item.alertMethods.length > 0) {
            Alert.alert(
              'Test Alert',
              'Select a method to test:',
              item.alertMethods.map(method => ({
                text: `${getMethodIcon(method)} ${
                  method.charAt(0).toUpperCase() + method.slice(1)
                }`,
                onPress: () => handleTestAlert(item, method),
              })),
            );
          }
        }}>
        <Text style={styles.testButtonText}>Test Alert</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
          Emergency Contacts
        </Text>
        <Text style={styles.subtitle}>
          These people will be notified if you don't check in
        </Text>
      </View>

      {emergencyContacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyText}>No emergency contacts yet</Text>
          <Text style={styles.emptySubtext}>
            Add someone who should be notified if you don't check in
          </Text>
        </View>
      ) : (
        <FlatList
          data={emergencyContacts}
          renderItem={renderContact}
          keyExtractor={item => item.contactId || item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity style={styles.addButton} onPress={handleAddContact}>
        <Text style={styles.addButtonText}>+ Add Contact</Text>
      </TouchableOpacity>
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
  listContainer: {
    padding: 20,
    paddingTop: 0,
  },
  contactCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  contactDetail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 2,
    flexShrink: 1,
  },
  contactActions: {
    flexDirection: 'column',
    gap: 8,
  },
  editButton: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editButtonText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: `${COLORS.danger}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  alertMethods: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  methodsLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  methodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodBadge: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  methodBadgeActive: {
    backgroundColor: COLORS.primary,
  },
  methodText: {
    color: COLORS.text,
    fontSize: 13,
  },
  customMessageContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
  },
  customMessageLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  customMessageText: {
    fontSize: 13,
    color: COLORS.text,
    fontStyle: 'italic',
  },
  testButton: {
    marginTop: 15,
    backgroundColor: `${COLORS.secondary}20`,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  testButtonText: {
    color: COLORS.secondary,
    fontSize: 14,
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
  addButton: {
    backgroundColor: COLORS.primary,
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ContactsScreen;
