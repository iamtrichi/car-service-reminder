import React, { useEffect, useState } from 'react';
import { IonSpinner, IonModal, IonButton, IonIcon, IonText, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/react';
import { cloudDownload, close } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { checkRemoteVersion, openPlayStore } from '../services/appUpdateService';
import type { VersionCheckResult } from '../services/appUpdateService';
import ForceUpdateScreen from './ForceUpdateScreen';

type GateState =
  | { phase: 'loading' }
  | { phase: 'force-update'; minimumVersion: string }
  | { phase: 'optional-update'; latestVersion: string; showModal: boolean }
  | { phase: 'ready' };

interface VersionCheckGateProps {
  children: React.ReactNode;
}

const VersionCheckGate: React.FC<VersionCheckGateProps> = ({ children }) => {
  const { t } = useTranslation();
  const [state, setState] = useState<GateState>({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;

    checkRemoteVersion().then((result: VersionCheckResult) => {
      if (cancelled) return;

      switch (result.type) {
        case 'force-update':
          setState({ phase: 'force-update', minimumVersion: result.minimumVersion });
          break;
        case 'optional-update':
          setState({ phase: 'optional-update', latestVersion: result.latestVersion, showModal: true });
          break;
        case 'up-to-date':
        case 'error':
        default:
          setState({ phase: 'ready' });
          break;
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // While loading, show a centered spinner (blocks everything)
  if (state.phase === 'loading') {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--ion-color-primary)',
          zIndex: 999999,
        }}
      >
        <IonSpinner color="light" style={{ width: '48px', height: '48px' }} />
      </div>
    );
  }

  // Force update — show blocking screen
  if (state.phase === 'force-update') {
    return <ForceUpdateScreen minimumVersion={state.minimumVersion} />;
  }

  // Ready or optional-update — show children
  return (
    <>
      {children}

      {/* Optional update modal */}
      {state.phase === 'optional-update' && (
        <IonModal isOpen={state.showModal} backdropDismiss={false}>
          <IonHeader>
            <IonToolbar color="primary">
              <IonTitle>{t('update.optionalTitle', 'Update Available')}</IonTitle>
              <IonButton slot="end" fill="clear" onClick={() => setState({ ...state, showModal: false })}>
                <IonIcon icon={close} />
              </IonButton>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '16px',
                paddingTop: '32px',
              }}
            >
              <IonIcon
                icon={cloudDownload}
                style={{ fontSize: '64px', color: 'var(--ion-color-primary)' }}
              />

              <h3 style={{ margin: 0 }}>
                {t('update.optionalMessage', 'A new version of the app is available!')}
              </h3>

              <IonText color="medium">
                <p style={{ margin: 0, lineHeight: 1.5 }}>
                  {t('update.optionalDescription', 'Update to version {{version}} to get the latest features and improvements.', {
                    version: state.latestVersion,
                  })}
                </p>
              </IonText>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', width: '100%' }}>
                <IonButton
                  expand="block"
                  fill="outline"
                  onClick={() => setState({ ...state, showModal: false })}
                  style={{ flex: 1 }}
                >
                  {t('update.later', 'Later')}
                </IonButton>
                <IonButton
                  expand="block"
                  onClick={() => { openPlayStore(); setState({ ...state, showModal: false }); }}
                  style={{ flex: 1 }}
                >
                  <IonIcon icon={cloudDownload} slot="start" />
                  {t('update.update', 'Update')}
                </IonButton>
              </div>
            </div>
          </IonContent>
        </IonModal>
      )}
    </>
  );
};

export default VersionCheckGate;