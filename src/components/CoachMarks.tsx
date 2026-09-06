import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonText,
} from '@ionic/react';
import { setItem } from '../services/preferencesService';

interface TourStep {
  target: string;
  titleKey: string;
  descKey: string;
  route: string;
  position: 'top' | 'bottom';
  autoAdvance?: boolean;
  // When set on a step whose target is a launcher button (e.g. add-document-btn,
  // log-fuel-btn), the tour auto-advances to the next step the moment a modal
  // opens that does NOT contain this step's target. This moves the spotlight +
  // tooltip onto the first field inside the freshly-opened modal.
  advanceOnModalOpen?: boolean;
  // When set on a step whose target lives inside a form modal (doc-cost,
  // save-fuel-btn), the tour auto-advances to the next step when that modal
  // closes — i.e. right after the user taps Save. A failed validation keeps
  // the modal open, so no dismiss event fires and no advance happens.
  advanceOnModalClose?: boolean;
  // When set on the final step (expenses-tab), clicking the target completes
  // the tour: the overlay is dismissed and the user can use the app normally.
  completeOnClick?: boolean;
  // When set, the tooltip shows only Skip (no Next/Finish button). Used on
  // tappable-action steps — selectors, cards, and Add/Save/Back buttons —
  // where tapping the highlighted element itself is the action that advances
  // the tour. Fillable input steps keep Next so users can skip a field.
  hideNext?: boolean;
  isValid?: (value: string) => boolean;
}

const STEPS: TourStep[] = [
  { target: '[data-tour="add-vehicle-btn"]', titleKey: 'tour.step1Title', descKey: 'tour.step1Desc', route: '/dashboard', position: 'top', hideNext: true },
  { target: '[data-tour="vehicle-name"]', titleKey: 'tour.step2Title', descKey: 'tour.step2Desc', route: '/add-vehicle', position: 'bottom', autoAdvance: true, isValid: (v) => v.trim().length > 0 },
  { target: '[data-tour="make-selector"]', titleKey: 'tour.step3Title', descKey: 'tour.step3Desc', route: '/add-vehicle', position: 'bottom', autoAdvance: true, hideNext: true },
  { target: '[data-tour="model-selector"]', titleKey: 'tour.step4Title', descKey: 'tour.step4Desc', route: '/add-vehicle', position: 'bottom', autoAdvance: true, hideNext: true },
  { target: '[data-tour="engine-selector"]', titleKey: 'tour.step5Title', descKey: 'tour.step5Desc', route: '/add-vehicle', position: 'bottom', autoAdvance: true, hideNext: true },
  { target: '[data-tour="year-input"]', titleKey: 'tour.step6Title', descKey: 'tour.step6Desc', route: '/add-vehicle', position: 'bottom', autoAdvance: true, isValid: (v) => Number(v) > 0 },
  { target: '[data-tour="mileage-input"]', titleKey: 'tour.step7Title', descKey: 'tour.step7Desc', route: '/add-vehicle', position: 'bottom', autoAdvance: true, isValid: (v) => Number(v) >= 0 },
  { target: '[data-tour="purchase-date"]', titleKey: 'tour.step8Title', descKey: 'tour.step8Desc', route: '/add-vehicle', position: 'bottom', autoAdvance: true, isValid: (v) => v.length > 0 },
  { target: '[data-tour="last-service-km"]', titleKey: 'tour.step9Title', descKey: 'tour.step9Desc', route: '/add-vehicle', position: 'bottom', autoAdvance: true, isValid: (v) => Number(v) >= 0 },
  { target: '[data-tour="last-service-date"]', titleKey: 'tour.step10Title', descKey: 'tour.step10Desc', route: '/add-vehicle', position: 'bottom', autoAdvance: true, isValid: (v) => v.length > 0 },
  { target: '[data-tour="vehicle-card"]', titleKey: 'tour.step11Title', descKey: 'tour.step11Desc', route: '/dashboard', position: 'bottom', hideNext: true },
  { target: '[data-tour="documents-card"]', titleKey: 'tour.step12Title', descKey: 'tour.step12Desc', route: '/vehicle-detail', position: 'bottom', hideNext: true },
  { target: '[data-tour="add-document-btn"]', titleKey: 'tour.step13Title', descKey: 'tour.step13Desc', route: '/documents', position: 'top', advanceOnModalOpen: true, hideNext: true },
  { target: '[data-tour="doc-cost"]', titleKey: 'tour.step14Title', descKey: 'tour.step14Desc', route: '/documents', position: 'bottom', advanceOnModalClose: true },
  { target: '[data-tour="doc-back-btn"]', titleKey: 'tour.step15Title', descKey: 'tour.step15Desc', route: '/documents', position: 'bottom', hideNext: true },
  { target: '[data-tour="fuel-card"]', titleKey: 'tour.step16Title', descKey: 'tour.step16Desc', route: '/vehicle-detail', position: 'bottom', hideNext: true },
  { target: '[data-tour="log-fuel-btn"]', titleKey: 'tour.step17Title', descKey: 'tour.step17Desc', route: '/fuel', position: 'top', advanceOnModalOpen: true, hideNext: true },
  { target: '[data-tour="fuel-odometer"]', titleKey: 'tour.step18Title', descKey: 'tour.step18Desc', route: '/fuel', position: 'bottom' },
  { target: '[data-tour="fuel-liters"]', titleKey: 'tour.step19Title', descKey: 'tour.step19Desc', route: '/fuel', position: 'bottom' },
  { target: '[data-tour="fuel-cost"]', titleKey: 'tour.step20Title', descKey: 'tour.step20Desc', route: '/fuel', position: 'bottom' },
  { target: '[data-tour="save-fuel-btn"]', titleKey: 'tour.step21Title', descKey: 'tour.step21Desc', route: '/fuel', position: 'top', advanceOnModalClose: true, hideNext: true },
  { target: '[data-tour="fuel-back-btn"]', titleKey: 'tour.step22Title', descKey: 'tour.step22Desc', route: '/fuel', position: 'bottom', hideNext: true },
  { target: '[data-tour="expenses-tab"]', titleKey: 'tour.step23Title', descKey: 'tour.step23Desc', route: '/vehicle-detail', position: 'bottom', completeOnClick: true, hideNext: true },
];

// Route matcher shared by the route-advance effect and the per-step overlay
// visibility gate: a step's overlay only renders on the page its `route`
// describes (e.g. the vehicle-card tooltip never floats over Statistics).
const matchesRoute = (stepRoute: string, pathname: string): boolean => {
  switch (stepRoute) {
    case '/vehicle-detail':
      return pathname.startsWith('/vehicle/') && !pathname.includes('/fuel') && !pathname.includes('/documents');
    case '/documents':
      return pathname.includes('/documents');
    case '/fuel':
      return pathname.includes('/fuel');
    case '/add-vehicle':
      return pathname === '/add-vehicle' || pathname.startsWith('/add-vehicle/');
    default:
      return pathname === stepRoute;
  }
};

interface CoachMarksProps {
  isActive: boolean;
  onComplete: () => void;
}

// Extract the displayed / entered value from a tour target element so the
// auto-advance effect can decide whether the user has "filled" the field.
// Works for ion-input (text/number/date) and for selector IonItems whose
// selected value is shown in an <h3> tag.
function getFieldValue(el: Element): string {
  // ion-input / ion-input wrapper
  const ionInput = el.tagName === 'ION-INPUT' ? el : el.querySelector('ion-input');
  if (ionInput) {
    const v = (ionInput as HTMLIonInputElement).value;
    return v != null ? String(v) : '';
  }
  // Native input (fallback)
  if (el instanceof HTMLInputElement) return el.value || '';
  // Selector IonItem: the selected make/model/engine is shown in an <h3>
  const h3 = el.querySelector('h3');
  if (h3) return h3.textContent || '';
  return el.textContent || '';
}

const CoachMarks: React.FC<CoachMarksProps> = ({ isActive, onComplete }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [targetFound, setTargetFound] = useState(false);
  const [suppressOverlay, setSuppressOverlay] = useState(false);
  // Mirrors `targetFound` state so the polling interval (which closes over it)
  // always reads the CURRENT value instead of a stale one.
  const targetFoundRef = useRef(false);
  const pollRef = useRef<number | null>(null);
  const resizeRef = useRef<ResizeObserver | null>(null);
  // Tracks the pending auto-advance timeout so it can be cancelled on manual
  // Next click or step change (prevents double-advance).
  const pendingAdvanceRef = useRef<number | null>(null);
  // Track the last-seen pathname so same-page steps never auto-advance.
  const prevPathnameRef = useRef(location.pathname);
  const wasActiveRef = useRef(isActive);

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  // Route-scoped visibility: the overlay (spotlight + tooltip) renders only
  // while the current page matches the step's route. Navigating away mid-step
  // pauses the tour invisibly; returning to the page restores it.
  const routeOk = matchesRoute(step.route, location.pathname);

  const findTarget = useCallback(() => {
    const el = document.querySelector(step.target);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect(rect);
          setTargetFound(true);
          targetFoundRef.current = true;
        }
      }, 300);
      return true;
    }
    return false;
  }, [step.target]);

  useEffect(() => {
    // Inactive or navigated off the step's page: clear any stale target
    // measurement so the overlay can never render from old coordinates, and
    // pause polling (the stuck-skip must not fire while the step is merely
    // paused off-route).
    if (!isActive || !routeOk) {
      setTargetFound(false);
      targetFoundRef.current = false;
      setTargetRect(null);
      return;
    }
    setTargetFound(false);
    targetFoundRef.current = false;
    setTargetRect(null);
    if (findTarget()) return;
    let attempts = 0;
    // If the target never appears (e.g. an element that only renders after
    // some user action), polling gives up after ~60s (300 × 200ms) and skips
    // past this step so the walkthrough never gets stuck.
    const STUCK_THRESHOLD = 15;
    pollRef.current = window.setInterval(() => {
      attempts++;
      // Never "skip past" a step while a modal is presented: the target may
      // be inside a just-opened modal that is still mounting/animating.
      const anyModalPresented = document.querySelectorAll('ion-modal.show-modal').length > 0;
      if (findTarget() || attempts > 300) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        // Target never appeared — skip past this step (but not while a modal is open).
        if (attempts > STUCK_THRESHOLD && !targetFoundRef.current && !isLastStep && !anyModalPresented) {
          setCurrentStep(prev => prev + 1);
        }
      }
    }, 200);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [currentStep, isActive, routeOk, findTarget, isLastStep]);

  useEffect(() => {
    if (!isActive || !targetFound) return;
    const handleResize = () => {
      const el = document.querySelector(step.target);
      if (el) setTargetRect(el.getBoundingClientRect());
    };
    resizeRef.current = new ResizeObserver(handleResize);
    resizeRef.current.observe(document.body);
    window.addEventListener('resize', handleResize);
    return () => {
      if (resizeRef.current) resizeRef.current.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [currentStep, isActive, targetFound, step.target]);

  // While a modal is presented that does NOT contain the current step's target
  // (e.g. the make/model/engine SearchSelectModal), the ENTIRE coach-mark
  // overlay (spotlight + dimming + tooltip) is hidden so the modal stays clean
  // and fully usable; the overlay reappears as soon as the user closes the
  // modal. Form modals whose fields ARE the tour targets (documents, fuel)
  // keep the spotlight + tooltip on the field.
  useEffect(() => {
    if (!isActive) return;
    const timers: number[] = [];
    const check = () => {
      const stepEl = document.querySelector(step.target);
      const presented = Array.from(document.querySelectorAll('ion-modal.show-modal'));
      const stepInsideModal = presented.some(m => !!stepEl && m.contains(stepEl));
      setSuppressOverlay(presented.length > 0 && !stepInsideModal);
    };
    // ionModalDidDismiss fires at the START of the dismiss animation, before
    // the show-modal class is removed. Re-check after the animation completes.
    const onDismiss = () => {
      const stepEl = document.querySelector(step.target);
      const presented = Array.from(document.querySelectorAll('ion-modal.show-modal'));
      const stepInsideModal = presented.some(m => !!stepEl && m.contains(stepEl));
      check();
      // Auto-advance when the modal containing this step's target closes
      // (doc-cost / save-fuel-btn): tapping Save dismisses the form and the
      // tour moves on. A failed validation keeps the modal open — no dismiss,
      // no advance.
      if (step.advanceOnModalClose && stepInsideModal) {
        scheduleAdvance();
      }
      timers.push(window.setTimeout(check, 400));
    };
    // When a modal opens that does NOT contain this step's launcher target AND
    // the step requests it (advanceOnModalOpen), auto-advance to the next step
    // so the spotlight + tooltip move onto the first field inside the modal
    // (Documents form, Fuel form). Uses the shared pending-advance ref so a
    // manual Next click / step change cancels it cleanly.
    const scheduleAdvance = () => {
      if (pendingAdvanceRef.current) {
        window.clearTimeout(pendingAdvanceRef.current);
      }
      pendingAdvanceRef.current = window.setTimeout(() => {
        pendingAdvanceRef.current = null;
        setCurrentStep(prev => prev + 1);
      }, 500);
    };
    const onPresent = () => {
      const stepEl = document.querySelector(step.target);
      const presented = Array.from(document.querySelectorAll('ion-modal.show-modal'));
      const stepInsideModal = presented.some(m => !!stepEl && m.contains(stepEl));
      setSuppressOverlay(presented.length > 0 && !stepInsideModal);
      if (step.advanceOnModalOpen && presented.length > 0 && !stepInsideModal) {
        scheduleAdvance();
      }
      timers.push(window.setTimeout(check, 400));
    };
    check();
    // Periodic poll acts as a fallback if an event is missed or the state sticks.
    const poll = window.setInterval(check, 500);
    document.addEventListener('ionModalDidPresent', onPresent);
    document.addEventListener('ionModalDidDismiss', onDismiss);
    return () => {
      document.removeEventListener('ionModalDidPresent', onPresent);
      document.removeEventListener('ionModalDidDismiss', onDismiss);
      window.clearInterval(poll);
      timers.forEach(t => clearTimeout(t));
    };
  }, [currentStep, isActive, step.target, step.advanceOnModalOpen, step.advanceOnModalClose]);

  // Complete the tour when the user clicks the final step's target (the
  // Expenses tab): the overlay is dismissed, the preference is persisted, and
  // the user can use the app normally. Inlined handleDismiss logic so the
  // effect does not depend on the handler defined further down.
  useEffect(() => {
    if (!isActive || !step.completeOnClick) return;
    const el = document.querySelector(step.target);
    if (!el) return;
    const onClick = () => {
      setItem('csr_walkthrough_shown', 'true');
      setCurrentStep(0);
      onComplete();
    };
    el.addEventListener('click', onClick);
    return () => {
      el.removeEventListener('click', onClick);
    };
  }, [currentStep, isActive, step.target, step.completeOnClick, onComplete]);

  // Auto-advance to the next step when the user fills the current field.
  // For text/number/date inputs we listen for ionChange; for modal selectors
  // (make/model/engine) we compare the displayed value before vs after the modal.
  useEffect(() => {
    if (!isActive || !step.autoAdvance) return;
    const el = document.querySelector(step.target);
    if (!el) return;

    let lastValue = getFieldValue(el);
    let advanced = false;

    const scheduleAdvance = () => {
      if (advanced) return;
      advanced = true;
      if (pendingAdvanceRef.current) {
        window.clearTimeout(pendingAdvanceRef.current);
      }
      pendingAdvanceRef.current = window.setTimeout(() => {
        pendingAdvanceRef.current = null;
        setCurrentStep(prev => prev + 1);
      }, 500);
    };

    const tryAdvance = () => {
      if (advanced) return;
      const currentValue = getFieldValue(el);
      if (currentValue === lastValue) return;
      lastValue = currentValue;
      const validator = step.isValid || (() => true);
      if (validator(currentValue)) {
        scheduleAdvance();
      }
    };

    const onChange = () => tryAdvance();
    const onModalDismiss = () => window.setTimeout(tryAdvance, 150);

    el.addEventListener('ionChange', onChange);
    // For ion-input the change event also fires on the element directly.
    el.addEventListener('change', onChange);
    document.addEventListener('ionModalDidDismiss', onModalDismiss);

    return () => {
      el.removeEventListener('ionChange', onChange);
      el.removeEventListener('change', onChange);
      document.removeEventListener('ionModalDidDismiss', onModalDismiss);
      // Cancel any pending auto-advance when the step changes.
      if (pendingAdvanceRef.current) {
        window.clearTimeout(pendingAdvanceRef.current);
        pendingAdvanceRef.current = null;
      }
    };
  }, [currentStep, isActive, step.target, step.isValid, step.autoAdvance]);

  // For modal selectors (make/model/engine), auto-advance when a value is
  // actually selected: store the displayed value when the modal opens and
  // compare when it closes. This replaces the generic ionChange listener which
  // does not fire on IonItems and would otherwise advance on any modal dismiss.
  useEffect(() => {
    if (!isActive || !step.autoAdvance || step.isValid) return;
    // Only selector steps reach here (they have autoAdvance but no isValid).
    const el = document.querySelector(step.target);
    if (!el) return;

    let valueAtModalOpen = '';
    let advanced = false;

    const onModalPresent = () => {
      valueAtModalOpen = getFieldValue(el);
    };

    const onModalDismiss = () => {
      if (advanced) return;
      window.setTimeout(() => {
        if (advanced) return;
        const currentValue = getFieldValue(el);
        if (currentValue && currentValue !== valueAtModalOpen) {
          advanced = true;
          if (pendingAdvanceRef.current) {
            window.clearTimeout(pendingAdvanceRef.current);
          }
          pendingAdvanceRef.current = window.setTimeout(() => {
            pendingAdvanceRef.current = null;
            setCurrentStep(prev => prev + 1);
          }, 500);
        }
      }, 150);
    };

    document.addEventListener('ionModalDidPresent', onModalPresent);
    document.addEventListener('ionModalDidDismiss', onModalDismiss);

    return () => {
      document.removeEventListener('ionModalDidPresent', onModalPresent);
      document.removeEventListener('ionModalDidDismiss', onModalDismiss);
      if (pendingAdvanceRef.current) {
        window.clearTimeout(pendingAdvanceRef.current);
        pendingAdvanceRef.current = null;
      }
    };
  }, [currentStep, isActive, step.target, step.isValid, step.autoAdvance]);

  useEffect(() => {
    if (!isActive) return;
    // Only auto-advance on an actual route change (not when the route merely
    // matches). Same-page steps (all input fields) advance via the Next button.
    const pathname = location.pathname;
    if (pathname === prevPathnameRef.current) return;
    prevPathnameRef.current = pathname;

    // Seed the baseline when the tour is (re)activated so it never advances
    // spuriously on mount / replay.
    const nextStep = STEPS[currentStep + 1];
    if (!nextStep) return;
    if (matchesRoute(nextStep.route, pathname)) {
      setCurrentStep(prev => prev + 1);
    }
  }, [location.pathname, isActive, currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset the baseline pathname whenever the tour transitions into the active
  // state (first launch or Settings replay), so a stale baseline doesn't cause
  // an immediate spurious advance.
  useEffect(() => {
    if (isActive && !wasActiveRef.current) {
      prevPathnameRef.current = location.pathname;
    }
    wasActiveRef.current = isActive;
  }, [isActive, location.pathname]);

  const handleDismiss = () => {
    setItem('csr_walkthrough_shown', 'true');
    setCurrentStep(0);
    onComplete();
  };

  const handleNext = () => {
    // Cancel any pending auto-advance so it doesn't fire after this manual
    // advance (which would skip a step).
    if (pendingAdvanceRef.current) {
      window.clearTimeout(pendingAdvanceRef.current);
      pendingAdvanceRef.current = null;
    }
    if (isLastStep) {
      handleDismiss();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  if (!isActive) return null;

  const hasTarget = !!(targetFound && targetRect);
  // While a non-target modal is open (e.g. the make/model/engine search modal)
  // the ENTIRE overlay is hidden — spotlight AND tooltip — until the user
  // closes the modal. Form modals whose fields are the targets keep everything
  // visible on the field. Off-route (paused) steps render nothing at all.
  const showSpotlight = hasTarget && routeOk && !suppressOverlay;
  const padding = 8;
  const spotlightTop = showSpotlight ? (targetRect as DOMRect).top - padding : 0;
  const spotlightLeft = showSpotlight ? (targetRect as DOMRect).left - padding : 0;
  const spotlightWidth = showSpotlight ? (targetRect as DOMRect).width + padding * 2 : 0;
  const spotlightHeight = showSpotlight ? (targetRect as DOMRect).height + padding * 2 : 0;
  const tooltipMaxWidth = 280;
  const tooltipMargin = 16;
  let tooltipLeft = hasTarget
    ? (targetRect as DOMRect).left + (targetRect as DOMRect).width / 2 - tooltipMaxWidth / 2
    : 16;
  tooltipLeft = Math.max(16, Math.min(tooltipLeft, window.innerWidth - tooltipMaxWidth - 16));
  const overlayColor = 'rgba(0, 0, 0, 0.72)';

  const tooltipStyle: React.CSSProperties = hasTarget
    ? {
        top: step.position === 'bottom' ? `${(targetRect as DOMRect).bottom + tooltipMargin}px` : undefined,
        bottom: step.position === 'top' ? `${window.innerHeight - (targetRect as DOMRect).top + tooltipMargin}px` : undefined,
        left: `${tooltipLeft}px`,
        width: `${tooltipMaxWidth}px`,
      }
    : {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: `${tooltipMaxWidth}px`,
      };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 100000, pointerEvents: 'none' }}>
      {showSpotlight && (
        <>
          {/* Top overlay */}
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: `${Math.max(0, spotlightTop)}px`, background: overlayColor, pointerEvents: 'all' }} onClick={e => e.stopPropagation()} />
          {/* Bottom overlay */}
          <div style={{ position: 'fixed', top: `${spotlightTop + spotlightHeight}px`, left: 0, width: '100%', height: `${Math.max(0, window.innerHeight - spotlightTop - spotlightHeight)}px`, background: overlayColor, pointerEvents: 'all' }} onClick={e => e.stopPropagation()} />
          {/* Left overlay */}
          <div style={{ position: 'fixed', top: `${spotlightTop}px`, left: 0, width: `${Math.max(0, spotlightLeft)}px`, height: `${spotlightHeight}px`, background: overlayColor, pointerEvents: 'all' }} onClick={e => e.stopPropagation()} />
          {/* Right overlay */}
          <div style={{ position: 'fixed', top: `${spotlightTop}px`, left: `${spotlightLeft + spotlightWidth}px`, width: `${Math.max(0, window.innerWidth - spotlightLeft - spotlightWidth)}px`, height: `${spotlightHeight}px`, background: overlayColor, pointerEvents: 'all' }} onClick={e => e.stopPropagation()} />
          {/* Spotlight border ring */}
          <div style={{ position: 'fixed', top: `${spotlightTop}px`, left: `${spotlightLeft}px`, width: `${spotlightWidth}px`, height: `${spotlightHeight}px`, borderRadius: '10px', border: '2px solid rgba(255, 255, 255, 0.6)', pointerEvents: 'none' }} />
        </>
      )}

      {/* Tooltip card — hidden while a non-target modal (e.g. the make/model/
          engine SearchSelectModal) is presented so the modal stays clean; it
          reappears as soon as the user closes the modal. Also hidden while the
          user is off the step's page (route-scoped visibility). */}
      {routeOk && !suppressOverlay && (
      <div style={{ position: 'fixed', ...tooltipStyle, pointerEvents: 'all' }}>
        <IonCard style={{ margin: 0, borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
          <IonCardHeader style={{ paddingBottom: '4px' }}>
            <IonCardTitle style={{ fontSize: '16px', fontWeight: 600 }}>{t(step.titleKey)}</IonCardTitle>
          </IonCardHeader>
          <IonCardContent style={{ paddingTop: '0' }}>
            <IonText color="medium">
              <p style={{ margin: '0 0 12px', fontSize: '14px', lineHeight: 1.5 }}>{t(step.descKey)}</p>
            </IonText>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '12px' }}>
              {STEPS.map((_, idx) => (
                <div key={idx} style={{ width: '7px', height: '7px', borderRadius: '50%', background: idx === currentStep ? 'var(--ion-color-primary)' : 'var(--ion-color-medium)', opacity: idx === currentStep ? 1 : 0.35, transition: 'all 0.2s ease' }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <IonButton fill="clear" size="small" onClick={handleDismiss} color="medium">
                {t('tour.skip')}
              </IonButton>
              {!step.hideNext && (
                <IonButton size="small" color="primary" onClick={handleNext}>
                  {isLastStep ? t('tour.finish') : t('tour.next')}
                </IonButton>
              )}
            </div>
          </IonCardContent>
        </IonCard>
      </div>
      )}
    </div>
  );
};

export default CoachMarks;