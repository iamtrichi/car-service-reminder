import React, { useState, useEffect, useRef } from 'react';
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
  IonChip,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { scan, car, chevronForward, alertCircle, time, checkmark } from 'ionicons/icons';
import { useHistory, useParams } from 'react-router-dom';
import { useVehicleStore } from '../store/vehicleStore';
import { decodeVin, isValidVin } from '../services/vinService';
import { rewardVideo } from '../services/admobUtilits';
import { getRecommendedIntervals, getMakes, getModelsForMake, getEngineVariantsForModel } from '../services/serviceConfigService';
import { Vehicle, ServiceInterval, VinDecodeResult, EngineVariant } from '../types';
import SearchSelectModal, { SelectOption } from '../components/SearchSelectModal';
import EngineDetailModal from '../components/EngineDetailModal';
import { addMonths, differenceInDays, parseISO } from 'date-fns';

interface AddVehicleParams {
  vehicleId?: string;
}

const AddVehicle: React.FC = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const { vehicleId } = useParams<AddVehicleParams>();
  const { vehicles, serviceIntervals, addVehicle, updateVehicle, updateServiceIntervals } = useVehicleStore();
  const getServiceDisplayName = (serviceType: string, fallbackName: string) => {
    if (serviceType === 'other') return fallbackName;
    const key = `serviceTypes.${serviceType}`;
    const translated = t(key);
    return translated === key ? fallbackName : translated;
  };

  const [name, setName] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [licensePlate, setLicensePlate] = useState('');
  const [currentMileage, setCurrentMileage] = useState<number>(0);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [lastServiceMileage, setLastServiceMileage] = useState<number>(0);
  const [lastServiceDate, setLastServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [vin, setVin] = useState('');

  const [decoding, setDecoding] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedIntervals, setSelectedIntervals] = useState<ServiceInterval[]>([]);
  const [editingInterval, setEditingInterval] = useState<string | null>(null);
  const [overriddenIntervalIds, setOverriddenIntervalIds] = useState<Set<string>>(new Set());
  const overriddenIntervalIdsRef = useRef<Set<string>>(new Set());
  // Keep ref in sync
  overriddenIntervalIdsRef.current = overriddenIntervalIds;
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

  /** Update non-overridden intervals' last performed values from the common fields */
  const updateAllLastPerformed = (mileage: number, date: string) => {
    const overridden = overriddenIntervalIdsRef.current;
    setSelectedIntervals(prev =>
      prev.map(i =>
        overridden.has(i.id) ? i : {
          ...i,
          lastPerformedMileage: mileage,
          lastPerformedDate: date,
        }
      )
    );
  };

  const handleLastServiceMileageChange = (val: number) => {
    setLastServiceMileage(val);
    if (selectedIntervals.length > 0) {
      updateAllLastPerformed(val, lastServiceDate);
    }
  };

  const handleLastServiceDateChange = (date: string) => {
    setLastServiceDate(date);
    if (selectedIntervals.length > 0) {
      updateAllLastPerformed(lastServiceMileage, date);
    }
  };

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
      setLastServiceMileage(0);
      setLastServiceDate(new Date().toISOString().split('T')[0]);
      setVin('');
      setVinResult(null);
      setSelectedEngine(null);
      setSelectedIntervals([]);
      setOverriddenIntervalIds(new Set());
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
        // Mark all loaded intervals as overridden since they have their own values
        setOverriddenIntervalIds(new Set(intervals.map(i => i.id)));

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
      // Default last performed values to common last service values
      const defaultedIntervals = intervals.map(i => ({
        ...i,
        lastPerformedMileage: lastServiceMileage,
        lastPerformedDate: lastServiceDate,
      }));
      setOverriddenIntervalIds(new Set());
      setGenerating(false);
      setSelectedIntervals(defaultedIntervals);
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
    // Default last performed values to common last service values
    const defaultedIntervals = intervals.map(i => ({
      ...i,
      lastPerformedMileage: lastServiceMileage,
      lastPerformedDate: lastServiceDate,
    }));
    setOverriddenIntervalIds(new Set());
    setGenerating(false);
    setSelectedIntervals(defaultedIntervals);
  };

  /** Calculate the status of a service interval based on current form values */
  const calculateIntervalStatus = (interval: ServiceInterval): { status: 'overdue' | 'due_soon' | 'ok'; remainingKm: number | null; remainingDays: number | null } => {
    let status: 'overdue' | 'due_soon' | 'ok' = 'ok';
    let remainingKm: number | null = null;
    let remainingDays: number | null = null;

    // Status priority: 'overdue' > 'due_soon' > 'ok'
    const worstStatus = (a: 'overdue' | 'due_soon' | 'ok', b: 'overdue' | 'due_soon' | 'ok'): 'overdue' | 'due_soon' | 'ok' => {
      const order = { overdue: 0, due_soon: 1, ok: 2 };
      return order[a] <= order[b] ? a : b;
    };

    // Check by mileage
    if (interval.intervalMileage && currentMileage > 0) {
      const lastMileage = interval.lastPerformedMileage ?? 0;
      const nextKm = lastMileage + interval.intervalMileage;
      remainingKm = nextKm - currentMileage;

      if (remainingKm <= 0) {
        status = worstStatus(status, 'overdue');
      } else if (remainingKm <= 1000) {
        status = worstStatus(status, 'due_soon');
      }
    }

    // Check by date
    if (interval.intervalMonths) {
      const lastDateStr = interval.lastPerformedDate || purchaseDate;
      if (lastDateStr) {
        try {
          const lastDate = parseISO(lastDateStr);
          const nextDate = addMonths(lastDate, interval.intervalMonths);
          remainingDays = differenceInDays(nextDate, new Date());

          if (remainingDays <= 0) {
            status = worstStatus(status, 'overdue');
          } else if (remainingDays <= 30) {
            status = worstStatus(status, 'due_soon');
          }
        } catch {
          // Invalid date, skip
        }
      }
    }

    return { status, remainingKm, remainingDays };
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

  const handleIntervalLastPerformedChange = (id: string, field: 'lastPerformedMileage' | 'lastPerformedDate', value: number | string | null) => {
    setOverriddenIntervalIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
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
    if (year > new Date().getFullYear()) {
      setToastMsg(t('addVehicle.yearInvalid'));
      setShowToast(true);
      return;
    }

    const activeIntervals = selectedIntervals.filter(i => i.name.trim());

    // Show rewarded ad before saving a new car if user already has vehicles
    if (!isEditing && vehicles.length > 0) {
      try {
        await rewardVideo();
      } catch {
        // If ad fails or user skips, still allow saving
      }
    }

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
              max={new Date().getFullYear()}
              onIonChange={e => {
                const val = parseInt(e.detail.value || '0') || new Date().getFullYear();
                setYear(Math.min(val, new Date().getFullYear()));
              }}
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
          {/* Common last service fields — shared across all intervals */}
          <IonItem>
            <IonLabel position="stacked">{t('addVehicle.lastPerformedMileage')}</IonLabel>
            <IonInput
              type="number"
              value={lastServiceMileage}
              placeholder={t('addVehicle.lastPerformedMileagePlaceholder', { km: currentMileage })}
              onIonChange={e => handleLastServiceMileageChange(parseInt(e.detail.value || '0') || 0)}
              onIonInput={e => handleLastServiceMileageChange(parseInt(e.detail.value || '0') || 0)}
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">{t('addVehicle.lastPerformedDate')}</IonLabel>
            <IonInput
              type="date"
              value={lastServiceDate}
              onIonChange={e => handleLastServiceDateChange(e.detail.value || new Date().toISOString().split('T')[0])}
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
            {selectedIntervals.map(interval => {
              const intervalStatus = calculateIntervalStatus(interval);
              return (
              <IonItem key={interval.id}>
                <IonCheckbox
                  slot="start"
                  checked={!!interval.name.trim()}
                  onIonChange={() => toggleInterval(interval)}
                />
                <IonLabel>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
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
                      <h3 style={{ margin: 0 }}>{getServiceDisplayName(interval.serviceType, interval.name)}</h3>
                    )}
                    {/* Status badge */}
                    {!!interval.name.trim() && (
                      <IonChip
                        color={intervalStatus.status === 'overdue' ? 'danger' : intervalStatus.status === 'due_soon' ? 'warning' : 'success'}
                        style={{ height: '20px', fontSize: '10px', margin: 0, padding: '0 6px' }}
                      >
                        <IonIcon
                          icon={intervalStatus.status === 'overdue' ? alertCircle : intervalStatus.status === 'due_soon' ? time : checkmark}
                          style={{ marginRight: '2px', fontSize: '12px' }}
                        />
                        <IonLabel style={{ fontSize: '10px', lineHeight: '20px' }}>
                          {intervalStatus.status === 'overdue' ? t('addVehicle.overdueLabel') : intervalStatus.status === 'due_soon' ? t('addVehicle.dueSoonLabel') : t('addVehicle.okLabel')}
                        </IonLabel>
                      </IonChip>
                    )}
                  </div>
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
                  {/* Per-service last performed fields */}
                  <div style={{ display: 'flex', gap: '8px', fontSize: '12px', marginTop: '4px', padding: '4px 0' }}>
                    <span>
                      <IonInput
                        type="number"
                        value={interval.lastPerformedMileage ?? ''}
                        placeholder={t('addVehicle.lastMileagePlaceholder')}
                        style={{ display: 'inline-block', width: '80px', '--padding-start': '4px', '--padding-end': '4px', fontSize: '12px', border: '1px solid var(--ion-color-light-shade)', borderRadius: '4px' } as any}
                        onIonChange={e => handleIntervalLastPerformedChange(interval.id, 'lastPerformedMileage', e.detail.value ? parseInt(e.detail.value) : null)}
                      /> km
                    </span>
                    <span>
                      <IonInput
                        type="date"
                        value={interval.lastPerformedDate ?? ''}
                        style={{ display: 'inline-block', width: '130px', '--padding-start': '4px', '--padding-end': '4px', fontSize: '12px', border: '1px solid var(--ion-color-light-shade)', borderRadius: '4px' } as any}
                        onIonChange={e => handleIntervalLastPerformedChange(interval.id, 'lastPerformedDate', e.detail.value || '')}
                      />
                    </span>
                    {overriddenIntervalIds.has(interval.id) && (
                      <span style={{ color: 'var(--ion-color-primary)', fontSize: '10px', alignSelf: 'center' }}>{t('addVehicle.customLabel')}</span>
                    )}
                  </div>
                  {intervalStatus.status !== 'ok' && (
                    <p style={{ fontSize: '11px', color: intervalStatus.status === 'overdue' ? '#B22222' : '#C4841D', margin: '2px 0 0' }}>
                      {(() => {
                        const parts: string[] = [];
                        // Show km info only if it contributes to the status
                        if (intervalStatus.remainingKm != null) {
                          if (intervalStatus.remainingKm <= 0) {
                            parts.push(t('vehicleDetail.kmOverdue', { km: Math.abs(intervalStatus.remainingKm).toLocaleString() }));
                          } else if (intervalStatus.remainingKm <= 1000) {
                            parts.push(t('vehicleDetail.kmRemaining', { km: intervalStatus.remainingKm.toLocaleString() }));
                          }
                        }
                        // Show days info only if it contributes to the status
                        if (intervalStatus.remainingDays != null) {
                          if (intervalStatus.remainingDays <= 0) {
                            parts.push(t('vehicleDetail.daysOverdue', { days: Math.abs(intervalStatus.remainingDays) }));
                          } else if (intervalStatus.remainingDays <= 30) {
                            parts.push(t('vehicleDetail.daysRemaining', { days: intervalStatus.remainingDays }));
                          }
                        }
                        return parts.join(' • ');
                      })()}
                    </p>
                  )}
                </IonLabel>
              </IonItem>
              );
            })}
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
              {!isEditing && vehicles.length > 0 && <img src="/ads.png" alt="ad" style={{ position: 'absolute', height: '33px', objectFit: 'contain', right: '20%' }} />}
            </IonButton>
          </div>
        </IonFooter>
    </IonPage>
  );
};

export default AddVehicle;