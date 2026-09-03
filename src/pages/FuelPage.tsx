import React from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
} from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useVehicleStore } from '../store/vehicleStore';
import FuelTab from '../components/FuelTab';
import { resumeBanner, hideBanner } from '../services/admobUtilits';
import { useIonViewWillEnter, useIonViewWillLeave } from '@ionic/react';
import { add } from 'ionicons/icons';

/**
 * Dedicated per-vehicle fuel page.
 * Route: /vehicle/:vehicleId/fuel
 */
const FuelPage: React.FC = () => {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const history = useHistory();
  const { t } = useTranslation();
  const vehicles = useVehicleStore(s => s.vehicles);
  const [openAdd, setOpenAdd] = React.useState(false);

  const vehicle = vehicles.find(v => v.id === vehicleId);

  useIonViewWillEnter(() => {
    resumeBanner();
  });

  useIonViewWillLeave(() => {
    hideBanner();
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref={`/vehicle/${vehicleId}`} />
          </IonButtons>
          <IonTitle>{t('fuel.pageTitle')}</IonTitle>
          {vehicle && (
            <IonButtons slot="end">
              <IonButton onClick={() => setOpenAdd(true)}>
                <IonIcon slot="icon-only" icon={add} />
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ '--background': '#f8f9fa' }}>
        {!vehicle ? (
          <div className="ion-padding ion-text-center" style={{ marginTop: '40%' }}>
            <p>{t('vehicleDetail.notFound')}</p>
            <IonButton onClick={() => history.push('/dashboard')}>
              {t('vehicleDetail.backToDashboard')}
            </IonButton>
          </div>
        ) : (
          <FuelTab overrideShowModal={openAdd} overrideShowModalFunc={setOpenAdd} vehicleId={vehicle.id} currentMileage={vehicle.currentMileage} />
        )}
      </IonContent>
    </IonPage>
  );
};

export default FuelPage;