export const KEYS = {
  user: 'carebridge_user',
  settings: 'carebridge_settings',
  medications: 'carebridge_added_medications',
  appointments: 'carebridge_added_appointments',
  conditions: 'carebridge_added_conditions',
  appointmentNotes: 'carebridge_appointment_notes',
  conditionNotes: 'carebridge_condition_notes',
  notifications: 'carebridge_notifications',
};

export function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  return value;
}

export function getSettings() {
  return readStorage(KEYS.settings, {
    preferredLanguage: 'urdu',
    translationStyle: 'simple',
    speechRate: 0.9,
    largeText: false,
    highContrast: false,
    notifications: true,
  });
}

export function updateSettings(next) {
  const saved = writeStorage(KEYS.settings, { ...getSettings(), ...next });
  window.dispatchEvent(new Event('carebridge-settings'));
  return saved;
}

export function getUser() {
  return readStorage(KEYS.user, null);
}

export function setUser(user) {
  return writeStorage(KEYS.user, user);
}

export function logoutUser() {
  localStorage.removeItem(KEYS.user);
}

export function addNotification(message, type = 'info') {
  const notifications = readStorage(KEYS.notifications, []);
  const item = {
    id: Date.now(),
    message,
    type,
    read: false,
    createdAt: new Date().toISOString(),
  };
  writeStorage(KEYS.notifications, [item, ...notifications].slice(0, 20));
  window.dispatchEvent(new Event('carebridge-notifications'));
  return item;
}
