import { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { alertController } from '@ionic/core';
import { useTranslation } from 'react-i18next';

export const useBackButton = () => {
  const history = useHistory();
  const location = useLocation();
  const { t } = useTranslation();

  console.log(location)
  useEffect(() => {
    const dismissOpenOverlay = async (): Promise<boolean> => {
      const selectors = ['ion-modal.show-modal', 'ion-action-sheet', 'ion-alert', 'ion-popover', 'ion-loading', 'ion-picker'];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && typeof (el as any).dismiss === 'function') {
          await (el as any).dismiss();
          return true;
        }
      }
      return false;
    };

    const handleBackButton = async () => {
      // If any overlay (modal/action sheet/alert/popover) is open, close it instead of navigating
      if (await dismissOpenOverlay()) return;
      // On dashboard, show exit confirmation
      if (location.pathname === '/dashboard' || !history || history.length === 0) {
        const alert = await alertController.create({
          header: t('backButton.exitTitle'),
          message: t('backButton.exitMessage'),
          buttons: [
            { text: t('backButton.cancel'), role: 'cancel' },
            { text: t('backButton.exit'), role: 'destructive' }
          ]
        });
        await alert.present();
        const { role } = await alert.onDidDismiss();
        if (role === 'destructive') {
          CapacitorApp.exitApp();
        }
      } else {
        // Navigate back on other pages
        if (history.length > 1) {
          history.goBack();
        }
      }
    };

    const subscription = CapacitorApp.addListener('backButton', handleBackButton);
    return () => {
      subscription.then(s => s.remove());
    };
  }, [history, location.pathname, t]);
};