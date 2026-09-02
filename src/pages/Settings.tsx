import React, { useContext, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonModal,
  IonSearchbar,
  IonCard,
  IonCardContent,
  IonIcon,
  IonText,
  IonToast,
  IonToggle,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { wallet, shieldCheckmark, notifications, alarm, search, checkmark, chevronForward } from 'ionicons/icons';
import {
  getCurrency,
  setCurrency,
  resetCurrency,
  detectDeviceCurrency,
  getSupportedCurrencies,
  getCurrencyInfo,
  formatCurrency,
  getDeviceLocale,
} from '../services/currencyService';
import { NotificationContext } from '../App';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  scheduleMileageReminders,
  cancelMileageReminders,
  getNotificationPreference,
  setNotificationPreference,
} from '../services/notificationService';
import { useVehicleStore } from '../store/vehicleStore';

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { isEnabled, setIsEnabled } = useContext(NotificationContext);
  const vehicles = useVehicleStore(s => s.vehicles);
  const [isNotifLoading, setIsNotifLoading] = useState(false);
  const [current, setCurrent] = useState<string>(() => getCurrency());
  const deviceDefault = useMemo(() => detectDeviceCurrency(), []);
  const currencies = useMemo(() => getSupportedCurrencies(), []);
  const deviceInfo = useMemo(() => getCurrencyInfo(deviceDefault), [deviceDefault]);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');

  // Filter currencies live by code, name, or symbol (e.g. "tnd", "tunisian").
  const filteredCurrencies = useMemo(() => {
    const q = currencySearch.trim().toLowerCase();
    if (!q) return currencies;
    return currencies.filter(c =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q)
    );
  }, [currencies, currencySearch]);

  const handleSelect = (value: string) => {
    setShowCurrencyModal(false);
    setCurrencySearch('');
    if (value === '__device__') {
      resetCurrency();
      setCurrent(detectDeviceCurrency());
      setToastMsg(t('settings.useDeviceDefaultToast'));
    } else {
      setCurrency(value);
      setCurrent(value);
      setToastMsg(t('settings.savedToast', { currency: value }));
    }
    setShowToast(true);
  };

  const handleNotificationToggle = async () => {
    setIsNotifLoading(true);
    try {
      const status = await getNotificationPermissionStatus();
      const permGranted = status.display === 'granted';
      const userPreference = getNotificationPreference();
      const currentlyEnabled = permGranted && userPreference;

      if (currentlyEnabled) {
        // Toggle off: save preference and cancel all reminders
        setNotificationPreference(false);
        await cancelMileageReminders();
        setIsEnabled(false);
      } else {
        // Toggle on: check if we need to request permission first
        if (!permGranted) {
          const result = await requestNotificationPermission();
          if (result.display !== 'granted') {
            setIsEnabled(false);
            setIsNotifLoading(false);
            return;
          }
        }
        // Permission granted (either already had it or just got it):
        // save preference and schedule
        setNotificationPreference(true);
        await scheduleMileageReminders(vehicles);
        setIsEnabled(true);
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
    } finally {
      setIsNotifLoading(false);
    }
  };

  const preview = formatCurrency(1234.5);
  const activeLabel = (() => {
    const info = getCurrencyInfo(current);
    return `${info.code} (${info.symbol})`;
  })();
return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/dashboard" />
          </IonButtons>
          <IonTitle>{t('settings.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonCard style={{ margin: '12px' }}>
          <IonCardContent>
            <div style={{ textAlign: 'center', marginBottom: '12px', marginTop: '8px' }}>
              <IonIcon icon={wallet} style={{ fontSize: '48px', color: 'var(--ion-color-primary)' }} />
              <h2 style={{ fontWeight: 600, margin: '8px 0' }}>{t('settings.currency')}</h2>
              <IonText color="medium">
                <p style={{ margin: 0, fontSize: '13px' }}>{t('settings.currencyDesc')}</p>
              </IonText>
            </div>

            {/* Preview */}
            <IonList inset style={{ marginTop: '12px' }}>
              <IonItem>
                <IonLabel>{t('settings.activeCurrency')}</IonLabel>
                <IonLabel slot="end" style={{ fontWeight: 700 }}>{activeLabel}</IonLabel>
              </IonItem>
              <IonItem>
                <IonLabel>{t('settings.preview')}</IonLabel>
                <IonLabel slot="end" style={{ fontWeight: 700 }}>{preview}</IonLabel>
              </IonItem>
              <IonItem>
                <IonLabel>{t('settings.deviceLocale')}</IonLabel>
                <IonLabel slot="end">{getDeviceLocale()}</IonLabel>
              </IonItem>
            </IonList>

            {/* Selector */}
            <IonItem button onClick={() => setShowCurrencyModal(true)} style={{ marginTop: '16px' }}>
              <IonIcon icon={search} slot="start" color="primary" />
              <IonLabel>
                <h3 style={{ fontSize: '14px', fontWeight: 600 }}>{t('settings.selectCurrency')}</h3>
                <p style={{ fontSize: '13px' }}>{activeLabel}</p>
              </IonLabel>
              <IonIcon icon={chevronForward} slot="end" color="medium" />
            </IonItem>

            <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)', marginTop: '12px' }}>
              {t('settings.deviceDefaultHint')}
              {t('settings.currencyCount', { count: currencies.length })}
            </p>

            {/* Privacy link */}
            <IonItem
              button
              style={{ marginTop: '16px' }}
              onClick={() => history.push('/privacy-settings')}
            >
              <IonIcon icon={shieldCheckmark} slot="start" color="primary" />
              <IonLabel>{t('menu.privacySettings')}</IonLabel>
            </IonItem>
          </IonCardContent>
        </IonCard>

        {/* Notifications */}
        <IonCard style={{ margin: '12px' }}>
          <IonCardContent>
            <div style={{ textAlign: 'center', marginBottom: '12px', marginTop: '8px' }}>
              <IonIcon icon={notifications} style={{ fontSize: '48px', color: 'var(--ion-color-primary)' }} />
              <h2 style={{ fontWeight: 600, margin: '8px 0' }}>{t('notificationToggle.label')}</h2>
              <IonText color="medium">
                <p style={{ margin: 0, fontSize: '13px' }}>{t('notificationBanner.text')}</p>
              </IonText>
            </div>

            <IonList inset style={{ marginTop: '12px' }}>
              <IonItem lines="full">
                <IonIcon icon={notifications} slot="start" color="primary" />
                <IonLabel>{t('notificationToggle.label')}</IonLabel>
                <IonToggle
                  slot="end"
                  checked={isEnabled}
                  disabled={isNotifLoading}
                  onIonChange={() => handleNotificationToggle()}
                />
              </IonItem>
              <IonItem
                button
                detail
                onClick={() => history.push('/notification-schedule')}
              >
                <IonIcon icon={alarm} slot="start" color="medium" />
                <IonLabel>{t('menu.notificationSchedule')}</IonLabel>
              </IonItem>
            </IonList>
          </IonCardContent>
        </IonCard>

        <IonToast
          isOpen={showToast}
          message={toastMsg}
          duration={2000}
          position="middle"
          onDidDismiss={() => setShowToast(false)}
        />

        {/* Searchable currency picker modal */}
        <IonModal isOpen={showCurrencyModal} onDidDismiss={() => { setShowCurrencyModal(false); setCurrencySearch(''); }}>
          <IonHeader>
            <IonToolbar color="primary">
              <IonTitle>{t('settings.selectCurrency')}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => { setShowCurrencyModal(false); setCurrencySearch(''); }}>{t('common.cancel')}</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonSearchbar
              value={currencySearch}
              onIonInput={e => setCurrencySearch(e.detail.value || '')}
              onIonChange={e => setCurrencySearch(e.detail.value || '')}
              placeholder={t('settings.searchCurrencyPlaceholder')}
              autocorrect="off"
              spellcheck={false}
              debounce={0}
            />
            <IonList>
              {/* Use device default (pinned) */}
              <IonItem
                button
                onClick={() => handleSelect('__device__')}
                style={{ '--min-height': '48px' }}
              >
                <IonIcon icon={wallet} slot="start" color="primary" />
                <IonLabel>
                  <h3 style={{ fontSize: '14px', fontWeight: 600 }}>{t('settings.useDeviceDefault')}</h3>
                  <p style={{ fontSize: '12px' }}>{deviceInfo.code} — {deviceInfo.symbol} — {deviceInfo.name}</p>
                </IonLabel>
                {current === deviceDefault && (
                  <IonIcon icon={checkmark} slot="end" color="primary" />
                )}
              </IonItem>

              {filteredCurrencies.length === 0 && (
                <div className="ion-padding ion-text-center" style={{ color: 'var(--ion-color-medium)', marginTop: '12px' }}>
                  <p>{t('settings.noCurrencies')}</p>
                </div>
              )}

              {filteredCurrencies.map(c => (
                <IonItem key={c.code} button onClick={() => handleSelect(c.code)}>
                  <IonLabel>
                    <h3 style={{ fontSize: '14px' }}>{c.code} — {c.symbol}</h3>
                    <p style={{ fontSize: '12px' }}>{c.name}</p>
                  </IonLabel>
                  {current === c.code && (
                    <IonIcon icon={checkmark} slot="end" color="primary" />
                  )}
                </IonItem>
              ))}
            </IonList>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Settings;