import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ArrowRight,
  Clock,
  Info,
  Send,
  WifiOff,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Keyboard,
  Easing,
  useWindowDimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MachineOverview } from '@/components/maintenance/machine-overview';
import {
  MaintenanceFeedbackDialog,
  type MaintenanceFeedback,
} from '@/components/maintenance/maintenance-feedback-dialog';
import { MaintenanceField } from '@/components/maintenance/maintenance-field';
import { AppHeader } from '@/components/shared/app-header';
import { KeyboardScrollView } from '@/components/shared/keyboard-scroll-view';
import { Skeleton } from '@/components/shared/skeleton';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useAuth } from '@/providers/auth-provider';
import {
  fetchActiveChecklistByCategory,
  getMaintenanceDraft,
  saveMaintenanceDraft,
  submitMaintenanceRecord,
} from '@/services/checklists';
import { fetchMachineById } from '@/services/machines';
import type {
  Checklist,
  FinalMachineStatus,
  ItemAnswer,
  ItemResult,
  MaintenanceDraft,
  MaintenanceType,
} from '@/types/checklist';
import type { Machine } from '@/types/machine';

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatElapsedTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function MaintenanceScreen() {
  const { machineId } = useLocalSearchParams<{ machineId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const { isOnline } = useNetworkStatus();
  const { session } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [machine, setMachine] = useState<Machine | null>(null);
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activeStep, setActiveStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionLock = useRef(false);
  const reducedMotion = useRef(true);
  const pendingEntry = useRef(false);
  const [stepOffset] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) reducedMotion.current = enabled;
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      reducedMotion.current = enabled;
    });
    return () => {
      mounted = false;
      subscription.remove();
      stepOffset.stopAnimation();
    };
  }, [stepOffset]);

  const changeStep = (nextStep: number) => {
    if (transitionLock.current || isSubmitting) return;
    Keyboard.dismiss();
    setShowValidation(false);
    if (reducedMotion.current) {
      setActiveStep(nextStep);
      return;
    }
    transitionLock.current = true;
    setIsTransitioning(true);
    const direction = nextStep > activeStep ? 1 : -1;
    Animated.timing(stepOffset, {
      toValue: -viewportWidth * direction,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (!finished) return;
      pendingEntry.current = true;
      stepOffset.setValue(viewportWidth * direction);
      setActiveStep(nextStep);
    });
  };
  const handleStepLayout = () => {
    if (!pendingEntry.current) return;
    pendingEntry.current = false;
    Animated.timing(stepOffset, {
      toValue: 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished) {
        transitionLock.current = false;
        setIsTransitioning(false);
      }
    });
  };
  const [showValidation, setShowValidation] = useState(false);

  // Maintenance state
  const [maintenanceId, setMaintenanceId] = useState<string>(generateUuid);
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>('preventiva');
  const [startedAt, setStartedAt] = useState<string>(() => new Date().toISOString());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Checklist answers indexed by item_id
  const [answers, setAnswers] = useState<Record<string, ItemAnswer>>({});
  const [expandedInstructions, setExpandedInstructions] = useState<Record<string, boolean>>({});

  // Closure fields
  const [finalStatus, setFinalStatus] = useState<FinalMachineStatus>('operativa');
  const [requiresParts, setRequiresParts] = useState(false);
  const [partsDetail, setPartsDetail] = useState('');
  const [pendingTasks, setPendingTasks] = useState('');
  const [performedWork, setPerformedWork] = useState('');
  const [generalObservations, setGeneralObservations] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<MaintenanceFeedback | null>(null);
  const submitLockRef = useRef(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTimerStopped = feedback?.kind === 'sent';

  // Timer
  useEffect(() => {
    if (isTimerStopped) return;
    const startMs = new Date(startedAt).getTime();
    const interval = setInterval(() => {
      const nowMs = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((nowMs - startMs) / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, isTimerStopped]);

  // Initial load
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (!machineId) {
        setErrorMessage('No se proporcionó el identificador del equipo.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const foundMachine = await fetchMachineById(machineId);
        if (!mounted) return;

        if (!foundMachine) {
          setErrorMessage('El equipo no fue encontrado en el inventario.');
          setIsLoading(false);
          return;
        }

        setMachine(foundMachine);

        // Fetch checklist for category
        const foundChecklist = await fetchActiveChecklistByCategory(foundMachine.categoria_id);
        if (!mounted) return;

        if (!foundChecklist || foundChecklist.secciones.length === 0) {
          setErrorMessage(
            `No hay una pauta de mantenimiento activa cargada para la categoría "${foundMachine.categoria.nombre}".`,
          );
          setIsLoading(false);
          return;
        }

        setChecklist(foundChecklist);

        // Check if there's an existing draft to resume
        const draft = await getMaintenanceDraft(machineId);
        if (draft && mounted) {
          setMaintenanceId(draft.mantencion_id);
          setMaintenanceType(draft.tipo);
          setStartedAt(draft.iniciada_at);
          setAnswers(draft.respuestas || {});
          setFinalStatus(draft.estado_equipo_final);
          setRequiresParts(draft.requiere_repuestos);
          setPartsDetail(draft.detalle_repuestos || '');
          setPendingTasks(draft.pendientes || '');
          setPerformedWork(draft.trabajos_realizados || '');
          setGeneralObservations(draft.observaciones || '');
        }
      } catch (err) {
        if (mounted) {
          setErrorMessage(
            err instanceof Error ? err.message : 'Error al cargar la pauta de mantenimiento.',
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      mounted = false;
    };
  }, [machineId]);

  // Auto-save draft on change
  const scheduleAutoSave = useCallback((draft: MaintenanceDraft) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      void saveMaintenanceDraft(draft);
    }, 1000);
  }, []);

  const currentDraft = useMemo<MaintenanceDraft | null>(() => {
    if (!machine || !checklist) return null;
    return {
      mantencion_id: maintenanceId,
      maquina_id: machine.id,
      pauta_id: checklist.id,
      local_id: machine.local_id,
      tipo: maintenanceType,
      iniciada_at: startedAt,
      respuestas: answers,
      trabajos_realizados: performedWork,
      estado_equipo_final: finalStatus,
      requiere_repuestos: requiresParts,
      detalle_repuestos: partsDetail,
      pendientes: pendingTasks,
      observaciones: generalObservations,
    };
  }, [
    machine,
    checklist,
    maintenanceId,
    maintenanceType,
    startedAt,
    answers,
    performedWork,
    finalStatus,
    requiresParts,
    partsDetail,
    pendingTasks,
    generalObservations,
  ]);

  useEffect(() => {
    if (currentDraft && hasUnsavedChanges) {
      scheduleAutoSave(currentDraft);
    }
  }, [currentDraft, hasUnsavedChanges, scheduleAutoSave]);

  const handleSetAnswer = (itemId: string, result: ItemResult, defaultObs?: string) => {
    setHasUnsavedChanges(true);
    setAnswers((prev) => {
      const current = prev[itemId];
      return {
        ...prev,
        [itemId]: {
          item_id: itemId,
          resultado: result,
          observaciones: current?.observaciones ?? defaultObs ?? '',
        },
      };
    });
  };

  const handleSetObservation = (itemId: string, text: string) => {
    setHasUnsavedChanges(true);
    setAnswers((prev) => {
      const current = prev[itemId];
      return {
        ...prev,
        [itemId]: {
          item_id: itemId,
          resultado: current?.resultado ?? null,
          observaciones: text,
        },
      };
    });
  };

  const handleToggleInstructions = (itemId: string) => {
    setExpandedInstructions((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  // Progress calculations
  const totalItemsCount = useMemo(() => {
    if (!checklist) return 0;
    return checklist.secciones.reduce((acc, s) => acc + s.items.length, 0);
  }, [checklist]);

  const answeredItemsCount = useMemo(() => {
    return (
      checklist?.secciones.reduce(
        (count, section) =>
          count + section.items.filter((item) => answers[item.id]?.resultado != null).length,
        0,
      ) ?? 0
    );
  }, [answers, checklist]);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!checklist) return errors;

    for (const section of checklist.secciones) {
      for (const item of section.items) {
        const ans = answers[item.id];
        if (item.obligatorio && (!ans || ans.resultado === null)) {
          errors.push(`Falta responder: "${item.descripcion}"`);
        } else if (ans && (ans.resultado === 'no_conforme' || ans.resultado === 'no_aplica')) {
          if (!ans.observaciones.trim()) {
            errors.push(
              `Falta justificar (${ans.resultado === 'no_conforme' ? 'No conforme' : 'No aplica'}): "${item.descripcion}"`,
            );
          }
        }
      }
    }

    if (!performedWork.trim()) {
      errors.push('Debes detallar los trabajos realizados en la máquina.');
    }

    if (requiresParts && !partsDetail.trim()) {
      errors.push('Indicaste que requiere repuestos; especifica qué piezas faltan.');
    }

    if ((requiresParts || finalStatus === 'fuera_de_servicio') && !pendingTasks.trim()) {
      errors.push('Especifica las tareas pendientes de seguimiento.');
    }

    return errors;
  }, [checklist, answers, performedWork, requiresParts, partsDetail, finalStatus, pendingTasks]);

  const handleFeedbackConfirm = () => {
    if (feedback && feedback.kind !== 'error') {
      router.replace('/(app)');
      return;
    }
    setFeedback(null);
  };

  const handleSubmit = async () => {
    if (submitLockRef.current) return;
    if (validationErrors.length > 0) {
      setShowValidation(true);
      setFeedback({
        kind: 'error',
        title: 'Faltan datos obligatorios',
        message:
          validationErrors.slice(0, 3).join('\n') +
          (validationErrors.length > 3
            ? `\n... y ${validationErrors.length - 3} detalles más.`
            : ''),
      });
      return;
    }
    if (!currentDraft) return;
    const tecnicoId = session?.user?.id;
    if (!tecnicoId) {
      setFeedback({
        kind: 'error',
        title: 'Sesión no válida',
        message: 'Inicia sesión nuevamente para enviar la mantención.',
      });
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
    try {
      await saveMaintenanceDraft(currentDraft);
      const result = await submitMaintenanceRecord(currentDraft, tecnicoId, isOnline);
      if (result.exito) {
        setHasUnsavedChanges(false);
        setFeedback({
          kind: result.guardado_offline ? 'queued' : 'sent',
          title: result.guardado_offline
            ? 'Guardada en el dispositivo'
            : 'Mantención enviada con éxito',
          message: result.guardado_offline
            ? `El envío al servidor está pendiente. ${result.mensaje}`
            : result.mensaje,
        });
      } else {
        submitLockRef.current = false;
        setFeedback({
          kind: 'error',
          title: 'No se pudo enviar la mantención',
          message: result.mensaje,
        });
      }
    } catch (error) {
      submitLockRef.current = false;
      setFeedback({
        kind: 'error',
        title: 'No se pudo completar el envío',
        message:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error inesperado. Intenta nuevamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50">
        <AppHeader
          title="Mantención"
          subtitle="Cargando equipo y pauta"
          showConnectivity={false}
          leadingElement={
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Volver a la pantalla anterior"
              className="min-h-12 min-w-12 items-center justify-center rounded-xl bg-white/10 active:bg-white/20"
            >
              <ArrowLeft size={20} color="#ffffff" />
            </Pressable>
          }
        />
        <KeyboardScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: Math.max(insets.bottom, 24) }}
        >
          <View className="w-full max-w-xl self-center gap-5">
            <View className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
              <Skeleton label="Cargando tipo de intervención">
                <View className="h-5 w-44 rounded bg-slate-200" />
                <View className="mb-4 mt-2 h-4 w-4/5 rounded bg-slate-200" />
                <View className="flex-row gap-2">
                  {[0, 1, 2].map((index) => (
                    <View key={index} className="h-12 flex-1 rounded-xl bg-slate-200" />
                  ))}
                </View>
              </Skeleton>
            </View>
            <View className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <MachineOverview isLoading />
            </View>
          </View>
        </KeyboardScrollView>
      </View>
    );
  }

  if (errorMessage || !machine || !checklist) {
    return (
      <View className="flex-1 justify-center bg-[#f8fafc] px-6">
        <View className="items-center rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <AlertCircle size={36} color="#dc2626" />
          <Text className="mt-3 text-center text-base font-bold text-slate-900">
            No se pudo iniciar la mantención
          </Text>
          <Text className="mt-1 text-center text-xs leading-relaxed text-slate-600">
            {errorMessage ?? 'Ocurrió un error inesperado al cargar los datos.'}
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-5 min-h-[44px] flex-row items-center justify-center rounded-xl bg-slate-900 px-6 py-2.5 active:bg-slate-800"
            style={{ cursor: 'pointer' }}
          >
            <Text className="text-xs font-semibold text-white">Volver</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const totalSteps = checklist.secciones.length + 2;
  const isLastStep = activeStep === totalSteps - 1;
  const activeSection = checklist.secciones[activeStep - 1];
  const stepTitle =
    activeStep === 0
      ? 'Equipo e intervención'
      : isLastStep
        ? 'Cierre de la intervención'
        : activeSection.nombre;
  const progress = Math.round(((activeStep + 1) / totalSteps) * 100);
  const sectionErrors =
    activeSection && !isLastStep
      ? activeSection.items.filter((item) => {
          const answer = answers[item.id];
          return (
            (item.obligatorio && !answer?.resultado) ||
            (answer?.resultado != null &&
              answer.resultado !== 'conforme' &&
              !answer.observaciones.trim())
          );
        })
      : [];
  const handleNext = () => {
    if (sectionErrors.length > 0) {
      setShowValidation(true);
      return;
    }
    changeStep(activeStep + 1);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-slate-50"
    >
      <AppHeader
        title="Mantención"
        subtitle={stepTitle}
        leadingElement={
          <Pressable
            onPress={() => router.back()}
            disabled={isSubmitting || isTransitioning}
            accessibilityRole="button"
            accessibilityLabel="Volver a la pantalla anterior"
            accessibilityState={{ disabled: isSubmitting || isTransitioning }}
            className="min-h-12 min-w-12 items-center justify-center rounded-xl bg-white/10 active:bg-white/20"
          >
            <ArrowLeft size={20} color="#ffffff" />
          </Pressable>
        }
        rightElement={
          <View className="flex-row items-center gap-2">
            <View
              className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`}
            />
            <Text className="text-xs font-medium text-slate-200">
              {isOnline ? 'En línea' : 'Modo local'}
            </Text>
          </View>
        }
      >
        <View className="w-full max-w-xl self-center border-t border-white/10 pt-4">
          <View className="flex-row flex-wrap items-center justify-between gap-2">
            <Text accessibilityLiveRegion="polite" className="text-xs font-semibold text-white">
              Paso {activeStep + 1} de {totalSteps}
            </Text>
            <View className="flex-row items-center gap-2">
              <Clock size={14} color="#cbd5e1" />
              <Text className="text-xs font-medium text-slate-200">
                {formatElapsedTime(elapsedSeconds)}
              </Text>
            </View>
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Progreso de pasos de la mantención"
            accessibilityValue={{ min: 1, max: totalSteps, now: activeStep + 1 }}
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15"
          >
            <View className="h-full rounded-full bg-blue-400" style={{ width: `${progress}%` }} />
          </View>
        </View>
      </AppHeader>

      <View className="flex-1 overflow-hidden bg-slate-50">
        <Animated.View
          pointerEvents={isTransitioning || isSubmitting ? 'none' : 'auto'}
          style={{ flex: 1, transform: [{ translateX: stepOffset }] }}
          className="bg-slate-50"
          renderToHardwareTextureAndroid={isTransitioning}
          shouldRasterizeIOS={isTransitioning}
        >
          <KeyboardScrollView
            resetScrollKey={activeStep}
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 }}
          >
            <View
              key={activeStep}
              onLayout={handleStepLayout}
              className="w-full max-w-xl self-center gap-5"
            >
              <View>
                {activeStep === 0 || isLastStep ? (
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-700">
                    {activeStep === 0 ? 'Antes de comenzar' : 'Último paso'}
                  </Text>
                ) : null}
                <View className="flex-row items-center gap-3">
                  {activeStep > 0 && !isLastStep ? (
                    <View className="h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                      <Text className="text-sm font-bold text-blue-700">{activeStep}</Text>
                    </View>
                  ) : null}
                  <Text
                    accessibilityRole="header"
                    className="flex-1 text-xl font-bold text-slate-900"
                  >
                    {stepTitle}
                  </Text>
                </View>
                {activeStep === 0 || isLastStep ? (
                  <Text className="mt-2 text-sm leading-6 text-slate-600">
                    {activeStep === 0
                      ? 'Confirma el equipo y selecciona el tipo de trabajo que vas a realizar.'
                      : 'Completa el registro antes de finalizar la mantención.'}
                  </Text>
                ) : null}
              </View>
              {activeStep === 0 ? (
                <>
                  <View className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
                    <Text accessibilityRole="header" className="text-base font-bold text-slate-900">
                      Tipo de intervención
                    </Text>
                    <Text className="mb-4 mt-1 text-sm leading-5 text-slate-600">
                      Selecciona el trabajo que vas a realizar.
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {(
                        [
                          { value: 'preventiva', label: 'Preventiva' },
                          { value: 'correctiva', label: 'Correctiva' },
                          { value: 'inspeccion', label: 'Inspección' },
                        ] as const
                      ).map((option) => (
                        <Pressable
                          key={option.value}
                          onPress={() => {
                            setHasUnsavedChanges(true);
                            setMaintenanceType(option.value);
                          }}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: maintenanceType === option.value }}
                          accessibilityLabel={`Intervención ${option.label}`}
                          className={`min-h-12 grow items-center justify-center rounded-xl border px-3 py-3 ${maintenanceType === option.value ? 'border-blue-600 bg-blue-600 active:bg-blue-700' : 'border-slate-200 bg-slate-50 active:bg-slate-100'}`}
                        >
                          <Text
                            className={`text-sm font-semibold ${maintenanceType === option.value ? 'text-white' : 'text-slate-600'}`}
                          >
                            {option.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <Text className="mt-3 text-xs leading-5 text-slate-600">
                      {maintenanceType === 'preventiva'
                        ? 'Preventiva: revisión y cuidados para prevenir fallas.'
                        : maintenanceType === 'correctiva'
                          ? 'Correctiva: reparación de una falla detectada.'
                          : 'Inspección: evaluación de la condición del equipo.'}
                    </Text>
                  </View>
                  <View className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <MachineOverview machine={machine} />
                  </View>

                  {!isOnline ? (
                    <View className="flex-row items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <WifiOff size={20} color="#92400e" />
                      <Text className="flex-1 text-sm leading-5 text-amber-900">
                        Sin conexión. Puedes continuar la revisión con los datos disponibles en este
                        dispositivo.
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : null}

              {checklist.secciones.map((section, sectionIndex) => {
                if (activeStep !== sectionIndex + 1) return null;
                const count = section.items.filter(
                  (item) => answers[item.id]?.resultado != null,
                ).length;
                return (
                  <View
                    key={section.id}
                    className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
                  >
                    <View className="min-h-16 flex-row items-center gap-3 p-4">
                      <View className="flex-1">
                        <Text className="text-xs text-slate-500">
                          {count} de {section.items.length} respondidos
                        </Text>
                      </View>
                    </View>
                    <View className="px-4">
                      {section.descripcion ? (
                        <Text className="pb-4 text-sm leading-5 text-slate-600">
                          {section.descripcion}
                        </Text>
                      ) : null}
                      {section.items.map((item, itemIndex) => {
                        const answer = answers[item.id];
                        const needsObservation =
                          answer?.resultado === 'no_conforme' || answer?.resultado === 'no_aplica';
                        const missingAnswer =
                          showValidation && item.obligatorio && !answer?.resultado;
                        return (
                          <View key={item.id} className="border-t border-slate-100 py-5">
                            <Text className="text-xs font-medium text-slate-500">
                              Punto {itemIndex + 1}
                              {item.obligatorio ? ' · Obligatorio *' : ' · Opcional'}
                            </Text>
                            <Text className="mt-2 text-sm font-semibold leading-6 text-slate-900">
                              {item.descripcion}
                            </Text>
                            {item.instrucciones ? (
                              <View>
                                <Pressable
                                  onPress={() => handleToggleInstructions(item.id)}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Ver guía: ${item.descripcion}`}
                                  accessibilityState={{
                                    expanded: Boolean(expandedInstructions[item.id]),
                                  }}
                                  className="min-h-12 flex-row items-center gap-2 self-start active:opacity-70"
                                >
                                  <Info size={16} color="#2563eb" />
                                  <Text className="text-xs font-semibold text-blue-700">
                                    {expandedInstructions[item.id]
                                      ? 'Ocultar guía'
                                      : 'Ver guía de revisión'}
                                  </Text>
                                </Pressable>
                                {expandedInstructions[item.id] ? (
                                  <Text className="mb-3 rounded-xl bg-blue-50 p-3 text-sm leading-6 text-blue-900">
                                    {item.instrucciones}
                                  </Text>
                                ) : null}
                              </View>
                            ) : null}
                            <View className="mt-3 flex-row flex-wrap gap-2">
                              {(
                                [
                                  { value: 'conforme', label: 'Conforme' },
                                  { value: 'no_conforme', label: 'No conforme' },
                                  ...(item.permite_no_aplica
                                    ? [{ value: 'no_aplica' as const, label: 'No aplica' }]
                                    : []),
                                ] as const
                              ).map((option) => {
                                const selected = answer?.resultado === option.value;
                                return (
                                  <Pressable
                                    key={option.value}
                                    onPress={() => handleSetAnswer(item.id, option.value)}
                                    accessibilityRole="radio"
                                    accessibilityLabel={`${item.descripcion}: ${option.label}`}
                                    accessibilityState={{ checked: selected }}
                                    className={`min-h-12 grow flex-row items-center justify-center gap-1 rounded-xl border px-3 py-3 ${selected ? 'border-blue-600 bg-blue-50 active:bg-blue-100' : 'border-slate-200 bg-white active:bg-slate-50'}`}
                                  >
                                    {selected ? <Check size={14} color="#1d4ed8" /> : null}
                                    <Text
                                      className={`text-xs font-semibold ${selected ? 'text-blue-700' : 'text-slate-600'}`}
                                    >
                                      {option.label}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                            {missingAnswer ? (
                              <Text
                                accessibilityLiveRegion="polite"
                                className="mt-2 text-xs text-red-700"
                              >
                                Selecciona un resultado para este punto.
                              </Text>
                            ) : null}
                            {needsObservation ? (
                              <View className="mt-4">
                                <Text className="mb-2 text-sm font-semibold text-slate-700">
                                  {answer?.resultado === 'no_aplica'
                                    ? 'Motivo por el que no aplica *'
                                    : 'Detalle de la observación *'}
                                </Text>
                                <TextInput
                                  accessibilityLabel={`Justificación: ${item.descripcion}`}
                                  value={answer?.observaciones ?? ''}
                                  onChangeText={(text) => handleSetObservation(item.id, text)}
                                  placeholder="Describe el motivo de tu respuesta"
                                  placeholderTextColor="#64748b"
                                  multiline
                                  textAlignVertical="top"
                                  className="min-h-24 rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm leading-6 text-slate-900"
                                />
                                {showValidation && !answer?.observaciones.trim() ? (
                                  <Text className="mt-2 text-xs text-red-700">
                                    Agrega una justificación para continuar.
                                  </Text>
                                ) : null}
                              </View>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}

              {isLastStep ? (
                <View className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <Text accessibilityRole="header" className="text-base font-bold text-slate-900">
                    Cierre de la intervención
                  </Text>
                  <Text className="mt-1 text-sm leading-5 text-slate-500">
                    Registra el trabajo realizado y la condición de entrega.
                  </Text>
                  <Text className="mb-3 mt-5 text-sm font-semibold text-slate-800">
                    Estado final del equipo
                  </Text>
                  <View className="gap-2">
                    {(
                      [
                        { value: 'operativa', label: 'Operativa', dot: 'bg-emerald-600' },
                        {
                          value: 'operativa_con_observaciones',
                          label: 'Operativa con observaciones',
                          dot: 'bg-amber-500',
                        },
                        {
                          value: 'fuera_de_servicio',
                          label: 'Fuera de servicio',
                          dot: 'bg-red-600',
                        },
                      ] as const
                    ).map((option) => (
                      <Pressable
                        key={option.value}
                        onPress={() => {
                          setHasUnsavedChanges(true);
                          setFinalStatus(option.value);
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: finalStatus === option.value }}
                        accessibilityLabel={option.label}
                        className={`min-h-12 flex-row items-center gap-3 rounded-xl border p-3 ${finalStatus === option.value ? 'border-blue-600 bg-blue-50 active:bg-blue-100' : 'border-slate-200 active:bg-slate-50'}`}
                      >
                        <View className={`h-2 w-2 rounded-full ${option.dot}`} />
                        <Text className="flex-1 text-sm font-medium text-slate-800">
                          {option.label}
                        </Text>
                        {finalStatus === option.value ? <Check size={18} color="#2563eb" /> : null}
                      </Pressable>
                    ))}
                  </View>
                  <Pressable
                    onPress={() => {
                      setHasUnsavedChanges(true);
                      setRequiresParts(!requiresParts);
                    }}
                    accessibilityRole="checkbox"
                    accessibilityLabel="Requiere repuestos"
                    accessibilityState={{ checked: requiresParts }}
                    className="mb-1 mt-5 min-h-12 flex-row items-center gap-3 border-t border-slate-100 py-4 active:opacity-70"
                  >
                    <View
                      className={`h-6 w-6 items-center justify-center rounded-md border ${requiresParts ? 'border-blue-600 bg-blue-600' : 'border-slate-400 bg-white'}`}
                    >
                      {requiresParts ? <Check size={16} color="#ffffff" /> : null}
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-slate-800">
                        Requiere repuestos
                      </Text>
                      <Text className="mt-1 text-xs leading-5 text-slate-500">
                        Deja el detalle para el seguimiento de esta mantención.
                      </Text>
                    </View>
                  </Pressable>
                  {requiresParts ? (
                    <MaintenanceField
                      label="Repuestos necesarios *"
                      value={partsDetail}
                      onChangeText={(text) => {
                        setHasUnsavedChanges(true);
                        setPartsDetail(text);
                      }}
                      placeholder="Indica las piezas que se necesitan"
                      error={
                        showValidation && !partsDetail.trim()
                          ? 'Especifica los repuestos necesarios.'
                          : undefined
                      }
                    />
                  ) : null}
                  {requiresParts || finalStatus === 'fuera_de_servicio' ? (
                    <MaintenanceField
                      label="Tareas pendientes *"
                      value={pendingTasks}
                      onChangeText={(text) => {
                        setHasUnsavedChanges(true);
                        setPendingTasks(text);
                      }}
                      placeholder="Indica qué falta y el siguiente paso"
                      error={
                        showValidation && !pendingTasks.trim()
                          ? 'Describe las tareas pendientes.'
                          : undefined
                      }
                    />
                  ) : null}
                  <MaintenanceField
                    label="Trabajos realizados *"
                    value={performedWork}
                    onChangeText={(text) => {
                      setHasUnsavedChanges(true);
                      setPerformedWork(text);
                    }}
                    placeholder="Describe los ajustes, reparaciones y pruebas realizadas"
                    error={
                      showValidation && !performedWork.trim()
                        ? 'Detalla el trabajo realizado.'
                        : undefined
                    }
                  />
                  <MaintenanceField
                    label="Observaciones adicionales"
                    value={generalObservations}
                    onChangeText={(text) => {
                      setHasUnsavedChanges(true);
                      setGeneralObservations(text);
                    }}
                    placeholder="Comentarios adicionales (opcional)"
                  />
                </View>
              ) : null}
              {showValidation &&
              (isLastStep ? validationErrors.length > 0 : sectionErrors.length > 0) ? (
                <View
                  accessibilityLiveRegion="polite"
                  className="rounded-2xl border border-red-200 bg-red-50 p-4"
                >
                  <Text className="text-sm font-bold text-red-800">
                    Completa los datos de este paso
                  </Text>
                  {(isLastStep
                    ? validationErrors
                    : [
                        'Responde los puntos obligatorios y justifica las respuestas “No conforme” y “No aplica”.',
                      ]
                  ).map((error) => (
                    <Text key={error} className="mt-2 text-sm leading-5 text-red-700">
                      • {error}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          </KeyboardScrollView>
        </Animated.View>
      </View>

      <View
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        className="border-t border-slate-200 bg-white px-5 pt-3"
      >
        <View className="w-full max-w-xl self-center">
          <Text className="mb-3 text-center text-xs text-slate-600">
            {isLastStep
              ? `${answeredItemsCount} de ${totalItemsCount} puntos respondidos · Revisa el cierre`
              : activeStep === 0
                ? 'El tiempo de intervención ya está en curso'
                : 'Tus respuestas se conservan al cambiar de paso'}
          </Text>
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => changeStep(activeStep - 1)}
              disabled={activeStep === 0 || isSubmitting || isTransitioning}
              accessibilityRole="button"
              accessibilityLabel="Volver al paso anterior"
              accessibilityState={{ disabled: activeStep === 0 || isSubmitting || isTransitioning }}
              className={`min-h-12 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 active:bg-slate-200 ${activeStep === 0 || isSubmitting || isTransitioning ? 'opacity-40' : ''}`}
            >
              <ArrowLeft size={22} color="#334155" />
            </Pressable>
            <Pressable
              onPress={isLastStep ? handleSubmit : handleNext}
              disabled={isSubmitting || isTransitioning}
              accessibilityRole="button"
              accessibilityLabel={isLastStep ? 'Finalizar mantención' : 'Siguiente paso'}
              accessibilityState={{ disabled: isSubmitting || isTransitioning, busy: isSubmitting }}
              className={`min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 active:bg-blue-700 ${isSubmitting || isTransitioning ? 'opacity-60' : ''}`}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : isLastStep ? (
                <Send size={18} color="#ffffff" />
              ) : (
                <ArrowRight size={18} color="#ffffff" />
              )}
              {isLastStep && !isSubmitting ? (
                <Text className="text-sm font-bold text-white">Finalizar</Text>
              ) : null}
            </Pressable>
          </View>
        </View>
      </View>
      <MaintenanceFeedbackDialog feedback={feedback} onConfirm={handleFeedbackConfirm} />
    </KeyboardAvoidingView>
  );
}
