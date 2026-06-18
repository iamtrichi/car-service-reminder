import { AdMob, InterstitialAdPluginEvents, AdLoadInfo, AdOptions, BannerAdOptions, BannerAdPluginEvents, BannerAdPosition, BannerAdSize, AdMobRewardItem, RewardAdOptions, RewardAdPluginEvents } from "@capacitor-community/admob";
import { useAdLoadingStore } from '../store/adLoadingStore';
import { useConsentStore } from '../store/adConsentStore';
// UMP methods/types not in TS definitions for v8 — cast through any
const AdMobAny = AdMob as any;

/** Result of AdMob.requestConsentInfo() */
export interface ConsentInfo {
  status: 'REQUIRED' | 'NOT_REQUIRED' | 'OBTAINED' | 'UNKNOWN';
  isConsentFormAvailable: boolean;
}

/**
 * Query the native Google UMP SDK for the current consent status.
 * This is the single source of truth — no localStorage needed.
 */
export async function getConsentInfo(): Promise<ConsentInfo> {
  try {
    const info = await AdMobAny.requestConsentInfo({
      publisherIds: ['9080625797289443'],
    });
    console.log('UMP getConsentInfo result:', JSON.stringify(info));
    return info as ConsentInfo;
  } catch (error) {
    console.warn('Failed to get consent info:', error);
    return { status: 'UNKNOWN', isConsentFormAvailable: false };
  }
}

/**
 * Check if the user has given personalized ad consent via the native UMP SDK.
 * Returns true only when status is OBTAINED (user accepted) or NOT_REQUIRED (non-EEA).
 */
export async function isConsentGranted(): Promise<boolean> {
  const info = await getConsentInfo();
  return info.status === 'OBTAINED' || info.status === 'NOT_REQUIRED';
}

/**
 * Returns whether ads should use non-personalized mode (npa=true).
 * Checks the local consent store first (reliable), then falls back to native UMP.
 */
async function shouldUseNpa(): Promise<boolean> {
  // Use local store as primary (always reliable, even on emulator)
  const localChoice = useConsentStore.getState().choice;
  if (localChoice === 'personalized') return false;
  if (localChoice === 'non-personalized') return true;
  // Fallback: check native UMP SDK
  const info = await getConsentInfo();
  return info.status !== 'OBTAINED' && info.status !== 'NOT_REQUIRED';
}

/**
 * Request consent information from Google's UMP and show the consent form if required.
 * Returns the form result status so the caller can determine the user's choice.
 * - 'OBTAINED' = user consented to personalized ads
 * - 'REQUIRED' = user chose "Do not consent" or form was dismissed
 * - 'NOT_REQUIRED' = no consent needed (non-EEA)
 * - 'UNKNOWN' = couldn't determine / no form shown
 */
export async function requestUMPConsent(): Promise<ConsentInfo['status']> {
  try {
    const info = await getConsentInfo();
    console.log('UMP requestUMPConsent - consent info:', JSON.stringify(info));

    if (info.status === 'REQUIRED' && info.isConsentFormAvailable) {
      // Show the Google consent form (uses your AdMob console message)
      console.log('UMP showing consent form...');
      const formResult = await AdMobAny.showConsentForm();
      console.log('UMP consent form closed. Result:', JSON.stringify(formResult));

      // The showConsentForm result tells us what the user chose:
      // - 'OBTAINED' = user consented
      // - 'REQUIRED' = user did not consent (form was completed but declined)
      if (formResult && formResult.status) {
        console.log('UMP using form result status:', formResult.status);
        return formResult.status as ConsentInfo['status'];
      }

      // Fallback: wait a moment and re-read the status from the SDK
      await new Promise(resolve => setTimeout(resolve, 500));
      const updatedInfo = await getConsentInfo();
      console.log('UMP re-read status after form:', JSON.stringify(updatedInfo));
      return updatedInfo.status;
    } else {
      console.log('UMP skipping form - status:', info.status, 'formAvailable:', info.isConsentFormAvailable);
      return info.status;
    }
  } catch (error) {
    console.warn('UMP consent request failed:', error);
    return 'UNKNOWN';
  }
}

/**
 * Reset consent info — used when user wants to change their consent choice.
 * This will re-trigger the Google UMP consent form on next request.
 */
export async function resetConsentInfo(): Promise<void> {
  try {
    await AdMobAny.resetConsentInfo();
  } catch (error) {
    console.warn('Failed to reset consent info:', error);
  }
}

export async function interstitial(): Promise<void> {
  const { setAdLoading } = useAdLoadingStore.getState();
  setAdLoading(true);
  try {
    AdMob.addListener(InterstitialAdPluginEvents.Loaded, (info: AdLoadInfo) => {
      console.log('interstitial showed', JSON.stringify(info))
    });

    const options: AdOptions = {
      adId: 'ca-app-pub-9080625797289443/9577056399',
      isTesting: false,
      npa: await shouldUseNpa(),
      immersiveMode: true
    };
    await AdMob.prepareInterstitial(options);
    await AdMob.showInterstitial();
  } finally {
    setAdLoading(false);
  }
}

export async function rewardVideo(): Promise<void> {
  const { setAdLoading } = useAdLoadingStore.getState();
  setAdLoading(true);
  try {
    AdMob.addListener(RewardAdPluginEvents.Loaded, (info: AdLoadInfo) => {
      // Subscribe prepared rewardVideo
    });

    AdMob.addListener(
      RewardAdPluginEvents.Rewarded,
      (rewardItem: AdMobRewardItem) => {
        // Subscribe user rewarded
        console.log(rewardItem);
      },
    );

    const options: RewardAdOptions = {
      adId: 'ca-app-pub-9080625797289443/3615012221',
      isTesting: false,
      npa: await shouldUseNpa(),
      immersiveMode: true
    };
    await AdMob.prepareRewardVideoAd(options);
    const rewardItem = await AdMob.showRewardVideoAd();
  } finally {
    setAdLoading(false);
  }
}

export const showBanner = async () => {
  AdMob.addListener(BannerAdPluginEvents.SizeChanged, (info: any) => {
    console.log('ad banner size changed');
    const appMargin = parseInt(info.height, 15);
    if (appMargin > 0) {
      const app: HTMLElement = document.querySelector('ion-router-outlet')!;
      app.style.marginBottom = String(Number(appMargin)+10) + 'px';
    }
  });
  AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
    console.log('ad banner loaded');
  });
  const options: BannerAdOptions = {
    adId: 'ca-app-pub-9080625797289443/5062423861',
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    isTesting: false,
    npa: await shouldUseNpa()
  };
  await AdMob.showBanner(options);
};