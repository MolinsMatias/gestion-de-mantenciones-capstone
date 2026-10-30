import { AlertCircle, CheckCircle2, CloudOff } from 'lucide-react-native';
import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

export interface MaintenanceFeedback {
  kind: 'sent' | 'queued' | 'error';
  title: string;
  message: string;
}

interface MaintenanceFeedbackDialogProps {
  feedback: MaintenanceFeedback | null;
  onConfirm: () => void;
}

export function MaintenanceFeedbackDialog({ feedback, onConfirm }: MaintenanceFeedbackDialogProps) {
  if (!feedback) return null;
  const isError = feedback.kind === 'error';

  return (
    <Modal transparent visible animationType="none" onRequestClose={onConfirm}>
      <View className="flex-1 items-center justify-center bg-black/50 px-5 py-10">
        <View
          accessibilityViewIsModal
          className="max-h-full w-full max-w-md rounded-3xl bg-white p-6"
        >
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            <View
              className={`mb-4 h-12 w-12 items-center justify-center rounded-2xl ${isError ? 'bg-red-50' : feedback.kind === 'queued' ? 'bg-amber-50' : 'bg-emerald-50'}`}
            >
              {isError ? (
                <AlertCircle size={24} color="#b91c1c" />
              ) : feedback.kind === 'queued' ? (
                <CloudOff size={24} color="#92400e" />
              ) : (
                <CheckCircle2 size={24} color="#047857" />
              )}
            </View>
            <Text accessibilityRole="header" className="text-xl font-bold text-slate-900">
              {feedback.title}
            </Text>
            <Text
              accessibilityLiveRegion="polite"
              className="mt-3 text-sm leading-6 text-slate-600"
            >
              {feedback.message}
            </Text>
          </ScrollView>
          <Pressable
            onPress={onConfirm}
            accessibilityRole="button"
            accessibilityLabel={isError ? 'Volver a la pauta' : 'Ir al inicio'}
            className="mt-6 min-h-12 items-center justify-center rounded-xl bg-blue-600 px-4 py-3 active:bg-blue-700"
          >
            <Text className="text-sm font-bold text-white">
              {isError ? 'Volver a la pauta' : 'Ir al inicio'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
