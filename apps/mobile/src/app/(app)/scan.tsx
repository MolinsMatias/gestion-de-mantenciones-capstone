import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
  type CameraMountError,
  type CameraType,
} from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle2,
  Flashlight,
  FlashlightOff,
  QrCode,
  RefreshCw,
  ScanLine,
  Settings,
  SwitchCamera,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
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

import { AppHeader } from '@/components/shared/app-header';

const SCAN_FRAME_SIZE = 232;
const LASER_MAX_TRANSLATE = SCAN_FRAME_SIZE - 16;

export default function EscanearScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [facing, setFacing] = useState<CameraType>('back');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const triedFallbackFacingRef = useRef(false);

  const laserTranslateY = useSharedValue(12);

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
          window.location.hostname === '127.0.0.1');

      if (!isSecure) {
        setCameraError(
          'El navegador bloquea el acceso a la cámara en conexiones no seguras (HTTP). Abre la PWA mediante HTTPS o desde localhost.',
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
    setScannedData(result.data.trim());
    setIsTorchOn(false);
  };

  const handleResetScan = () => {
    setCameraError(null);
    setScannedData(null);
    setIsCameraActive(true);
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
          <View className="overflow-hidden rounded-3xl border border-slate-200/90 bg-[#07172C] shadow-md">
            <View className="relative h-[370px] w-full items-center justify-center overflow-hidden">
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
              ) : (
                <LinearGradient
                  colors={['#07172C', '#0F2544', '#07172C']}
                  style={StyleSheet.absoluteFill}
                />
              )}

              {/* Capa oscura semitransparente para contrastar el marco */}
              <View
                pointerEvents="none"
                className={`absolute inset-0 ${
                  canRenderCamera ? 'bg-slate-950/35' : 'bg-transparent'
                }`}
              />

              {/* Píldora superior de estado de escaneo */}
              <View className="absolute top-4 z-10 flex-row items-center rounded-full border border-white/15 bg-slate-900/80 px-3.5 py-1.5">
                <View
                  className={`mr-2 h-2 w-2 rounded-full ${
                    scannedData
                      ? 'bg-emerald-400'
                      : cameraError
                        ? 'bg-amber-400'
                        : isActivelyScanning
                          ? isCameraReady
                            ? 'bg-blue-400'
                            : 'bg-sky-300'
                          : 'bg-slate-400'
                  }`}
                />
                <Text className="text-xs font-semibold text-slate-100">
                  {scannedData
                    ? 'Código QR detectado'
                    : cameraError
                      ? 'Cámara no disponible'
                      : isActivelyScanning
                        ? isCameraReady
                          ? 'Escaneando en tiempo real...'
                          : 'Iniciando cámara...'
                        : 'Cámara en espera'}
                </Text>
              </View>

              {/* Marco central de escaneo con esquinas resaltadas */}
              <View
                style={{ width: SCAN_FRAME_SIZE, height: SCAN_FRAME_SIZE }}
                className="relative items-center justify-center"
              >
                {/* Esquina superior izquierda */}
                <View
                  pointerEvents="none"
                  className={`absolute left-0 top-0 h-9 w-9 rounded-tl-2xl border-l-4 border-t-4 ${
                    scannedData
                      ? 'border-emerald-400'
                      : isActivelyScanning
                        ? 'border-blue-400'
                        : 'border-slate-500/70'
                  }`}
                />
                {/* Esquina superior derecha */}
                <View
                  pointerEvents="none"
                  className={`absolute right-0 top-0 h-9 w-9 rounded-tr-2xl border-r-4 border-t-4 ${
                    scannedData
                      ? 'border-emerald-400'
                      : isActivelyScanning
                        ? 'border-blue-400'
                        : 'border-slate-500/70'
                  }`}
                />
                {/* Esquina inferior izquierda */}
                <View
                  pointerEvents="none"
                  className={`absolute bottom-0 left-0 h-9 w-9 rounded-bl-2xl border-b-4 border-l-4 ${
                    scannedData
                      ? 'border-emerald-400'
                      : isActivelyScanning
                        ? 'border-blue-400'
                        : 'border-slate-500/70'
                  }`}
                />
                {/* Esquina inferior derecha */}
                <View
                  pointerEvents="none"
                  className={`absolute bottom-0 right-0 h-9 w-9 rounded-br-2xl border-b-4 border-r-4 ${
                    scannedData
                      ? 'border-emerald-400'
                      : isActivelyScanning
                        ? 'border-blue-400'
                        : 'border-slate-500/70'
                  }`}
                />

                {/* Línea láser animada cuando está escaneando */}
                {isActivelyScanning ? (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      {
                        position: 'absolute',
                        top: 0,
                        left: 10,
                        right: 10,
                      },
                      laserAnimatedStyle,
                    ]}
                  >
                    <LinearGradient
                      colors={[
                        'rgba(59, 130, 246, 0)',
                        'rgba(96, 165, 250, 0.95)',
                        'rgba(59, 130, 246, 0)',
                      ]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={{ height: 3, borderRadius: 999 }}
                    />
                    <LinearGradient
                      colors={['rgba(59, 130, 246, 0.35)', 'rgba(59, 130, 246, 0)']}
                      style={{ height: 18 }}
                    />
                  </Animated.View>
                ) : null}

                {/* Estado central cuando la cámara está apagada o con error */}
                {!canRenderCamera ? (
                  <View className="items-center px-4">
                    <View
                      className={`mb-3 h-16 w-16 items-center justify-center rounded-2xl border ${
                        cameraError
                          ? 'border-amber-400/30 bg-amber-500/15'
                          : 'border-blue-400/25 bg-blue-500/15'
                      }`}
                    >
                      {cameraError ? (
                        <AlertCircle size={32} color="#fbbf24" strokeWidth={1.8} />
                      ) : (
                        <QrCode size={34} color="#60a5fa" strokeWidth={1.8} />
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

              {/* Texto guía inferior dentro del visor */}
              <View className="absolute bottom-4 flex-row items-center gap-1.5 rounded-full bg-slate-900/75 px-3.5 py-1.5">
                <ScanLine size={14} color="#93c5fd" strokeWidth={2} />
                <Text className="text-xs font-medium text-slate-200">
                  Mantén el código a 15-20 cm de distancia
                </Text>
              </View>
            </View>

            {/* Barra de controles del escáner (Activar/Pausar, Cambiar cámara y Linterna) */}
            <View className="flex-row items-center gap-2.5 border-t border-slate-800 bg-[#0A1E38] p-3.5">
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
                      ? 'border border-slate-600 bg-slate-800 active:bg-slate-700'
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
                className={`min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border px-3 py-3 ${
                  !canRenderCamera
                    ? 'border-slate-800 bg-slate-900/50 opacity-45'
                    : 'border-slate-700 bg-slate-800/90 active:bg-slate-700'
                }`}
                style={{ cursor: !canRenderCamera ? 'auto' : 'pointer' }}
              >
                <SwitchCamera size={18} color="#cbd5e1" strokeWidth={2} />
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
                className={`min-h-[48px] min-w-[52px] flex-row items-center justify-center gap-1.5 rounded-xl border px-3.5 py-3 ${
                  !canRenderCamera || facing === 'front'
                    ? 'border-slate-800 bg-slate-900/50 opacity-45'
                    : isTorchOn
                      ? 'border-amber-400/60 bg-amber-500/20 active:bg-amber-500/30'
                      : 'border-slate-700 bg-slate-800/90 active:bg-slate-700'
                }`}
                style={{
                  cursor: !canRenderCamera || facing === 'front' ? 'auto' : 'pointer',
                }}
              >
                {isTorchOn ? (
                  <Flashlight size={18} color="#fbbf24" strokeWidth={2} />
                ) : (
                  <FlashlightOff size={18} color="#cbd5e1" strokeWidth={2} />
                )}
                <Text
                  className={`text-xs font-semibold ${
                    isTorchOn ? 'text-amber-300' : 'text-slate-200'
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
              className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm"
            >
              <View className="flex-row items-start gap-3">
                <View
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                  className="mt-0.5 h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50"
                >
                  <CheckCircle2 size={20} color="#059669" strokeWidth={2} />
                </View>

                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-bold text-slate-900">Código QR identificado</Text>
                  <Text
                    selectable
                    className="mt-1 rounded-lg bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-700"
                  >
                    {scannedData}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={handleResetScan}
                accessibilityRole="button"
                accessibilityLabel="Escanear otro código QR"
                className="mt-3.5 min-h-[44px] flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 active:bg-slate-100"
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
