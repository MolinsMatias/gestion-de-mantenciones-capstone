import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HistoryRecord } from '@/types/maintenance';

const TYPE_LABELS = {
  preventiva: 'Preventiva',
  correctiva: 'Correctiva',
  inspeccion: 'Inspección',
};
const STATUS_LABELS = {
  operativa: 'Operativa',
  operativa_con_observaciones: 'Operativa con detalles',
  fuera_de_servicio: 'Fuera de servicio',
};
export function HistoryDetailDialog({
  record,
  localName,
  onClose,
}: {
  record: HistoryRecord | null;
  localName: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  if (!record) return null;
  const fields = [
    ['Código', record.codigo_interno],
    ['Categoría', record.categoria],
    ['Local', localName],
    ['Tipo de intervención', TYPE_LABELS[record.tipo]],
    ['Inicio', new Date(record.iniciada_at).toLocaleString('es-CL')],
    [
      'Finalización',
      record.finalizada_at ? new Date(record.finalizada_at).toLocaleString('es-CL') : 'Sin fecha',
    ],
    ['Estado final del equipo', STATUS_LABELS[record.estado_equipo_final]],
    ['Trabajos realizados', record.trabajos_realizados],
    ['Requiere repuestos', record.requiere_repuestos ? 'Sí' : 'No'],
    ['Detalle de repuestos', record.detalle_repuestos],
    ['Pendientes', record.pendientes],
    ['Observaciones', record.observaciones],
  ];
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View
        className="flex-1 items-center justify-center bg-black/50 px-5"
        style={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }}
      >
        <View
          accessibilityViewIsModal
          className="w-full max-w-xl rounded-2xl bg-white p-5"
          style={{ maxHeight: '95%' }}
        >
          <Text accessibilityRole="header" className="text-xl font-bold text-slate-900">
            {record.titulo}
          </Text>
          <Text className="mb-4 mt-1 text-sm font-medium text-emerald-700">
            Intervención enviada · Solo lectura
          </Text>
          <ScrollView showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
            {fields.map(([label, value]) => (
              <View key={label} className="mb-4">
                <Text className="text-xs font-semibold text-slate-500">{label}</Text>
                <Text selectable className="mt-1 text-sm leading-6 text-slate-900">
                  {value || 'Sin registro'}
                </Text>
              </View>
            ))}
          </ScrollView>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            className="mt-3 min-h-12 items-center justify-center rounded-xl bg-blue-600 active:bg-blue-700"
          >
            <Text className="font-semibold text-white">Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
