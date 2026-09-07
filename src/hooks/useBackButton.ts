import { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { alertController, toastController } from '@ionic/core';
import { useTranslation } from 'react-i18next';

export const useBackButton = () => {
  const history = useHistory();
  const location = useLocation();
  const { t } = useTranslation();

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

    // Double-press-to-exit pattern on the Dashboard: the first back press
    // shows a hint toast; a second press within the window opens the exit
    // confirmation alert.
    const DOUBLE_PRESS_WINDOW = 2000;
    let lastBackPress = 0;
    let activeToast: HTMLIonToastElement | null = null;
    let exitAlert: HTMLIonAlertElement | null = null;
    // Set synchronously the instant we decide to confirm exit. alertController
    // is async, so without this flag a fast double/triple back-press could
    // land in the gap before `exitAlert` is assigned and stack a second alert
    // (dismissing the first) instead of being swallowed.
    let confirmingExit = false;

    const showPressAgainToast = async () => {
      if (activeToast) {
        await activeToast.dismiss();
        activeToast = null;
      }
      activeToast = await toastController.create({
        message: t('backButton.pressAgainToExit'),
        duration: DOUBLE_PRESS_WINDOW,
        position: 'bottom',
        cssClass: 'exit-toast',
      });
      activeToast.onDidDismiss().then(() => { activeToast = null; });
      await activeToast.present();
    };

    const confirmExit = async () => {
      confirmingExit = true;
      lastBackPress = 0;
      try {
        // Hide the hint toast before the alert takes over.
        if (activeToast) {
          await activeToast.dismiss();
          activeToast = null;
        }
        exitAlert = await alertController.create({
          header: t('backButton.exitTitle'),
          message: t('backButton.exitMessage'),
          buttons: [
            { text: t('backButton.cancel'), role: 'cancel' },
            { text: t('backButton.exit'), role: 'destructive' }
          ]
        });
        await exitAlert.present();
        const { role } = await exitAlert.onDidDismiss();
        exitAlert = null;
        confirmingExit = false;
        if (role === 'destructive') {
          CapacitorApp.exitApp();
        }
      } catch (e) {
        exitAlert = null;
        confirmingExit = false;
      }
    };

    const handleBackButton = async () => {
      // While the exit-confirmation alert is open (or is being created),
      // swallow the back press: the user must explicitly choose Cancel or Exit.
      if (confirmingExit || exitAlert) return;
      // If any other overlay (modal/action sheet/popover) is open, close it instead of navigating
      if (await dismissOpenOverlay()) return;
      if (location.pathname === '/dashboard') {
        const now = Date.now();
        if (now - lastBackPress < DOUBLE_PRESS_WINDOW) {
          // Second press within the window — confirm before closing.
          await confirmExit();
        } else {
          // First press — hint toast, start the window.
          lastBackPress = now;
          await showPressAgainToast();
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
      if (activeToast) activeToast.dismiss();
      if (exitAlert) exitAlert.dismiss();
    };
  }, [history, location.pathname, t]);
};