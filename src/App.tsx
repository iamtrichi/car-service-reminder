import React, { useEffect } from 'react';
import { IonApp, IonRouterOutlet, IonSplitPane, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Redirect } from 'react-router-dom';

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

setupIonicReact();

/**
 * Inner component rendered inside IonReactRouter so that
 * react-router hooks (useLocation, useHistory) are available.
 */
const AppContent: React.FC = () => {
  useBackButton();

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
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
