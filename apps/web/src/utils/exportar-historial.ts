import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import ExcelJS from 'exceljs'
import { fuenteInforme } from './fuente-informe'
import type { FiltrosHistorial, HistorialExportacion, OpcionesInforme, RegistroInforme } from '../types/exportacion'
import { crearPdfCorporativo } from './pdf/informe-corporativo'

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

export function crearPdf(
  datos: HistorialExportacion,
  filtros: FiltrosHistorial,
  modo: ModoInforme,
  opciones: OpcionesInforme,
): ArrayBuffer {
  validar(datos, modo)

  // Informe con logo y diseño corporativo de Bowling Service.
  if (modo === 'informe') {
    return crearPdfCorporativo(datos, filtros, opciones)
  }

  // Exportación del historial filtrado.
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  doc.addFileToVFS('DejaVuSans.ttf', fuenteInforme)
  doc.addFont('DejaVuSans.ttf', 'DejaVu', 'normal')
  doc.setFont('DejaVu', 'normal')

  const ancho = doc.internal.pageSize.getWidth()
  const alto = doc.internal.pageSize.getHeight()

  let y = 16

  function parrafo(contenido: string, tamano = 9): void {
    doc.setFontSize(tamano)

    const lineas = doc.splitTextToSize(
      contenido,
      ancho - 28,
    ) as string[]

    for (const linea of lineas) {
      if (y > alto - 22) {
        doc.addPage()
        y = 16
      }

      doc.text(linea, 14, y)
      y += tamano * 0.46 + 1
    }

    y += 3
  }

  function titulo(contenido: string): void {
    if (y > alto - 40) {
      doc.addPage()
      y = 16
    }

    parrafo(contenido, 12)
  }

  function tabla(
    cabeceras: string[],
    filas: string[][],
  ): void {
    autoTable(doc, {
      startY: y,
      head: [cabeceras],
      body: filas,
      styles: {
        font: 'DejaVu',
        fontStyle: 'normal',
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [30, 64, 110],
        fontStyle: 'normal',
      },
      margin: {
        top: 14,
        bottom: 18,
        left: 14,
        right: 14,
      },
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
    })

    const ultimaTabla = (
      doc as jsPDF & {
        lastAutoTable?: {
          finalY: number
        }
      }
    ).lastAutoTable

    if (!ultimaTabla) {
      throw new Error('No se pudo generar la tabla del historial.')
    }

    y = ultimaTabla.finalY + 8
  }

  empresa.forEach((linea, indice) => {
    parrafo(linea, indice === 0 ? 13 : 9)
  })

  titulo('HISTORIAL DE MANTENCIONES')

  parrafo(
    `Generado: ${fechaInforme(datos.generado_at)} · ` +
    `${datos.registros.length} registros · Horario de Chile`,
  )

  parrafo(
    `Filtros aplicados (identificadores): ${filtrosTexto(filtros)}`,
    8,
  )

  parrafo(
    'Se incluyen registros enviados y finalizados. ' +
    'La fecha de finalización no reemplaza una recepción no registrada.',
    8,
  )

  tabla(
    encabezados,
    datos.registros.map(filaResumen),
  )

  const totalPaginas = doc.getNumberOfPages()

  for (let pagina = 1; pagina <= totalPaginas; pagina++) {
    doc.setPage(pagina)
    doc.setFont('DejaVu', 'normal')
    doc.setFontSize(8)

    doc.text(
      `Bowling Service · ${pagina} / ${totalPaginas}`,
      14,
      alto - 8,
    )
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
