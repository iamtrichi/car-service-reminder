import React, { useState, useRef } from 'react';
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
} from '@ionic/react';
import { EngineVariant } from '../types';

interface EngineDetailModalProps {
  isOpen: boolean;
  engineCode: string;
  onClose: () => void;
  onSave: (engine: EngineVariant) => void;
}

const EngineDetailModal: React.FC<EngineDetailModalProps> = ({
  isOpen,
  engineCode,
  onClose,
  onSave,
}) => {
  const [engineName, setEngineName] = useState(engineCode);
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

  // Reset all state when modal opens
  const prevOpen = useRef(isOpen);
  if (isOpen && !prevOpen.current) {
    setEngineName(engineCode || '');
    setHp(0);
    setDisplacement('');
    setFuelType('Gasoline');
    setIsTurbo('no');
    setOilNorm('');
    setBrakeFluidType('');
    setCoolantType('');
    setGearboxOilType('');
    setGearboxOilCapacity('');
  }
  prevOpen.current = isOpen;

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
          <IonTitle>Engine Details</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Cancel</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonText color="medium">
          <p>Enter the details for your engine</p>
        </IonText>
        <IonList>
          <IonItem>
            <IonLabel position="stacked">Engine Code / Name</IonLabel>
            <IonInput
              value={engineCode || 'Engine name not found — type below'}
              disabled
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Engine Display Name</IonLabel>
            <IonInput
              value={engineName}
              placeholder="e.g., 1.6 TDI"
              onIonChange={e => setEngineName(e.detail.value || engineCode || '')}
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Horsepower (hp)</IonLabel>
            <IonInput
              type="number"
              value={hp || ''}
              placeholder="e.g., 110"
              onIonChange={e => setHp(parseInt(e.detail.value || '0') || 0)}
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Displacement (L)</IonLabel>
            <IonInput
              value={displacement}
              placeholder="e.g., 1.6"
              onIonChange={e => setDisplacement(e.detail.value || '')}
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Fuel Type</IonLabel>
            <IonSelect value={fuelType} onIonChange={e => setFuelType(e.detail.value)}>
              <IonSelectOption value="Gasoline">Gasoline</IonSelectOption>
              <IonSelectOption value="Diesel">Diesel</IonSelectOption>
              <IonSelectOption value="Electric">Electric</IonSelectOption>
              <IonSelectOption value="Hybrid">Hybrid</IonSelectOption>
              <IonSelectOption value="LPG">LPG</IonSelectOption>
            </IonSelect>
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Turbocharged?</IonLabel>
            <IonSelect value={isTurbo} onIonChange={e => setIsTurbo(e.detail.value)}>
              <IonSelectOption value="no">No (Naturally Aspirated)</IonSelectOption>
              <IonSelectOption value="yes">Yes (Turbo)</IonSelectOption>
            </IonSelect>
          </IonItem>
        </IonList>

        <IonAccordionGroup
          style={{ marginTop: 16 }}
          value="fluid_specs"
        >
          <IonAccordion value="fluid_specs">
            <IonItem slot="header" color="light">
              <IonLabel>Fluid Specifications (optional)</IonLabel>
            </IonItem>
            <div slot="content" className="ion-padding">
              <IonList>
                <IonItem>
                  <IonLabel position="stacked">Engine Oil (norm)</IonLabel>
                  <IonInput
                    value={oilNorm}
                    placeholder="e.g., 5W-30"
                    onIonChange={e => setOilNorm(e.detail.value || '')}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Brake Fluid Type</IonLabel>
                  <IonInput
                    value={brakeFluidType}
                    placeholder="e.g., DOT 4"
                    onIonChange={e => setBrakeFluidType(e.detail.value || '')}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Coolant Type</IonLabel>
                  <IonInput
                    value={coolantType}
                    placeholder="e.g., Ethylene Glycol"
                    onIonChange={e => setCoolantType(e.detail.value || '')}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Gearbox Oil Type</IonLabel>
                  <IonInput
                    value={gearboxOilType}
                    placeholder="e.g., Manual 75W-80"
                    onIonChange={e => setGearboxOilType(e.detail.value || '')}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Gearbox Oil Capacity</IonLabel>
                  <IonInput
                    value={gearboxOilCapacity}
                    placeholder="e.g., 3.5L"
                    onIonChange={e => setGearboxOilCapacity(e.detail.value || '')}
                  />
                </IonItem>
              </IonList>
            </div>
          </IonAccordion>
        </IonAccordionGroup>

        <div style={{ padding: '12px', marginTop: 8 }}>
          <IonButton expand="block" onClick={handleSave}>
            Save Engine
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default EngineDetailModal;