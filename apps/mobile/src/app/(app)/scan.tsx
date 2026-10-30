import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
  type CameraMountError,
  type CameraType,
} from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  ClipboardList,
  Flashlight,
  FlashlightOff,
  QrCode,
  RefreshCw,
  Settings,
  SwitchCamera,
  WifiOff,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MachineCard } from '@/components/machines/machine-card';
import { AppHeader } from '@/components/shared/app-header';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { resolveMachineByQrCode, syncAllActiveMachinesForOfflineCache } from '@/services/machines';
import type { Machine, QrMachineResolutionResult } from '@/types/machine';

const SCAN_FRAME_SIZE = 232;
const LASER_MAX_TRANSLATE = SCAN_FRAME_SIZE - 12;

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const { isOnline } = useNetworkStatus();

  const [facing, setFacing] = useState<CameraType>('back');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [isResolvingMachine, setIsResolvingMachine] = useState(false);
  const [qrResolution, setQrResolution] = useState<QrMachineResolutionResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const triedFallbackFacingRef = useRef(false);

  const laserTranslateY = useSharedValue(12);

  useEffect(() => {
    if (isOnline) {
      void syncAllActiveMachinesForOfflineCache();
    }
  }, [isOnline]);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(Boolean(enabled));
      })
      .catch(() => {});

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled: boolean) => {
        setReduceMotion(Boolean(enabled));
      },
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  // Desmontar la cámara al salir de la pestaña según recomendación oficial de expo-camera
  useFocusEffect(
    useCallback(() => {
      return () => {
        setIsCameraActive(false);
        setIsCameraReady(false);
        setIsTorchOn(false);
      };
    }, []),
  );

  const hasCameraPermission = Platform.OS === 'web' ? true : Boolean(permission?.granted);
  const canRenderCamera = isCameraActive && hasCameraPermission && !cameraError;
  const isActivelyScanning = canRenderCamera && !scannedData;

  useEffect(() => {
    if (isActivelyScanning && !reduceMotion) {
      laserTranslateY.value = 10;
      laserTranslateY.value = withRepeat(
        withSequence(
          withTiming(LASER_MAX_TRANSLATE, {
            duration: 1850,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(10, {
            duration: 1850,
            easing: Easing.inOut(Easing.quad),
          }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(laserTranslateY);
      laserTranslateY.value = SCAN_FRAME_SIZE / 2;
    }

    return () => {
      cancelAnimation(laserTranslateY);
    };
  }, [isActivelyScanning, reduceMotion, laserTranslateY]);

  const laserAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: laserTranslateY.value }],
  }));

  const handleToggleCamera = async () => {
    if (isCameraActive) {
      setIsCameraActive(false);
      setIsCameraReady(false);
      setIsTorchOn(false);
      return;
    }

    setCameraError(null);
    triedFallbackFacingRef.current = false;

    if (Platform.OS === 'web') {
      const isSecure =
        typeof window !== 'undefined' &&
        (window.isSecureContext ||
          window.location.hostname === 'localhost' ||
          window.location.hostname === '192.168.100.81');

      if (!isSecure) {
        setCameraError(
          'El navegador bloquea el acceso a la cámara en conexiones no seguras. Contacta a soporte técnico para buscar una solución.',
        );
        return;
      }

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          'Tu navegador no permite acceder a la cámara en este contexto. Verifica los permisos del sitio o utiliza HTTPS.',
        );
        return;
      }

      setScannedData(null);
      setQrResolution(null);
      setIsResolvingMachine(false);
      setIsCameraReady(false);
      setIsCameraActive(true);
      return;
    }

    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        return;
      }
    }

    setScannedData(null);
    setQrResolution(null);
    setIsResolvingMachine(false);
    setIsCameraReady(false);
    setIsCameraActive(true);
  };

  const handleCameraReady = () => {
    setIsCameraReady(true);
    setCameraError(null);
    if (Platform.OS === 'web') {
      // En PWA/iOS Safari asegura que el elemento <video> inicie reproducción tras asignar srcObject
      setTimeout(() => {
        void cameraRef.current?.resumePreview().catch(() => {});
      }, 50);
    }
  };

  const handleCameraMountError = (event: CameraMountError) => {
    // Si en Web/PWA falla la cámara trasera (ej. notebook o dispositivo con una sola cámara), reintentar con frontal
    if (Platform.OS === 'web' && facing === 'back' && !triedFallbackFacingRef.current) {
      triedFallbackFacingRef.current = true;
      setFacing('front');
      return;
    }

    setIsCameraActive(false);
    setIsCameraReady(false);
    setIsTorchOn(false);

    const rawMessage = event?.message ?? '';
    if (
      rawMessage.toLowerCase().includes('permission') ||
      rawMessage.toLowerCase().includes('notallowed') ||
      rawMessage.toLowerCase().includes('denied')
    ) {
      setCameraError(
        'Permiso de cámara denegado en el navegador. Permite el acceso a la cámara en el icono de candado de la barra de direcciones.',
      );
    } else {
      setCameraError(
        'No se pudo iniciar la cámara en este dispositivo. Verifica que no esté siendo utilizada por otra aplicación y que hayas otorgado permisos.',
      );
    }
  };

  const handleToggleFacing = () => {
    if (!isCameraActive) return;
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const handleToggleTorch = () => {
    if (!isCameraActive || facing === 'front') return;
    setIsTorchOn((prev) => !prev);
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scannedData || !result?.data) return;
    const rawValue = result.data.trim();
    if (!rawValue) return;

    setScannedData(rawValue);
    setIsTorchOn(false);
    setIsResolvingMachine(true);
    setQrResolution(null);

    void resolveMachineByQrCode(rawValue, { preferOffline: !isOnline })
      .then((resolution) => {
        setQrResolution(resolution);
      })
      .finally(() => {
        setIsResolvingMachine(false);
      });
  };

  const handleResetScan = () => {
    setCameraError(null);
    setScannedData(null);
    setQrResolution(null);
    setIsResolvingMachine(false);
    setIsCameraActive(true);
  };

  const handleOpenChecklistForMachine = (machine: Machine) => {
    router.push({
      pathname: '/maintenance/[machineId]',
      params: { machineId: machine.id },
    });
  };

  const isPermissionBlocked =
    Platform.OS !== 'web' &&
    permission !== null &&
    !permission.granted &&
    permission.canAskAgain === false;

  return (
    <View className="flex-1 bg-[#f8fafc]">
      <AppHeader
        title="Escanear QR"
        subtitle="Apunta al código QR de la máquina para identificar el equipo"
        showConnectivity={true}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 18,
          paddingBottom: Math.max(insets.bottom, 16) + 92,
          paddingHorizontal: 20,
        }}
      >
        <View className="w-full max-w-md self-center">
          {/* Visor principal de cámara y marco de escaneo */}
          <View className="overflow-hidden rounded-3xl bg-[#07172C] shadow-sm">
            <View className="relative h-[370px] w-full items-center justify-center overflow-hidden bg-[#07172C]">
              {canRenderCamera ? (
                <View style={StyleSheet.absoluteFill}>
                  <CameraView
                    ref={cameraRef}
                    style={styles.camera}
                    facing={facing}
                    enableTorch={isTorchOn}
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onCameraReady={handleCameraReady}
                    onMountError={handleCameraMountError}
                    onBarcodeScanned={scannedData ? undefined : handleBarcodeScanned}
                  />
                </View>
              ) : null}

              {/* Capa oscura sutil cuando la cámara está activa para dar contraste al recuadro */}
              <View
                pointerEvents="none"
                className={`absolute inset-0 ${canRenderCamera ? 'bg-black/30' : 'bg-transparent'}`}
              />

              {/* Indicador superior minimalista de estado (punto + texto limpio sin bordes) */}
              <View className="absolute top-4 z-10 flex-row items-center rounded-lg bg-black/35 px-3 py-1.5">
                <View
                  className={`mr-2 h-2 w-2 rounded-full ${
                    scannedData
                      ? 'bg-emerald-400'
                      : cameraError
                        ? 'bg-amber-400'
                        : isActivelyScanning
                          ? 'bg-emerald-400'
                          : 'bg-slate-400'
                  }`}
                />
                <Text className="text-xs font-medium text-slate-100">
                  {scannedData
                    ? 'Código QR detectado'
                    : cameraError
                      ? 'Cámara no disponible'
                      : isActivelyScanning
                        ? isCameraReady
                          ? 'Escaneando...'
                          : 'Iniciando cámara...'
                        : 'Cámara en espera'}
                </Text>
              </View>

              {/* Marco central de escaneo con guías sobrias estilo cámara nativa */}
              <View
                style={{ width: SCAN_FRAME_SIZE, height: SCAN_FRAME_SIZE }}
                className="relative items-center justify-center"
              >
                {/* Esquina superior izquierda */}
                <View
                  pointerEvents="none"
                  className={`absolute left-0 top-0 h-8 w-8 rounded-tl-xl border-l-[3px] border-t-[3px] ${
                    scannedData
                      ? 'border-emerald-400'
                      : isActivelyScanning
                        ? 'border-white'
                        : 'border-white/30'
                  }`}
                />
                {/* Esquina superior derecha */}
                <View
                  pointerEvents="none"
                  className={`absolute right-0 top-0 h-8 w-8 rounded-tr-xl border-r-[3px] border-t-[3px] ${
                    scannedData
                      ? 'border-emerald-400'
                      : isActivelyScanning
                        ? 'border-white'
                        : 'border-white/30'
                  }`}
                />
                {/* Esquina inferior izquierda */}
                <View
                  pointerEvents="none"
                  className={`absolute bottom-0 left-0 h-8 w-8 rounded-bl-xl border-b-[3px] border-l-[3px] ${
                    scannedData
                      ? 'border-emerald-400'
                      : isActivelyScanning
                        ? 'border-white'
                        : 'border-white/30'
                  }`}
                />
                {/* Esquina inferior derecha */}
                <View
                  pointerEvents="none"
                  className={`absolute bottom-0 right-0 h-8 w-8 rounded-br-xl border-b-[3px] border-r-[3px] ${
                    scannedData
                      ? 'border-emerald-400'
                      : isActivelyScanning
                        ? 'border-white'
                        : 'border-white/30'
                  }`}
                />

                {/* Línea de escaneo limpia sin destello holográfico */}
                {isActivelyScanning ? (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      {
                        position: 'absolute',
                        top: 0,
                        left: 12,
                        right: 12,
                      },
                      laserAnimatedStyle,
                    ]}
                  >
                    <View className="h-[2px] w-full rounded-full bg-white/90" />
                  </Animated.View>
                ) : null}

                {/* Estado central cuando la cámara está apagada o con error */}
                {!canRenderCamera ? (
                  <View className="items-center px-5">
                    <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                      {cameraError ? (
                        <AlertCircle size={28} color="#fbbf24" strokeWidth={1.8} />
                      ) : (
                        <QrCode size={28} color="#e2e8f0" strokeWidth={1.8} />
                      )}
                    </View>
                    <Text className="text-center text-sm font-semibold text-white">
                      {cameraError
                        ? 'No se pudo activar la cámara'
                        : isPermissionBlocked
                          ? 'Permiso de cámara deshabilitado'
                          : 'Listo para escanear'}
                    </Text>
                    <Text className="mt-1 text-center text-xs leading-relaxed text-slate-300">
                      {cameraError
                        ? cameraError
                        : isPermissionBlocked
                          ? 'Habilita el acceso a la cámara en los ajustes del sistema para leer códigos QR.'
                          : 'Activa la cámara y centra el código QR dentro del recuadro.'}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Texto guía inferior limpio sin contenedor flotante */}
              <Text className="absolute bottom-4 text-xs font-medium text-slate-300">
                Mantén el código a 15-20 cm de distancia
              </Text>
            </View>

            {/* Barra de controles del escáner sin bordes coloreados */}
            <View className="flex-row items-center gap-2.5 bg-[#0A1E38] p-3.5">
              {isPermissionBlocked ? (
                <Pressable
                  onPress={() => void Linking.openSettings()}
                  accessibilityRole="button"
                  accessibilityLabel="Abrir configuración del dispositivo para permitir acceso a la cámara"
                  className="min-h-[48px] flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 active:bg-blue-700"
                  style={{ cursor: 'pointer' }}
                >
                  <Settings size={18} color="#ffffff" strokeWidth={2} />
                  <Text className="text-sm font-semibold text-white">Abrir ajustes de cámara</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => void handleToggleCamera()}
                  accessibilityRole="button"
                  accessibilityLabel={
                    canRenderCamera ? 'Pausar cámara de escaneo' : 'Activar cámara para escanear QR'
                  }
                  accessibilityState={{ selected: canRenderCamera }}
                  className={`min-h-[48px] flex-1 flex-row items-center justify-center gap-2 rounded-xl px-4 py-3 ${
                    canRenderCamera
                      ? 'bg-white/10 active:bg-white/15'
                      : 'bg-blue-600 active:bg-blue-700'
                  }`}
                  style={{ cursor: 'pointer' }}
                >
                  {canRenderCamera ? (
                    <>
                      <CameraOff size={18} color="#f8fafc" strokeWidth={2} />
                      <Text className="text-sm font-semibold text-slate-100">Pausar cámara</Text>
                    </>
                  ) : (
                    <>
                      <Camera size={18} color="#ffffff" strokeWidth={2} />
                      <Text className="text-sm font-semibold text-white">Activar cámara</Text>
                    </>
                  )}
                </Pressable>
              )}

              {/* Botón para alternar cámara trasera/frontal */}
              <Pressable
                onPress={handleToggleFacing}
                disabled={!canRenderCamera}
                accessibilityRole="button"
                accessibilityLabel="Cambiar entre cámara trasera y frontal"
                accessibilityState={{ disabled: !canRenderCamera }}
                className={`min-h-[48px] min-w-[48px] items-center justify-center rounded-xl px-3 py-3 ${
                  !canRenderCamera ? 'bg-white/5 opacity-40' : 'bg-white/10 active:bg-white/15'
                }`}
                style={{ cursor: !canRenderCamera ? 'auto' : 'pointer' }}
              >
                <SwitchCamera size={18} color="#e2e8f0" strokeWidth={2} />
              </Pressable>

              {/* Botón de Linterna (Flash) */}
              <Pressable
                onPress={handleToggleTorch}
                disabled={!canRenderCamera || facing === 'front'}
                accessibilityRole="button"
                accessibilityLabel={isTorchOn ? 'Apagar linterna' : 'Encender linterna'}
                accessibilityState={{
                  selected: isTorchOn,
                  disabled: !canRenderCamera || facing === 'front',
                }}
                className={`min-h-[48px] min-w-[52px] flex-row items-center justify-center gap-1.5 rounded-xl px-3.5 py-3 ${
                  !canRenderCamera || facing === 'front'
                    ? 'bg-white/5 opacity-40'
                    : isTorchOn
                      ? 'bg-amber-400 active:bg-amber-500'
                      : 'bg-white/10 active:bg-white/15'
                }`}
                style={{
                  cursor: !canRenderCamera || facing === 'front' ? 'auto' : 'pointer',
                }}
              >
                {isTorchOn ? (
                  <Flashlight size={18} color="#0f172a" strokeWidth={2} />
                ) : (
                  <FlashlightOff size={18} color="#e2e8f0" strokeWidth={2} />
                )}
                <Text
                  className={`text-xs font-semibold ${
                    isTorchOn ? 'text-slate-900' : 'text-slate-200'
                  }`}
                >
                  Flash
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Tarjeta de resultado cuando se detecta un código QR */}
          {scannedData ? (
            <View
              accessibilityLiveRegion="polite"
              className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
            >
              {isResolvingMachine ? (
                <View className="flex-row items-center gap-3 py-2">
                  <ActivityIndicator size="small" color="#2563eb" />
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-slate-900">
                      Identificando equipo...
                    </Text>
                    <Text className="mt-0.5 text-xs text-slate-500">
                      Consultando inventario de máquinas por UUID
                    </Text>
                  </View>
                </View>
              ) : qrResolution?.estado_resolucion === 'found' && qrResolution.maquina ? (
                <View className="flex-col gap-3">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <CheckCircle2 size={18} color="#059669" strokeWidth={2.2} />
                      <Text className="text-sm font-bold text-slate-900">Equipo identificado</Text>
                    </View>

                    {qrResolution.desde_cache ? (
                      <View className="flex-row items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5">
                        <WifiOff size={11} color="#d97706" strokeWidth={2.2} />
                        <Text className="text-[10px] font-semibold text-amber-700">
                          Caché local
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <MachineCard
                    machine={qrResolution.maquina}
                    onPress={handleOpenChecklistForMachine}
                  />

                  <Pressable
                    onPress={() => {
                      if (qrResolution.maquina) {
                        handleOpenChecklistForMachine(qrResolution.maquina);
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Iniciar pauta de mantención para ${qrResolution.maquina.nombre}`}
                    className="min-h-[46px] flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 active:bg-blue-700"
                    style={{ cursor: 'pointer' }}
                  >
                    <ClipboardList size={17} color="#ffffff" strokeWidth={2.2} />
                    <Text className="text-xs font-bold text-white">
                      {`Abrir pauta: ${qrResolution.maquina.categoria.nombre}`}
                    </Text>
                  </Pressable>
                </View>
              ) : qrResolution?.estado_resolucion === 'not_found' ? (
                <View className="flex-row items-start gap-3">
                  <View
                    accessible={false}
                    importantForAccessibility="no-hide-descendants"
                    className="mt-0.5 h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50"
                  >
                    <AlertTriangle size={20} color="#d97706" strokeWidth={2} />
                  </View>

                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-bold text-slate-900">
                      Equipo no encontrado en el inventario
                    </Text>
                    <Text className="mt-0.5 text-xs leading-relaxed text-slate-500">
                      {qrResolution.desde_cache
                        ? 'No se encontró este UUID en la memoria local del dispositivo. Conéctate a internet para sincronizar equipos nuevos.'
                        : 'El UUID escaneado no corresponde a ninguna máquina activa registrada.'}
                    </Text>
                    <Text
                      selectable
                      className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 font-mono text-[11px] text-slate-600"
                    >
                      {qrResolution.uuid_detectado ?? scannedData}
                    </Text>
                  </View>
                </View>
              ) : (
                <View className="flex-row items-start gap-3">
                  <View
                    accessible={false}
                    importantForAccessibility="no-hide-descendants"
                    className="mt-0.5 h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50"
                  >
                    <AlertCircle size={20} color="#dc2626" strokeWidth={2} />
                  </View>

                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-bold text-slate-900">
                      Código QR no reconocido
                    </Text>
                    <Text className="mt-0.5 text-xs leading-relaxed text-slate-500">
                      El código escaneado no contiene un UUID válido de máquina de Bowling Service.
                    </Text>
                    <Text
                      selectable
                      numberOfLines={2}
                      className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 font-mono text-[11px] text-slate-600"
                    >
                      {scannedData}
                    </Text>
                  </View>
                </View>
              )}

              <Pressable
                onPress={handleResetScan}
                accessibilityRole="button"
                accessibilityLabel="Escanear otro código QR"
                className="mt-3.5 min-h-[44px] flex-row items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 active:bg-slate-200"
                style={{ cursor: 'pointer' }}
              >
                <RefreshCw size={15} color="#334155" strokeWidth={2} />
                <Text className="text-xs font-semibold text-slate-700">Escanear otro código</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
