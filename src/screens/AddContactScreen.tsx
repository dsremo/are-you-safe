import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useApp} from '../context/AppContext';
import {COLORS, ALERT_METHODS} from '../utils/constants';
import {EmergencyContact, RootStackParamList, AlertMethod} from '../utils/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddContact'>;
type RouteProps = RouteProp<RootStackParamList, 'AddContact'>;

const AddContactScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const {addEmergencyContact, updateEmergencyContact} = useApp();

  const existingContact = route.params?.contact;
  const isEditing = !!existingContact;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [alertMethods, setAlertMethods] = useState<AlertMethod[]>([ALERT_METHODS.SMS as AlertMethod]);
  const [customMessage, setCustomMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (existingContact) {
      setName(existingContact.name);
      setPhone(existingContact.phone);
      setEmail(existingContact.email || '');
      setAlertMethods(existingContact.alertMethods || [ALERT_METHODS.SMS as AlertMethod]);
      setCustomMessage(existingContact.customMessage);
    }
  }, [existingContact]);

  const toggleAlertMethod = (method: AlertMethod) => {
    setAlertMethods(prev => {
      if (prev.includes(method)) {
        if (prev.length === 1) {
          Alert.alert('Error', 'At least one alert method is required');
          return prev;
        }
        return prev.filter(m => m !== method);
      }
      return [...prev, method];
    });
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter contact name');
      return false;
    }

    if (alertMethods.includes(ALERT_METHODS.SMS as AlertMethod)) {
      if (!phone.trim()) {
        Alert.alert('Error', 'Please enter phone number for SMS alerts');
        return false;
      }
      const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
      const cleanPhone = phone.replace(/[\s-]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        Alert.alert('Error', 'Please enter a valid Indian phone number (10 digits starting with 6-9)');
        return false;
      }
    }

    if (alertMethods.includes(ALERT_METHODS.EMAIL as AlertMethod)) {
      if (!email.trim()) {
        Alert.alert('Error', 'Please enter email address for email alerts');
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        Alert.alert('Error', 'Please enter a valid email address');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const contact: EmergencyContact = {
        id: existingContact?.id || Date.now().toString(),
        contactId: existingContact?.contactId,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        alertMethods,
        customMessage: customMessage.trim(),
      };

      if (isEditing) {
        await updateEmergencyContact(contact);
        Alert.alert('Success', 'Contact updated successfully');
      } else {
        await addEmergencyContact(contact);
        Alert.alert('Success', 'Contact added successfully');
      }

      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to save contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {isEditing ? 'Edit Contact' : 'Add Emergency Contact'}
          </Text>
          <Text style={styles.subtitle}>
            This person will be alerted if you don't check in
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter contact name"
              placeholderTextColor={COLORS.textSecondary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter phone number (e.g., 9876543210)"
              placeholderTextColor={COLORS.textSecondary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <Text style={styles.hint}>Indian mobile number (10 digits)</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter email address"
              placeholderTextColor={COLORS.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Alert Method Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Alert Methods *</Text>
            <Text style={styles.hint}>
              Choose how this contact will be notified
            </Text>
            <View style={styles.methodsRow}>
              <TouchableOpacity
                style={[
                  styles.methodButton,
                  alertMethods.includes(ALERT_METHODS.SMS as AlertMethod) && styles.methodButtonActive,
                ]}
                onPress={() => toggleAlertMethod(ALERT_METHODS.SMS as AlertMethod)}>
                <Text style={styles.methodIcon}>📱</Text>
                <Text style={[
                  styles.methodLabel,
                  alertMethods.includes(ALERT_METHODS.SMS as AlertMethod) && styles.methodLabelActive,
                ]}>SMS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.methodButton,
                  alertMethods.includes(ALERT_METHODS.EMAIL as AlertMethod) && styles.methodButtonActive,
                ]}
                onPress={() => toggleAlertMethod(ALERT_METHODS.EMAIL as AlertMethod)}>
                <Text style={styles.methodIcon}>📧</Text>
                <Text style={[
                  styles.methodLabel,
                  alertMethods.includes(ALERT_METHODS.EMAIL as AlertMethod) && styles.methodLabelActive,
                ]}>Email</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Custom Message (Optional)</Text>
            <Text style={styles.hint}>
              Leave empty to use the default emergency message
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter a custom message to send to this contact..."
              placeholderTextColor={COLORS.textSecondary}
              value={customMessage}
              onChangeText={setCustomMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.consentNote}>
            <Text style={styles.consentText}>
              By adding this contact, you confirm that they have agreed to receive emergency alerts from you.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}>
          <Text style={styles.submitButtonText}>
            {isSubmitting
              ? 'Saving...'
              : isEditing
              ? 'Update Contact'
              : 'Add Contact'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginTop: 30,
    marginBottom: 30,
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    color: COLORS.secondary,
    fontSize: 16,
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
  form: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 15,
  },
  methodsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 15,
    borderWidth: 2,
    borderColor: COLORS.surfaceLight,
    gap: 8,
  },
  methodButtonActive: {
    borderColor: COLORS.success,
    backgroundColor: `${COLORS.success}15`,
  },
  methodIcon: {
    fontSize: 24,
  },
  methodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  methodLabelActive: {
    color: COLORS.success,
  },
  consentNote: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
  },
  consentText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AddContactScreen;
