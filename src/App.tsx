import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IonApp, IonRouterOutlet, IonSplitPane, IonSpinner, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Redirect } from 'react-router-dom';
import { Keyboard } from '@capacitor/keyboard';

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

import { useVehicleStore } from './store/vehicleStore';
import { preloadAllMakes } from './services/serviceConfigService';
import Menu from './components/Menu';
import Dashboard from './pages/Dashboard';
import AddVehicle from './pages/AddVehicle';
import VehicleDetail from './pages/VehicleDetail';
import Reminders from './pages/Reminders';
import { AdMob } from '@capacitor-community/admob';
import { useBackButton } from './hooks/useBackButton';
import { useAdLoadingStore } from './store/adLoadingStore';

setupIonicReact();

/**
 * Inner component rendered inside IonReactRouter so that
 * react-router hooks (useLocation, useHistory) are available.
 */
const AppContent: React.FC = () => {
  useBackButton();

  useEffect(() => {
    // Listen for keyboard show/hide events to add a CSS class to the body
    // This allows Ionic pages to hide footers or adjust layout when keyboard is visible
    const showListener = Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-visible');
    });
    const hideListener = Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-visible');
    });

    return () => {
      showListener.then(l => l.remove());
      hideListener.then(l => l.remove());
    };
  }, []);

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
      </IonRouterOutlet>
    </IonSplitPane>
  );
};

const App: React.FC = () => {
  const loadData = useVehicleStore(s => s.loadData);

  useEffect(() => {
    // Preload make/model data to keep make selections snappy
    preloadAllMakes().catch(() => {});
    loadData();
    AdMob.initialize({
      initializeForTesting: true,
    });
  }, []);

  return (
    <IonApp>
      <IonReactRouter>
        <AppContent />
        <AdLoadingOverlay />
      </IonReactRouter>
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
