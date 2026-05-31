import React, { useState, useEffect } from 'react';
import { IonFooter, useIonViewWillEnter } from '@ionic/react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonBackButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonInput,
  IonList,
  IonCheckbox,
  IonSpinner,
  IonToast,
  IonSegment,
  IonSegmentButton,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { scan, car, chevronForward } from 'ionicons/icons';
import { useHistory, useParams } from 'react-router-dom';
import { useVehicleStore } from '../store/vehicleStore';
import { decodeVin, isValidVin } from '../services/vinService';
import { getRecommendedIntervals, getMakes, getModelsForMake, getEngineVariantsForModel } from '../services/serviceConfigService';
import { Vehicle, ServiceInterval, VinDecodeResult, EngineVariant } from '../types';
import SearchSelectModal, { SelectOption } from '../components/SearchSelectModal';
import EngineDetailModal from '../components/EngineDetailModal';

interface AddVehicleParams {
  vehicleId?: string;
}

const AddVehicle: React.FC = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const { vehicleId } = useParams<AddVehicleParams>();
  const { vehicles, serviceIntervals, addVehicle, updateVehicle, updateServiceIntervals } = useVehicleStore();

  const [name, setName] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [licensePlate, setLicensePlate] = useState('');
  const [currentMileage, setCurrentMileage] = useState<number>(0);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [vin, setVin] = useState('');

  const [decoding, setDecoding] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedIntervals, setSelectedIntervals] = useState<ServiceInterval[]>([]);
  const [editingInterval, setEditingInterval] = useState<string | null>(null);
  const [vinResult, setVinResult] = useState<VinDecodeResult | null>(null);
  const [inputMode, setInputMode] = useState<'manual' | 'vin'>('manual');
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Cascading selection state
  const [makesData, setMakesData] = useState<SelectOption[]>([]);
  const [modelsData, setModelsData] = useState<SelectOption[]>([]);
  const [engineData, setEngineData] = useState<SelectOption[]>([]);
  const [selectedEngine, setSelectedEngine] = useState<EngineVariant | null>(null);

  // Modal state
  const [showMakeModal, setShowMakeModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [showEngineModal, setShowEngineModal] = useState(false);
  const [showEngineDetail, setShowEngineDetail] = useState(false);
  const [pendingEngineCode, setPendingEngineCode] = useState('');

  const isEditing = !!vehicleId;

  // Reset form every time the page becomes visible (handles Ionic page caching on native)
  useIonViewWillEnter(() => {
    if (!vehicleId) {
      setName('');
      setMake('');
      setModel('');
      setYear(new Date().getFullYear());
      setLicensePlate('');
      setCurrentMileage(0);
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setVin('');
      setVinResult(null);
      setSelectedEngine(null);
      setSelectedIntervals([]);
      setEngineData([]);
      setModelsData([]);
      setInputMode('manual');
      setDecoding(false);
      setGenerating(false);
    }
  });

  // Load makes on mount
  useEffect(() => {
    getMakes().then(makes => {
      setMakesData(makes.map(m => ({
        value: m.name,
        label: m.name,
        imageUrl: m.imageUrl,
      })));
    });
  }, []);

  // Load existing data if editing
  useEffect(() => {
    if (vehicleId) {
      const v = vehicles.find(v => v.id === vehicleId);
      if (v) {
        setName(v.name);
        setMake(v.make);
        setModel(v.model);
        setYear(v.year);
        setLicensePlate(v.licensePlate || '');
        setCurrentMileage(v.currentMileage);
        setPurchaseDate(v.purchaseDate || new Date().toISOString().split('T')[0]);
        setVin(v.vin || '');
        if (v.hp) {
          setSelectedEngine({
            engineCode: v.engineCode || '',
            engineName: v.engineName || '',
            hp: v.hp,
            fuelType: v.fuelType,
            isTurbo: v.isTurbo,
            displacement: v.engineDisplacement,
            oilNorm: v.oilNorm,
            brakeFluidType: v.brakeFluidType,
            coolantType: v.coolantType,
            gearboxOilType: v.gearboxOilType,
            gearboxOilCapacity: v.gearboxOilCapacity,
          });
        }
        const intervals = serviceIntervals.filter(i => i.vehicleId === vehicleId);
        setSelectedIntervals(intervals);

        // Load models for this make
        getModelsForMake(v.make).then(models => {
          setModelsData(models.map(m => ({
            value: m.name,
            label: m.name,
            detail: m.years,
            imageUrl: m.imageUrl,
          })));
        });
      }
    }
  }, [vehicleId]);

  // Update models when make changes
  useEffect(() => {
    if (make) {
      getModelsForMake(make).then(models => {
        setModelsData(models.map(m => ({
          value: m.name,
          label: m.name,
          detail: m.years,
          imageUrl: m.imageUrl,
        })));
        // Clear model + engine if make changed
        if (!isEditing) {
          setModel('');
          setSelectedEngine(null);
          setEngineData([]);
        }
      });
    }
  }, [make]);

  // Update engines when model changes
  useEffect(() => {
    if (make && model) {
      getEngineVariantsForModel(make, model).then(engines => {
        setEngineData(engines.map(e => ({
          value: `${e.engineCode}|${e.hp}`,
          label: `${e.engineName} ${e.hp}hp`,
          detail: `${e.displacement ? e.displacement + 'L ' : ''}${e.fuelType || ''}${e.isTurbo ? ' Turbo' : e.fuelType ? ' NA' : ''}`,
        })));
        if (!isEditing) {
          setSelectedEngine(null);
        }
      });
    }
  }, [make, model]);

  const handleSelectEngine = (value: string) => {
    if (value === '__custom__') {
      // No engines in DB — open detail modal for user to create one
      setPendingEngineCode('');
      setShowEngineDetail(true);
    } else if (value.includes('|') && make && model) {
      // Standard "engineCode|hp" format from our data
      const [code, hpStr] = value.split('|');
      const hp = parseInt(hpStr);
      getEngineVariantsForModel(make, model).then(engines => {
        const variant = engines.find(e => e.engineCode === code && e.hp === hp);
        if (variant) {
          setSelectedEngine(variant);
          // Auto-generate intervals when engine is selected
          handleGenerateIntervalsWithEngine(variant);
        }
      });
    } else {
      // Custom engine — user typed in a name, open detail modal
      setPendingEngineCode(value);
      setShowEngineDetail(true);
    }
    setShowEngineModal(false);
  };

  const handleMakeSelect = (value: string) => {
    setMake(value);
    setShowMakeModal(false);
  };

  const handleModelSelect = (value: string) => {
    setModel(value);
    setShowModelModal(false);
  };

  const handleDecodeVin = async () => {
    if (!vin || !isValidVin(vin)) {
      setToastMsg(t('addVehicle.vinInvalid'));
      setShowToast(true);
      return;
    }

    setDecoding(true);
    const result = await decodeVin(vin);
    setDecoding(false);

    if (result) {
      setVinResult(result);
      setMake(result.make);
      setModel(result.model);
      setYear(result.year);
      setName(`${result.make} ${result.model} ${result.year}`);

      // Try to match to our data
      const models = await getModelsForMake(result.make);
      const matchedModel = models.find(m => m.name.toLowerCase().includes(result.model.toLowerCase()));
      if (matchedModel) {
        setModel(matchedModel.name);
        // Try to match engine
        const engines = await getEngineVariantsForModel(result.make, matchedModel.name);
        if (engines.length > 0 && result.engineCode) {
          const matchedEngine = engines.find(e =>
            e.engineCode.toLowerCase() === result.engineCode!.toLowerCase()
          );
          if (matchedEngine) {
            setSelectedEngine(matchedEngine);
          }
        }
      }

      setToastMsg(t('addVehicle.vinDecoded'));
      setShowToast(true);

      // Generate recommended intervals
      setGenerating(true);
      const tempId = 'temp_' + Date.now();
      const intervals = await getRecommendedIntervals(tempId, result);
      setGenerating(false);
      setSelectedIntervals(intervals);
    } else {
      setToastMsg(t('addVehicle.vinFailed'));
      setShowToast(true);
    }
  };

  const handleGenerateIntervalsWithEngine = async (engine?: EngineVariant) => {
    if (!make || !model) return;

    setGenerating(true);
    const tempId = 'temp_' + Date.now();
    const eng = engine || selectedEngine;
    const vinInfo: VinDecodeResult = vinResult || {
      make,
      model,
      year,
      engineCode: eng?.engineCode,
      engineName: eng?.engineName,
      engineDisplacement: eng?.displacement,
      fuelType: eng?.fuelType,
      isTurbo: eng?.isTurbo,
    };
    const intervals = await getRecommendedIntervals(tempId, vinInfo);
    setGenerating(false);
    setSelectedIntervals(intervals);
  };

  const toggleInterval = (interval: ServiceInterval) => {
    setSelectedIntervals(prev => {
      const exists = prev.find(i => i.id === interval.id);
      if (exists) return prev.filter(i => i.id !== interval.id);
      return [...prev, interval];
    });
  };

  const updateIntervalValue = (id: string, field: 'intervalMileage' | 'intervalMonths', value: number | null) => {
    setSelectedIntervals(prev =>
      prev.map(i => i.id === id ? { ...i, [field]: value } : i)
    );
  };

  const addCustomService = () => {
    const tempId = 'custom_' + Date.now();
    const newInterval: ServiceInterval = {
      id: tempId,
      vehicleId: 'temp',
      serviceType: 'other' as any,
      name: '',
      intervalMileage: 10000,
      intervalMonths: 12,
      lastPerformedMileage: null,
      lastPerformedDate: null,
      isRecurring: true,
    };
    setSelectedIntervals(prev => [...prev, newInterval]);
    setEditingInterval(tempId);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setToastMsg(t('addVehicle.validationName'));
      setShowToast(true);
      return;
    }
    if (!make) {
      setToastMsg(t('addVehicle.validationMake'));
      setShowToast(true);
      return;
    }
    if (!model) {
      setToastMsg(t('addVehicle.validationModel'));
      setShowToast(true);
      return;
    }

    const activeIntervals = selectedIntervals.filter(i => i.name.trim());

    if (isEditing && vehicleId) {
      const existingVehicle = vehicles.find(v => v.id === vehicleId);
      const vehicle: Vehicle = {
        id: vehicleId,
        name: name.trim(),
        make,
        model,
        year,
        licensePlate: licensePlate.trim() || undefined,
        vin: vin.trim() || undefined,
        engineCode: selectedEngine?.engineCode ?? existingVehicle?.engineCode,
        engineName: selectedEngine?.engineName ?? existingVehicle?.engineName,
        hp: selectedEngine?.hp ?? existingVehicle?.hp ?? 0,
        engineDisplacement: selectedEngine?.displacement ?? existingVehicle?.engineDisplacement,
        fuelType: selectedEngine?.fuelType ?? existingVehicle?.fuelType,
        isTurbo: selectedEngine?.isTurbo ?? existingVehicle?.isTurbo ?? false,
        currentMileage,
        purchaseDate: purchaseDate || undefined,
        createdAt: existingVehicle?.createdAt || new Date().toISOString(),
        // Preserve existing fluid data if not explicitly changed via engine selection
        oilNorm: selectedEngine?.oilNorm ?? existingVehicle?.oilNorm,
        brakeFluidType: selectedEngine?.brakeFluidType ?? existingVehicle?.brakeFluidType,
        coolantType: selectedEngine?.coolantType ?? existingVehicle?.coolantType,
        gearboxOilType: selectedEngine?.gearboxOilType ?? existingVehicle?.gearboxOilType,
        gearboxOilCapacity: selectedEngine?.gearboxOilCapacity ?? existingVehicle?.gearboxOilCapacity,
        imageUrl: existingVehicle?.imageUrl,
      };
      updateVehicle(vehicle);
      updateServiceIntervals(vehicleId, activeIntervals.map(i => ({ ...i, vehicleId })));
    } else {
      const newId = 'v_' + Date.now();
      const vehicle: Vehicle = {
        id: newId,
        name: name.trim(),
        make,
        model,
        year,
        licensePlate: licensePlate.trim() || undefined,
        vin: vin.trim() || undefined,
        engineCode: selectedEngine?.engineCode,
        engineName: selectedEngine?.engineName,
        hp: selectedEngine?.hp,
        engineDisplacement: selectedEngine?.displacement,
        fuelType: selectedEngine?.fuelType,
        isTurbo: selectedEngine?.isTurbo,
        currentMileage,
        purchaseDate: purchaseDate || undefined,
        createdAt: new Date().toISOString(),
        oilNorm: selectedEngine?.oilNorm,
        brakeFluidType: selectedEngine?.brakeFluidType,
        coolantType: selectedEngine?.coolantType,
        gearboxOilType: selectedEngine?.gearboxOilType,
        gearboxOilCapacity: selectedEngine?.gearboxOilCapacity,
      };

      const intervals = activeIntervals.map(i => ({
        ...i,
        id: `${newId}_${i.serviceType}_${Date.now()}`,
        vehicleId: newId,
      }));

      addVehicle(vehicle, intervals);
    }

    history.push('/dashboard');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/dashboard" />
          </IonButtons>
          <IonTitle>{isEditing ? t('addVehicle.titleEdit') : t('addVehicle.titleAdd')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {/* Input Mode Toggle */}
        <IonSegment value={inputMode} onIonChange={e => setInputMode(e.detail.value as any)}>
          <IonSegmentButton value="vin">
            <IonIcon icon={scan} />
            <IonLabel>{t('addVehicle.vinScan')}</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="manual">
            <IonIcon icon={car} />
            <IonLabel>{t('addVehicle.manual')}</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        {inputMode === 'vin' && (
          <IonList>
            <IonItem>
              <IonLabel position="stacked">{t('addVehicle.vinLabel')}</IonLabel>
              <IonInput
                value={vin}
                placeholder={t('addVehicle.vinPlaceholder')}
                onIonChange={e => setVin(e.detail.value || '')}
                maxlength={17}
                style={{ textTransform: 'uppercase' }}
              />
              <IonButton slot="end" onClick={handleDecodeVin} disabled={decoding}>
                {decoding ? <IonSpinner /> : t('addVehicle.vinDecode')}
              </IonButton>
            </IonItem>
            {vinResult && (
              <IonItem color="success">
                <IonLabel>
                  <h3>{vinResult.make} {vinResult.model} {vinResult.year}</h3>
                  {vinResult.engineCode && <p>{t('addVehicle.engineCode')} {vinResult.engineCode}</p>}
                  {vinResult.engineName && <p>{t('addVehicle.engine')} {vinResult.engineName}</p>}
                  {vinResult.engineDisplacement && <p>{t('addVehicle.displacement')} {vinResult.engineDisplacement}L</p>}
                  {vinResult.fuelType && <p>{t('addVehicle.fuel')} {vinResult.fuelType} {vinResult.isTurbo ? '(Turbo)' : '(NA)'}</p>}
                </IonLabel>
              </IonItem>
            )}
          </IonList>
        )}

        {/* Cascading Selection Fields */}
        <IonList>
          <IonItem>
            <IonLabel position="stacked">{t('addVehicle.vehicleName')}</IonLabel>
            <IonInput
              value={name}
              placeholder={t('addVehicle.vehicleNamePlaceholder')}
              onIonChange={e => setName(e.detail.value || '')}
            />
          </IonItem>

          {/* Make selector */}
          <IonItem button onClick={() => setShowMakeModal(true)} detail>
            <IonLabel>
              <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>{t('addVehicle.make')}</p>
              <h3 style={{ fontWeight: make ? 500 : 400 }}>{make || t('addVehicle.makePlaceholder')}</h3>
            </IonLabel>
            <IonIcon icon={chevronForward} slot="end" color="medium" />
          </IonItem>

          {/* Model selector - enabled only when make is selected */}
          <IonItem
            button
            onClick={() => {
              if (make) setShowModelModal(true);
              else {
                setToastMsg(t('addVehicle.toastSelectMakeFirst'));
                setShowToast(true);
              }
            }}
            detail
          >
            <IonLabel>
              <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>{t('addVehicle.model')}</p>
              <h3 style={{ fontWeight: model ? 500 : 400 }}>{model || (make ? t('addVehicle.modelPlaceholder') : t('addVehicle.modelSelectFirst'))}</h3>
            </IonLabel>
            <IonIcon icon={chevronForward} slot="end" color="medium" />
          </IonItem>

          {/* Engine selector - enabled only when model is selected */}
          <IonItem
            button
            onClick={() => {
              if (model) setShowEngineModal(true);
              else {
                setToastMsg(t('addVehicle.toastSelectModelFirst'));
                setShowToast(true);
              }
            }}
            detail
          >
            <IonLabel>
              <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>{t('addVehicle.engineVariant')}</p>
              <h3 style={{ fontWeight: selectedEngine ? 500 : 400 }}>
                {selectedEngine
                  ? `${selectedEngine.engineName} ${selectedEngine.hp}hp`
                  : (model ? t('addVehicle.enginePlaceholder') : t('addVehicle.engineSelectFirst'))}
              </h3>
              {selectedEngine && (
                <p style={{ fontSize: '11px', color: 'var(--ion-color-medium)' }}>
                  {[selectedEngine.displacement, selectedEngine.fuelType, selectedEngine.isTurbo ? 'Turbo' : selectedEngine.fuelType ? 'NA' : ''].filter(Boolean).join(' • ')}
                </p>
              )}
            </IonLabel>
            <IonIcon icon={chevronForward} slot="end" color="medium" />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">{t('addVehicle.year')}</IonLabel>
            <IonInput
              type="number"
              value={year}
              onIonChange={e => setYear(parseInt(e.detail.value || '0') || new Date().getFullYear())}
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">{t('addVehicle.licensePlate')}</IonLabel>
            <IonInput
              value={licensePlate}
              placeholder={t('addVehicle.licensePlaceholder')}
              onIonChange={e => setLicensePlate(e.detail.value || '')}
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">{t('addVehicle.currentMileage')}</IonLabel>
            <IonInput
              type="number"
              value={currentMileage}
              onIonChange={e => setCurrentMileage(parseInt(e.detail.value || '0') || 0)}
              onIonInput={e => setCurrentMileage(parseInt(e.detail.value || '0') || 0)}
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">{t('addVehicle.purchaseDate')}</IonLabel>
            <IonInput
              type="date"
              value={purchaseDate}
              onIonChange={e => setPurchaseDate(e.detail.value || new Date().toISOString().split('T')[0])}
            />
          </IonItem>
        </IonList>

        {/* Generate Intervals Button */}
        {selectedEngine && (
          <div style={{ padding: '12px' }}>
            <IonButton expand="block" onClick={() => handleGenerateIntervalsWithEngine()} disabled={generating} fill="outline">
              {generating ? <IonSpinner /> : t('addVehicle.regenerateServices')}
            </IonButton>
          </div>
        )}

        {/* Service Intervals Selection */}
        {selectedIntervals.length > 0 && (
          <IonList>
            <IonItem lines="full">
              <IonLabel>
                <h3>{t('addVehicle.serviceIntervals')}</h3>
                <p>{t('addVehicle.serviceIntervalsDesc')}</p>
              </IonLabel>
            </IonItem>
            {selectedIntervals.map(interval => (
              <IonItem key={interval.id}>
                <IonCheckbox
                  slot="start"
                  checked={!!interval.name.trim()}
                  onIonChange={() => toggleInterval(interval)}
                />
                <IonLabel>
                  {interval.serviceType === ('other' as any) ? (
                    <IonInput
                      value={interval.name}
                      placeholder={t('addVehicle.serviceNamePlaceholder')}
                      onIonChange={e => {
                        const name = e.detail.value || '';
                        setSelectedIntervals(prev =>
                          prev.map(i => i.id === interval.id ? { ...i, name } : i)
                        );
                      }}
                    />
                  ) : (
                    <h3>{interval.name}</h3>
                  )}
                  <div style={{ display: 'flex', gap: '8px', fontSize: '12px', marginTop: '4px' }}>
                    <span>
                      {t('addVehicle.every')}{' '}
                      <IonInput
                        type="number"
                        value={interval.intervalMileage || ''}
                        placeholder={t('addVehicle.intervalKm')}
                        style={{ display: 'inline-block', width: '70px', '--padding-start': '4px', '--padding-end': '4px', fontSize: '12px' } as any}
                        onIonChange={e => updateIntervalValue(interval.id, 'intervalMileage', e.detail.value ? parseInt(e.detail.value) : null)}
                      /> {t('addVehicle.intervalKm')}
                    </span>
                    <span>
                      /{' '}
                      <IonInput
                        type="number"
                        value={interval.intervalMonths || ''}
                        placeholder={t('addVehicle.intervalMonths')}
                        style={{ display: 'inline-block', width: '50px', '--padding-start': '4px', '--padding-end': '4px', fontSize: '12px' } as any}
                        onIonChange={e => updateIntervalValue(interval.id, 'intervalMonths', e.detail.value ? parseInt(e.detail.value) : null)}
                      /> {t('addVehicle.intervalMonths')}
                    </span>
                  </div>
                </IonLabel>
              </IonItem>
            ))}
            <IonItem button onClick={addCustomService}>
              <IonLabel color="primary">{t('addVehicle.addCustomService')}</IonLabel>
            </IonItem>
          </IonList>
        )}

        {/* Search Modals */}
        <SearchSelectModal
          isOpen={showMakeModal}
          onClose={() => setShowMakeModal(false)}
          onSelect={handleMakeSelect}
          title={t('addVehicle.selectMake')}
          options={makesData}
          searchPlaceholder={t('addVehicle.searchMake')}
          allowCustom
        />

        <SearchSelectModal
          isOpen={showModelModal}
          onClose={() => setShowModelModal(false)}
          onSelect={handleModelSelect}
          title={t('addVehicle.selectModel')}
          options={modelsData}
          searchPlaceholder={t('addVehicle.searchModel')}
          allowCustom
        />

        <SearchSelectModal
          isOpen={showEngineModal}
          onClose={() => setShowEngineModal(false)}
          onSelect={handleSelectEngine}
          title={t('addVehicle.selectEngine')}
          options={engineData}
          searchPlaceholder={t('addVehicle.searchEngine')}
          allowCustom
        />

        {/* Engine Detail Modal for custom engines */}
        <EngineDetailModal
          isOpen={showEngineDetail}
          engineCode={pendingEngineCode}
          onClose={() => setShowEngineDetail(false)}
          onSave={(engine) => {
            setSelectedEngine(engine);
            setShowEngineDetail(false);
            handleGenerateIntervalsWithEngine(engine);
          }}
        />

        <IonToast
          isOpen={showToast}
          message={toastMsg}
          duration={3000}
          position="top"
          onDidDismiss={() => setShowToast(false)}
        />
      </IonContent>
      {/* Save Button */}
        <IonFooter>
          <div style={{ padding: '24px 12px' }}>
            <IonButton expand="block" onClick={handleSave}>
              {isEditing ? t('addVehicle.updateVehicle') : t('addVehicle.saveVehicle')}
            </IonButton>
          </div>
        </IonFooter>
    </IonPage>
  );
};

export default AddVehicle;