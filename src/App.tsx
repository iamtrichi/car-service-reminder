import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IonApp, IonRouterOutlet, IonSplitPane, IonSpinner, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Redirect, useHistory } from 'react-router-dom';
import { Keyboard } from '@capacitor/keyboard';
import { LocalNotifications } from '@capacitor/local-notifications';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';
/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
/* Optional CSS utils */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme/variables.css';

import i18n from './i18n';
import { useVehicleStore } from './store/vehicleStore';
import { preloadAllMakes } from './services/serviceConfigService';
import {
  scheduleMileageReminders,
  cancelMileageReminders,
  hasPermissionPromptBeenShown,
  getNotificationPermissionStatus,
  getNotificationPreference,
} from './services/notificationService';
import PermissionPrompt from './components/PermissionPrompt';
import Menu from './components/Menu';
import Dashboard from './pages/Dashboard';
import AddVehicle from './pages/AddVehicle';
import VehicleDetail from './pages/VehicleDetail';
import Reminders from './pages/Reminders';
import ContactUs from './pages/ContactUs';
import NotificationSchedule from './pages/NotificationSchedule';
import { AdMob } from '@capacitor-community/admob';
import { useBackButton } from './hooks/useBackButton';
import { useAdLoadingStore } from './store/adLoadingStore';

setupIonicReact();

/**
 * Context for sharing notification enabled state across all components
 */
export const NotificationContext = React.createContext<{
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
}>({
  isEnabled: false,
  setIsEnabled: () => {},
});

/**
 * Inner component rendered inside IonReactRouter so that
 * react-router hooks (useLocation, useHistory) are available.
 */
const AppContent: React.FC = () => {
  useBackButton();
  const history = useHistory();

  useEffect(() => {
    // Listen for keyboard show/hide events to add a CSS class to the body
    // This allows Ionic pages to hide footers or adjust layout when keyboard is visible
    const showListener = Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-visible');
    });
    const hideListener = Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-visible');
    });

    // Listen for notification tap to navigate to the vehicle detail page
    const notificationListener = LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (notificationAction) => {
        const vehicleId = notificationAction.notification.extra?.vehicleId;
        if (vehicleId) {
          history.push(`/vehicle/${vehicleId}`);
        }
      }
    );

    return () => {
      showListener.then(l => l.remove());
      hideListener.then(l => l.remove());
      notificationListener.then(l => l.remove());
    };
  }, [history]);

  return (
    <IonSplitPane contentId="main">
      <Menu />
      <IonRouterOutlet id="main">
        <Route exact path="/" render={() => <Redirect to="/dashboard" />} />
        <Route exact path="/dashboard" component={Dashboard} />
        <Route exact path="/add-vehicle" component={AddVehicle} />
        <Route exact path="/add-vehicle/:vehicleId" component={AddVehicle} />
        <Route exact path="/vehicle/:vehicleId" component={VehicleDetail} />
        <Route exact path="/reminders" component={Reminders} />
        <Route exact path="/contact-us" component={ContactUs} />
        <Route exact path="/notification-schedule" component={NotificationSchedule} />
      </IonRouterOutlet>
    </IonSplitPane>
  );
};

const App: React.FC = () => {
  const loadData = useVehicleStore(s => s.loadData);
  const vehicles = useVehicleStore(s => s.vehicles);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(() => {
    // Initialize from localStorage preference
    const preference = localStorage.getItem('csr_notifications_enabled');
    return preference !== 'false';
  });

  useEffect(() => {
    // Preload make/model data to keep make selections snappy
    preloadAllMakes().catch(() => {});
    loadData();
    AdMob.initialize({
      initializeForTesting: true,
    });
  }, []);

  // Handle notification scheduling once vehicles are loaded
  useEffect(() => {
    if (vehicles.length === 0) return;

    const initNotifications = async () => {
      try {
        // Check user's notification preference
        const userPrefersNotifications = getNotificationPreference();

        // Cancel any previously scheduled mileage reminders to avoid duplicates
        await cancelMileageReminders();

        // If user has disabled notifications, don't schedule
        if (!userPrefersNotifications) return;

        // Check if we already have permission
        const permStatus = await getNotificationPermissionStatus();

        if (permStatus.display === 'granted') {
          // Permission already granted, schedule reminders directly
          await scheduleMileageReminders(vehicles);
        } else if (!hasPermissionPromptBeenShown()) {
          // Permission not granted yet and prompt hasn't been shown
          // Show the custom permission explanation UI
          setShowPermissionPrompt(true);
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    initNotifications();
  }, [vehicles]);

  // Re-schedule notifications when the user changes language
  // to update notification text to the new language
  useEffect(() => {
    const handleLanguageChange = () => {
      if (vehicles.length > 0) {
        // Check if user wants notifications before re-scheduling
        const userPrefersNotifications = getNotificationPreference();
        if (!userPrefersNotifications) return;
        
        // Re-schedule with the new language
        cancelMileageReminders().then(() => {
          scheduleMileageReminders(vehicles);
        });
      }
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [vehicles]);

  const handlePermissionPromptDismiss = () => {
    setShowPermissionPrompt(false);
    // Re-check permission status and schedule if granted and user prefers
    const userPrefersNotifications = getNotificationPreference();
    if (userPrefersNotifications) {
      getNotificationPermissionStatus().then(async (status) => {
        if (status.display === 'granted') {
          await scheduleMileageReminders(vehicles);
        }
      });
    }
  };

  return (
    <IonApp>
      <NotificationContext.Provider value={{ isEnabled: isNotificationEnabled, setIsEnabled: setIsNotificationEnabled }}>
        <IonReactRouter>
          <AppContent />
          <AdLoadingOverlay />
          <PermissionPrompt
            isOpen={showPermissionPrompt}
            onDismiss={handlePermissionPromptDismiss}
            vehicles={vehicles}
          />
        </IonReactRouter>
      </NotificationContext.Provider>
    </IonApp>
  );
};

/** Full-screen overlay that blocks clicks while an ad is loading/displaying */
const AdLoadingOverlay: React.FC = () => {
  const isAdLoading = useAdLoadingStore(s => s.isAdLoading);
  const setAdLoading = useAdLoadingStore(s => s.setAdLoading);
  const { t } = useTranslation();

  useEffect(() => {
    if (isAdLoading) {
      const timer = setTimeout(() => {
        setAdLoading(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isAdLoading, setAdLoading]);

  if (!isAdLoading) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}
      >
        <IonSpinner style={{ width: '40px', height: '40px' }} />
        <span style={{ color: '#333', fontSize: '14px' }}>{t('adLoading')}</span>
      </div>
    </div>
  );
};

export default App;
