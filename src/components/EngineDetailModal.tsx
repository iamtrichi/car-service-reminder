import React, { useState, useEffect } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonText,
  IonAccordionGroup,
  IonAccordion,
  IonFooter,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { EngineVariant } from '../types';

interface EngineDetailModalProps {
  isOpen: boolean;
  engineCode: string;
  initialData?: Partial<EngineVariant>;
  onClose: () => void;
  onSave: (engine: EngineVariant) => void;
}

const EngineDetailModal: React.FC<EngineDetailModalProps> = ({
  isOpen,
  engineCode,
  initialData,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const [engineName, setEngineName] = useState('');
  const [hp, setHp] = useState<number>(0);
  const [displacement, setDisplacement] = useState('');
  const [fuelType, setFuelType] = useState('Gasoline');
  const [isTurbo, setIsTurbo] = useState<'yes' | 'no'>('no');

  // Fluid specs
  const [oilNorm, setOilNorm] = useState('');
  const [brakeFluidType, setBrakeFluidType] = useState('');
  const [coolantType, setCoolantType] = useState('');
  const [gearboxOilType, setGearboxOilType] = useState('');
  const [gearboxOilCapacity, setGearboxOilCapacity] = useState('');

  // Pre-populate state from existing vehicle data whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setEngineName(initialData?.engineName || engineCode || '');
      setHp(initialData?.hp || 0);
      setDisplacement(initialData?.displacement || '');
      setFuelType(initialData?.fuelType || 'Gasoline');
      setIsTurbo(initialData?.isTurbo === true ? 'yes' : 'no');
      setOilNorm(initialData?.oilNorm || '');
      setBrakeFluidType(initialData?.brakeFluidType || '');
      setCoolantType(initialData?.coolantType || '');
      setGearboxOilType(initialData?.gearboxOilType || '');
      setGearboxOilCapacity(initialData?.gearboxOilCapacity || '');
    }
  }, [isOpen, engineCode, initialData?.engineName, initialData?.hp, initialData?.displacement, initialData?.fuelType, initialData?.isTurbo, initialData?.oilNorm, initialData?.brakeFluidType, initialData?.coolantType, initialData?.gearboxOilType, initialData?.gearboxOilCapacity]);

  const handleSave = () => {
    const engine: EngineVariant = {
      engineCode,
      engineName: engineName || engineCode,
      hp: hp || 0,
      displacement: displacement || undefined,
      fuelType: fuelType || undefined,
      isTurbo: isTurbo === 'yes',
      oilNorm: oilNorm || undefined,
      brakeFluidType: brakeFluidType || undefined,
      coolantType: coolantType || undefined,
      gearboxOilType: gearboxOilType || undefined,
      gearboxOilCapacity: gearboxOilCapacity || undefined,
    };
    onSave(engine);
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>{t('engineDetail.title')}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>{t('engineDetail.cancel')}</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonText color="medium">
          <p>{t('engineDetail.description')}</p>
        </IonText>
        <IonList>
          <IonItem>
            <IonLabel position="stacked">{t('engineDetail.engineCodeLabel')}</IonLabel>
            <IonInput
              value={engineCode || t('engineDetail.engineCodeMissing')}
              disabled
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">{t('engineDetail.engineDisplayName')}</IonLabel>
            <IonInput
              value={engineName}
              placeholder={t('engineDetail.engineDisplayPlaceholder')}
              onIonChange={e => setEngineName(e.detail.value || engineCode || '')}
              onIonInput={e => setEngineName(e.detail.value || engineCode || '')}
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">{t('engineDetail.horsepower')}</IonLabel>
            <IonInput
              type="number"
              value={hp || ''}
              placeholder={t('engineDetail.horsepowerPlaceholder')}
              onIonChange={e => setHp(parseInt(e.detail.value || '0') || 0)}
              onIonInput={e => setHp(parseInt(e.detail.value || '0') || 0)}
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">{t('engineDetail.displacement')}</IonLabel>
            <IonInput
              value={displacement}
              placeholder={t('engineDetail.displacementPlaceholder')}
              onIonChange={e => setDisplacement(e.detail.value || '')}
              onIonInput={e => setDisplacement(e.detail.value || '')}
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">{t('engineDetail.fuelType')}</IonLabel>
            <IonSelect value={fuelType} onIonChange={e => setFuelType(e.detail.value)}>
              <IonSelectOption value="Gasoline">{t('engineDetail.fuelGasoline')}</IonSelectOption>
              <IonSelectOption value="Diesel">{t('engineDetail.fuelDiesel')}</IonSelectOption>
              <IonSelectOption value="Electric">{t('engineDetail.fuelElectric')}</IonSelectOption>
              <IonSelectOption value="Hybrid">{t('engineDetail.fuelHybrid')}</IonSelectOption>
              <IonSelectOption value="LPG">{t('engineDetail.fuelLPG')}</IonSelectOption>
            </IonSelect>
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">{t('engineDetail.turbocharged')}</IonLabel>
            <IonSelect value={isTurbo} onIonChange={e => setIsTurbo(e.detail.value)}>
              <IonSelectOption value="no">{t('engineDetail.turboNo')}</IonSelectOption>
              <IonSelectOption value="yes">{t('engineDetail.turboYes')}</IonSelectOption>
            </IonSelect>
          </IonItem>
        </IonList>

        <IonAccordionGroup
          style={{ marginTop: 16 }}
          value="fluid_specs"
        >
          <IonAccordion value="fluid_specs">
            <IonItem slot="header" color="light">
              <IonLabel>{t('engineDetail.fluidSpecs')}</IonLabel>
            </IonItem>
            <div slot="content" className="ion-padding">
              <IonList>
                <IonItem>
                  <IonLabel position="stacked">{t('engineDetail.oilNorm')}</IonLabel>
                  <IonInput
                    value={oilNorm}
                    placeholder={t('engineDetail.oilPlaceholder')}
                    onIonChange={e => setOilNorm(e.detail.value || '')}
                    onIonInput={e => setOilNorm(e.detail.value || '')}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">{t('engineDetail.brakeFluid')}</IonLabel>
                  <IonInput
                    value={brakeFluidType}
                    placeholder={t('engineDetail.brakeFluidPlaceholder')}
                    onIonChange={e => setBrakeFluidType(e.detail.value || '')}
                    onIonInput={e => setBrakeFluidType(e.detail.value || '')}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">{t('engineDetail.coolant')}</IonLabel>
                  <IonInput
                    value={coolantType}
                    placeholder={t('engineDetail.coolantPlaceholder')}
                    onIonChange={e => setCoolantType(e.detail.value || '')}
                    onIonInput={e => setCoolantType(e.detail.value || '')}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">{t('engineDetail.gearboxOil')}</IonLabel>
                  <IonInput
                    value={gearboxOilType}
                    placeholder={t('engineDetail.gearboxOilPlaceholder')}
                    onIonChange={e => setGearboxOilType(e.detail.value || '')}
                    onIonInput={e => setGearboxOilType(e.detail.value || '')}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">{t('engineDetail.gearboxCapacity')}</IonLabel>
                  <IonInput
                    value={gearboxOilCapacity}
                    placeholder={t('engineDetail.gearboxCapacityPlaceholder')}
                    onIonChange={e => setGearboxOilCapacity(e.detail.value || '')}
                    onIonInput={e => setGearboxOilCapacity(e.detail.value || '')}
                  />
                </IonItem>
              </IonList>
            </div>
          </IonAccordion>
        </IonAccordionGroup>

        
      </IonContent>
      <IonFooter>
        <div style={{ padding: '12px', marginTop: 8 }}>
          <IonButton expand="block" onClick={handleSave}>
            {t('engineDetail.saveEngine')}
          </IonButton>
        </div>
      </IonFooter>
    </IonModal>
  );
};

export default EngineDetailModal;