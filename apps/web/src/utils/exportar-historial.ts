import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import ExcelJS from 'exceljs'
import { fuenteInforme } from './fuente-informe'
import type { FiltrosHistorial, HistorialExportacion, OpcionesInforme, RegistroInforme } from '../types/exportacion'

export type ModoInforme = 'historial' | 'informe'
const fecha = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Santiago' })
const texto = (v: unknown): string => v === null || v === undefined || v === '' ? 'Sin registro' : String(v)
export const fechaInforme = (v: string | null): string => v && Number.isFinite(Date.parse(v)) ? fecha.format(new Date(v)) : 'Sin fecha registrada'
const filtrosTexto = (f: FiltrosHistorial) => Object.entries(f).map(([k, v]) => `${k}: ${v || 'Todos'}`).join(' · ')
const empresa = ['BOWLING SERVICE ROBERTO PEREZ E.I.R.L.', 'Reparación y mantención de equipos de bowling', 'RUT 76.987.945-5 · Moneda 1137, Oficina 56, Santiago', 'Teléfono: +569 90895329']
const pendientesModelo = 'El esquema actual no registra encargado, orden, contadores de pruebas, número de parte ni cantidades estructuradas. Los datos complementarios de este informe no modifican la base de datos.'
function validar(datos: HistorialExportacion, modo: ModoInforme) {
  if (!datos.registros.length) throw new Error('No hay mantenciones para los filtros seleccionados. No se generó un archivo.')
  if (modo === 'informe' && new Set(datos.registros.map(r => r.local_id)).size !== 1) {
    throw new Error('Selecciona un solo local antes de generar el informe de mantención.')
  }
}
const encabezados = ['ID mantención', 'Local', 'Máquina / código', 'Técnico', 'Tipo', 'Estado final', 'Finalizada (Chile)', 'Recibida (Chile)']
const filaResumen = (r: RegistroInforme) => [r.id, texto(r.local), `${texto(r.maquina)} / ${texto(r.codigo)}`, texto(r.tecnico), texto(r.tipo), texto(r.estado), fechaInforme(r.finalizada_at), fechaInforme(r.recibida_at)]

export function crearPdf(datos: HistorialExportacion, filtros: FiltrosHistorial, modo: ModoInforme, opciones: OpcionesInforme): ArrayBuffer {
  validar(datos, modo)
  const doc = new jsPDF({ orientation: modo === 'historial' ? 'landscape' : 'portrait' })
  doc.addFileToVFS('DejaVuSans.ttf', fuenteInforme)
  doc.addFont('DejaVuSans.ttf', 'DejaVu', 'normal')
  doc.setFont('DejaVu')
  let y = 16
  const ancho = doc.internal.pageSize.getWidth()
  function parrafo(t: string, tam = 9) {
    doc.setFontSize(tam)
    const lineas: string[] = doc.splitTextToSize(t, ancho - 28)
    for (const linea of lineas) {
      if (y > doc.internal.pageSize.getHeight() - 22) { doc.addPage(); y = 16 }
      doc.text(linea, 14, y); y += tam * 0.46 + 1
    }
    y += 3
  }
  function titulo(t: string) { if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 16 }; parrafo(t, 12) }
  function tabla(head: string[], body: string[][], anchoPrimera?: number) {
    autoTable(doc, { startY: y, head: [head], body: body.length ? body : [head.map((_, i) => i ? '' : 'Sin registros')],
      styles: { font: 'DejaVu', fontStyle: 'normal', fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: anchoPrimera ? { 0: { cellWidth: anchoPrimera } } : {},
      headStyles: { fillColor: [30, 64, 110], fontStyle: 'normal' },
      margin: { top: 14, bottom: 18, left: 14, right: 14 }, rowPageBreak: 'avoid' })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }
  empresa.forEach((linea, i) => parrafo(linea, i === 0 ? 13 : 9))
  titulo(modo === 'historial' ? 'HISTORIAL DE MANTENCIONES' : `INFORME DE MANTENCIÓN${opciones.orden.trim() ? ` · ORDEN ${opciones.orden.trim()}` : ' · SIN NÚMERO DE ORDEN'}`)
  parrafo(`Generado: ${fechaInforme(datos.generado_at)} · ${datos.registros.length} registros · Horario de Chile`)
  parrafo(`Filtros aplicados (identificadores): ${filtrosTexto(filtros)}`, 8)
  parrafo('Se incluyen registros enviados y finalizados. La fecha de finalización no reemplaza una recepción no registrada.', 8)
  if (modo === 'historial') tabla(encabezados, datos.registros.map(filaResumen))
  else {
    const r = datos.registros[0]!
    titulo(texto(r.local))
    parrafo(`${texto(r.direccion)} · ${texto(r.comuna)}\nEncargado: ${texto(opciones.encargado)}`)
    parrafo(`Mes / año: ${filtros.mes || 'Todo el período filtrado'}`)
    parrafo(`Período de registros seleccionados: ${fechaInforme(r.finalizada_at)} a ${fechaInforme(datos.registros.at(-1)!.finalizada_at)}`)
    parrafo('Se presenta la actividad de mantenimiento persistida para el recinto y los filtros indicados.')
    titulo('PAUTAS Y ACTIVIDADES')
    const pautas = new Map<string, RegistroInforme[]>()
    for (const reg of datos.registros) {
      const clave = reg.pauta_id ?? 'sin-pauta'
      pautas.set(clave, [...(pautas.get(clave) ?? []), reg])
    }
    for (const registros of pautas.values()) {
      const primero = registros[0]!
      titulo(`${texto(primero.pauta)} · Versión ${texto(primero.version)}`)
      parrafo('La matriz muestra los controles con respuesta persistida. Las columnas corresponden a registros por máquina, no a visitas físicas consolidadas. Se conservan los resultados originales; no se convierten a I/C/R.', 8)
      const items = new Map<string, { seccion: string; item: string }>()
      for (const reg of registros) for (const res of reg.respuestas) items.set(res.item_id ?? res.id, { seccion: texto(res.seccion), item: texto(res.item) })
      for (let inicio = 0; inicio < registros.length; inicio += 3) {
        const bloque = registros.slice(inicio, inicio + 3)
        tabla(['Sección / control', ...bloque.map(reg => `${texto(reg.codigo)}\n${fechaInforme(reg.finalizada_at)}\nRegistro ${datos.registros.indexOf(reg) + 1}`)],
          [...items].map(([id, item]) => [`${item.seccion}\n${item.item}`, ...bloque.map(reg => reg.respuestas.filter(res => (res.item_id ?? res.id) === id).map(res => texto(res.resultado)).join(' / ') || 'Sin respuesta')]), 76)
      }
    }
    titulo('REGISTRO DE VISITAS / ACTIVIDAD')
    tabla(['Registro / ID mantención', 'Máquina', 'Técnico', 'Finalizada / recibida (Chile)'], datos.registros.map((reg, i) => [`${i + 1} / ${reg.id}`, `${texto(reg.maquina)}\n${texto(reg.codigo)}`, texto(reg.tecnico), `${fechaInforme(reg.finalizada_at)}\n${fechaInforme(reg.recibida_at)}`]))
    titulo('RECOMENDACIONES')
    parrafo(texto(opciones.recomendaciones))
    for (const reg of datos.registros.filter(reg => reg.pendientes)) parrafo(`${texto(reg.codigo)} · ${reg.id}: ${reg.pendientes}`)
    titulo('CONCLUSIONES')
    parrafo(texto(opciones.conclusiones))
    titulo('REPUESTOS UTILIZADOS O POR REEMPLAZAR (NOVEDADES)')
    tabla(['Registro / fecha', 'Máquina', 'Requiere repuestos', 'Detalle registrado'], datos.registros.filter(reg => reg.requiere_repuestos || reg.detalle_repuestos).map(reg => [reg.id + '\n' + fechaInforme(reg.finalizada_at), texto(reg.codigo), reg.requiere_repuestos === null ? 'Sin registro' : reg.requiere_repuestos ? 'Sí' : 'No', texto(reg.detalle_repuestos)]))
    parrafo('Número de parte y cantidad: no se capturan de forma estructurada. Se conserva íntegro el detalle libre registrado.', 8)
    titulo('CONTADORES Y PRUEBAS POR MÁQUINA')
    parrafo('Sin datos registrados en el modelo compartido para contador inicial, contador final, pruebas y uso de la semana anterior. No se calculan ni se incorporan los valores del ejemplo.')
    titulo('DETALLE DE TRABAJOS Y OBSERVACIONES')
    for (const reg of datos.registros) {
      titulo(`${texto(reg.codigo)} · ${reg.id}`)
      tabla(['Campo', 'Registro'], [['Falla reportada', texto(reg.falla_reportada)], ['Trabajos realizados', texto(reg.trabajos_realizados)], ['Estado final', texto(reg.estado)], ['Observaciones', texto(reg.observaciones)]])
      tabla(['Control', 'Resultado', 'Observaciones'], reg.respuestas.map(res => [texto(res.item), texto(res.resultado), texto(res.observaciones)]))
    }
    titulo('RESPONSABLE DEL INFORME')
    parrafo(texto(opciones.responsable))
    parrafo('Nombre declarado para el documento. No constituye una firma electrónica ni reemplaza la autoría técnica registrada.', 8)
    parrafo(pendientesModelo, 8)
  }
  const paginas = doc.getNumberOfPages()
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p); doc.setFontSize(8)
    doc.text(`Bowling Service · ${p} / ${paginas}`, 14, doc.internal.pageSize.getHeight() - 8)
  }
  return doc.output('arraybuffer')
}

export async function crearExcel(datos: HistorialExportacion, filtros: FiltrosHistorial, modo: ModoInforme, opciones: OpcionesInforme): Promise<ArrayBuffer> {
  validar(datos, modo)
  const libro = new ExcelJS.Workbook()
  libro.creator = 'Bowling Service'; libro.created = new Date(datos.generado_at)
  function hoja(nombre: string, titulos: string[], filas: (string | number)[][]) {
    const h = libro.addWorksheet(nombre, { views: [{ state: 'frozen', ySplit: 1 }] })
    h.addRow(titulos); filas.forEach(f => h.addRow(f))
    h.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    h.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E406E' } }
    h.columns.forEach((c, i) => { c.width = i === 0 ? 40 : 30; c.alignment = { vertical: 'top', wrapText: true } })
    h.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, h.rowCount), column: titulos.length } }
    return h
  }
  if (modo === 'informe') {
    const r = datos.registros[0]!
    hoja('Informe', ['Sección', 'Contenido'], [
      ...empresa.map(t => ['Empresa', t]), ['Título', 'INFORME DE MANTENCIÓN'], ['Orden (dato complementario)', texto(opciones.orden)],
      ['Local', texto(r.local)], ['Dirección / comuna', `${texto(r.direccion)} / ${texto(r.comuna)}`], ['Encargado (dato complementario)', texto(opciones.encargado)],
      ['Mes / año', filtros.mes || 'Todo el período filtrado'],
      ['Período', `${fechaInforme(r.finalizada_at)} a ${fechaInforme(datos.registros.at(-1)!.finalizada_at)}`],
      ['Pautas y actividades', 'Ver hojas Historial y Respuestas: controles con respuesta persistida, sin convertir resultados a I/C/R.'],
      ['Registro de visitas / actividad', 'Ver Historial. Cada fila es una mantención, no una visita física consolidada.'],
      ['Recomendaciones (complementario)', texto(opciones.recomendaciones)], ['Conclusiones (complementario)', texto(opciones.conclusiones)],
      ['Repuestos utilizados o por reemplazar', 'Ver requiere repuestos, detalle repuestos y pendientes en Historial. No hay parte ni cantidades estructuradas.'],
      ['Contadores y pruebas', 'Sin campos en el esquema compartido. Pendiente integrar su captura.'], ['Responsable (complementario)', texto(opciones.responsable)], ['Alcance', pendientesModelo],
    ])
  }
  hoja('Historial', [...encabezados, 'ID local', 'ID máquina', 'ID técnico', 'ID pauta', 'Pauta', 'Versión', 'Iniciada (Chile)', 'Enviada (Chile)', 'Falla reportada', 'Trabajos realizados', 'Requiere repuestos', 'Detalle repuestos', 'Pendientes', 'Observaciones'], datos.registros.map(r => [...filaResumen(r), texto(r.local_id), texto(r.maquina_id), texto(r.tecnico_id), texto(r.pauta_id), texto(r.pauta), texto(r.version), fechaInforme(r.iniciada_at), fechaInforme(r.enviada_at), texto(r.falla_reportada), texto(r.trabajos_realizados), r.requiere_repuestos === null ? 'Sin registro' : r.requiere_repuestos ? 'Sí' : 'No', texto(r.detalle_repuestos), texto(r.pendientes), texto(r.observaciones)]))
  hoja('Respuestas', ['ID mantención', 'ID respuesta', 'ID ítem', 'Pauta / versión', 'Sección', 'Control', 'Instrucciones', 'Resultado', 'Observaciones'], datos.registros.flatMap(r => r.respuestas.map(res => [r.id, res.id, texto(res.item_id), `${texto(r.pauta)} / ${texto(r.version)}`, texto(res.seccion), texto(res.item), texto(res.instrucciones), texto(res.resultado), texto(res.observaciones)])))
  hoja('Filtros', ['Campo', 'Valor'], [...Object.entries(filtros).map(([k, v]) => [k, v || 'Todos']), ['Generado (Chile)', fechaInforme(datos.generado_at)], ['Registros', datos.registros.length], ['Criterio', 'Enviadas y finalizadas. Incluye el historial de catálogos archivados.'], ['Zona horaria', 'America/Santiago']])
  const bytes = await libro.xlsx.writeBuffer()
  return Uint8Array.from(new Uint8Array(bytes)).buffer
}

export function descargarInforme(bytes: ArrayBuffer, extension: 'pdf' | 'xlsx', modo: ModoInforme): void {
  const url = URL.createObjectURL(new Blob([bytes], { type: extension === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a'); a.href = url
  a.download = `${modo}-mantenciones-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`
  document.body.append(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
