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
import { AdMob, BannerAdOptions, BannerAdPluginEvents, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';

setupIonicReact();

const App: React.FC = () => {
  const loadData = useVehicleStore(s => s.loadData);

  const showBanner = async () => {
    const options: BannerAdOptions = {
      adId: 'ca-app-pub-9080625797289443/5062423861',
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      isTesting: true,
    };
    await AdMob.showBanner(options);
  };
  useEffect(() => {
    // Preload make/model data to keep make selections snappy
    preloadAllMakes().catch(() => {});
    loadData();
    AdMob.initialize({
      initializeForTesting: true,
    }).then(() => {
      AdMob.addListener(BannerAdPluginEvents.SizeChanged, (info: any) => {
        const appMargin = parseInt(info.height, 15);
        if (appMargin > 0) {
          const app: HTMLElement = document.querySelector('ion-router-outlet')!;
          app.style.marginBottom = String(Number(appMargin)+10) + 'px';
        }
      });
      setTimeout(() => {
        showBanner().catch(() => {});
      }, 3000)
    });
  }, []);

  return (
    <IonApp>
      <IonReactRouter>
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
      </IonReactRouter>
    </IonApp>
  );
};

export default App;