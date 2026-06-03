import { AdMob, InterstitialAdPluginEvents, AdLoadInfo, AdOptions, BannerAdOptions, BannerAdPluginEvents, BannerAdPosition, BannerAdSize, AdMobRewardItem, RewardAdOptions, RewardAdPluginEvents } from "@capacitor-community/admob";

export async function interstitial(): Promise<void> {
  AdMob.addListener(InterstitialAdPluginEvents.Loaded, (info: AdLoadInfo) => {
    console.log('interstitial showed', JSON.stringify(info))
  });

  const options: AdOptions = {
    adId: 'ca-app-pub-9080625797289443/9577056399',
    isTesting: true,
    npa: true,
    immersiveMode: true
  };
  await AdMob.prepareInterstitial(options);
  await AdMob.showInterstitial();
}

export async function rewardVideo(): Promise<void> {
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
    isTesting: true,
    npa: true,
    immersiveMode: true
  };
  await AdMob.prepareRewardVideoAd(options);
  const rewardItem = await AdMob.showRewardVideoAd();
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
    isTesting: true,
    npa: true
  };
  await AdMob.showBanner(options);
};
