import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import logo from '../../assets/images/logo.png?inline'
import { fuenteInforme } from '../fuente-informe'

import type {
    FiltrosHistorial,
    HistorialExportacion,
    OpcionesInforme,
    RegistroInforme,
} from '../../types/exportacion'

type RGB = [number, number, number]

const colores = {
    marino: [8, 22, 41] as RGB,
    azul: [18, 89, 189] as RGB,
    dorado: [211, 164, 64] as RGB,
    texto: [35, 48, 65] as RGB,
    secundario: [102, 117, 137] as RGB,
    borde: [220, 226, 235] as RGB,
    fondo: [245, 247, 251] as RGB,
    blanco: [255, 255, 255] as RGB,
}

const formatoFecha = new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Santiago',
})

const formatoMes = new Intl.DateTimeFormat('es-CL', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Santiago',
})

function texto(valor: unknown, alternativa = 'Sin registro'): string {
    if (valor === null || valor === undefined) return alternativa
    const resultado = String(valor).trim()
    return resultado || alternativa
}

function fecha(valor: string | null): string {
    if (!valor || !Number.isFinite(Date.parse(valor))) {
        return 'Sin fecha registrada'
    }

    return formatoFecha.format(new Date(valor))
}

function mesInforme(valor?: string): string {
    if (!valor || !/^\d{4}-(0[1-9]|1[0-2])$/.test(valor)) {
        return 'Todo el período filtrado'
    }

    // Mediodía evita desplazamientos de día al mostrar el mes en Chile.
    return formatoMes.format(new Date(`${valor}-01T12:00:00Z`))
}

export function crearPdfCorporativo(
    datos: HistorialExportacion,
    filtros: FiltrosHistorial,
    opciones: OpcionesInforme,
): ArrayBuffer {
    const registros = datos.registros

    if (!registros.length) {
        throw new Error('No hay mantenciones para generar el informe.')
    }

    if (new Set(registros.map(registro => registro.local_id)).size !== 1) {
        throw new Error('El informe debe corresponder a un solo local.')
    }

    const local = registros[0]!
    const periodo = mesInforme(filtros.mes)

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
    })

    doc.addFileToVFS('DejaVuSans.ttf', fuenteInforme)
    doc.addFont('DejaVuSans.ttf', 'DejaVu', 'normal')
    doc.setFont('DejaVu', 'normal')

    doc.setProperties({
        title: `Informe de mantención - ${texto(local.local)}`,
        subject: periodo,
        author: 'Bowling Service',
        creator: 'Bowling Service',
    })

    const ancho = doc.internal.pageSize.getWidth()
    const alto = doc.internal.pageSize.getHeight()
    const margen = 14
    const contenido = ancho - margen * 2
    const limiteInferior = alto - 27

    const numeros = new Map(
        registros.map((registro, indice) => [registro.id, indice + 1]),
    )

    function numero(registro: RegistroInforme): string {
        return `Registro ${numeros.get(registro.id) ?? '—'}`
    }

    function dividir(
        contenidoTexto: string,
        anchoDisponible: number,
        tamano: number,
    ): string[] {
        doc.setFont('DejaVu', 'normal')
        doc.setFontSize(tamano)

        return doc.splitTextToSize(
            contenidoTexto,
            anchoDisponible,
        ) as string[]
    }

    const lineasLocal = dividir(texto(local.local), contenido, 7.5)

    // Reserva espacio para el encabezado compacto de las páginas siguientes.
    const inicioContinuacion = Math.max(
        30,
        23 + lineasLocal.length * 3.6,
    )

    let y = 50

    function asegurarEspacio(espacio: number): void {
        if (y + espacio <= limiteInferior) return

        doc.addPage()
        y = inicioContinuacion
    }

    function parrafo(
        contenidoTexto: string,
        tamano = 9,
        color: RGB = colores.texto,
    ): void {
        const lineas = dividir(contenidoTexto, contenido, tamano)
        const interlineado = tamano * 0.352778 * 1.45

        for (const linea of lineas) {
            asegurarEspacio(interlineado + 2)

            doc.setFontSize(tamano)
            doc.setTextColor(...color)
            doc.text(linea, margen, y + interlineado)

            y += interlineado
        }

        y += 4
    }

    function seccion(titulo: string): void {
        const lineas = dividir(titulo, contenido - 12, 10.5)
        const altura = 6 + lineas.length * 4.8

        // Deja espacio para el título y el inicio de su contenido.
        asegurarEspacio(altura + 22)

        doc.setFillColor(...colores.marino)
        doc.roundedRect(margen, y, contenido, altura, 2, 2, 'F')

        doc.setFillColor(...colores.dorado)
        doc.rect(margen, y + 3, 1.2, altura - 6, 'F')

        doc.setFontSize(10.5)
        doc.setTextColor(...colores.blanco)

        lineas.forEach((linea, indice) => {
            doc.text(linea, margen + 6, y + 6 + indice * 4.8)
        })

        y += altura + 5
    }

    function subtitulo(titulo: string): void {
        const lineas = dividir(titulo, contenido, 10)
        const altura = lineas.length * 4.8

        asegurarEspacio(altura + 20)

        doc.setFontSize(10)
        doc.setTextColor(...colores.azul)

        lineas.forEach((linea, indice) => {
            doc.text(linea, margen, y + 4.8 + indice * 4.8)
        })

        y += altura + 5
    }

    function tabla(
        cabeceras: string[],
        filas: string[][],
        anchoPrimera?: number,
    ): void {
        asegurarEspacio(20)

        const cuerpo = filas.length
            ? filas
            : [cabeceras.map((_, indice) => indice === 0 ? 'Sin registros' : '')]

        autoTable(doc, {
            startY: y,
            head: [cabeceras],
            body: cuerpo,
            theme: 'grid',
            margin: {
                top: inicioContinuacion,
                bottom: 27,
                left: margen,
                right: margen,
            },
            styles: {
                font: 'DejaVu',
                fontStyle: 'normal',
                fontSize: 7.2,
                cellPadding: 2.5,
                overflow: 'linebreak',
                textColor: colores.texto,
                lineColor: colores.borde,
                lineWidth: 0.15,
                valign: 'top',
            },
            headStyles: {
                fillColor: colores.azul,
                textColor: colores.blanco,
                fontStyle: 'normal',
                cellPadding: 3,
            },
            alternateRowStyles: {
                fillColor: colores.fondo,
            },
            columnStyles: anchoPrimera
                ? { 0: { cellWidth: anchoPrimera } }
                : {},
            showHead: 'everyPage',
            rowPageBreak: 'avoid',
        })

        const ultimaTabla = (
            doc as jsPDF & {
                lastAutoTable?: { finalY: number }
            }
        ).lastAutoTable

        if (!ultimaTabla) {
            throw new Error('No se pudo componer una tabla del informe.')
        }

        y = ultimaTabla.finalY + 7
    }

    function datosRecinto(): void {
        autoTable(doc, {
            startY: y,
            theme: 'plain',
            body: [
                ['LOCAL', texto(local.local)],
                ['DIRECCIÓN', texto(local.direccion)],
                ['COMUNA', texto(local.comuna)],
                ['ENCARGADO', texto(opciones.encargado, 'No informado')],
            ],
            margin: {
                top: inicioContinuacion,
                bottom: 27,
                left: margen,
                right: margen,
            },
            styles: {
                font: 'DejaVu',
                fontStyle: 'normal',
                fontSize: 9,
                cellPadding: 3,
                overflow: 'linebreak',
                fillColor: colores.fondo,
                textColor: colores.texto,
            },
            columnStyles: {
                0: {
                    cellWidth: 35,
                    textColor: colores.secundario,
                    fontSize: 7.5,
                },
            },
            rowPageBreak: 'avoid',
        })

        const ultimaTabla = (
            doc as jsPDF & {
                lastAutoTable: { finalY: number }
            }
        ).lastAutoTable

        y = ultimaTabla.finalY + 7
    }

    function resumen(): void {
        asegurarEspacio(30)

        const maquinas = new Set(
            registros.map(registro => registro.maquina_id).filter(Boolean),
        ).size

        const tecnicos = new Set(
            registros.map(registro => registro.tecnico_id).filter(Boolean),
        ).size

        const indicadores = [
            { valor: registros.length, etiqueta: 'Mantenciones registradas' },
            { valor: maquinas, etiqueta: 'Máquinas identificadas' },
            { valor: tecnicos, etiqueta: 'Técnicos identificados' },
        ]

        const separacion = 4
        const anchoBloque = (contenido - separacion * 2) / 3

        indicadores.forEach((indicador, indice) => {
            const x = margen + indice * (anchoBloque + separacion)

            doc.setFillColor(...colores.fondo)
            doc.setDrawColor(...colores.borde)
            doc.setLineWidth(0.2)
            doc.roundedRect(x, y, anchoBloque, 25, 2, 2, 'FD')

            doc.setFontSize(20)
            doc.setTextColor(...colores.azul)
            doc.text(String(indicador.valor), x + 5, y + 11)

            doc.setFontSize(7.3)
            doc.setTextColor(...colores.secundario)
            doc.text(indicador.etiqueta, x + 5, y + 19)
        })

        y += 32
    }

    // Título principal.
    const metadatos = [
        `Período: ${periodo}`,
        `Orden: ${texto(opciones.orden, 'No informada')}`,
        `Generado: ${fecha(datos.generado_at)}`,
    ]

    const lineasMetadatos = metadatos.flatMap(valor =>
        dividir(valor, contenido - 12, 8),
    )

    const alturaTitulo = 23 + lineasMetadatos.length * 4.2

    doc.setFillColor(...colores.marino)
    doc.roundedRect(margen, y, contenido, alturaTitulo, 3, 3, 'F')

    doc.setFillColor(...colores.dorado)
    doc.rect(margen + 6, y + 6, 17, 0.8, 'F')

    doc.setFontSize(17)
    doc.setTextColor(...colores.blanco)
    doc.text('INFORME DE MANTENCIÓN', margen + 6, y + 15)

    doc.setFontSize(8)
    doc.setTextColor(220, 229, 242)

    lineasMetadatos.forEach((linea, indice) => {
        doc.text(linea, margen + 6, y + 22 + indice * 4.2)
    })

    y += alturaTitulo + 7

    datosRecinto()
    resumen()

    const fechasValidas = registros
        .map(registro => Date.parse(registro.finalizada_at))
        .filter(Number.isFinite)

    if (fechasValidas.length) {
        const extremos = fechasValidas.reduce(
            (acumulado, valor) => ({
                primera: Math.min(acumulado.primera, valor),
                ultima: Math.max(acumulado.ultima, valor),
            }),
            {
                primera: fechasValidas[0]!,
                ultima: fechasValidas[0]!,
            },
        )

        parrafo(
            `Actividad registrada entre ${fecha(new Date(extremos.primera).toISOString())} ` +
            `y ${fecha(new Date(extremos.ultima).toISOString())}.`,
            8,
            colores.secundario,
        )
    }

    parrafo(
        'El informe reúne las mantenciones enviadas y finalizadas del período. ' +
        'Las fechas se muestran en horario de Chile.',
        8,
        colores.secundario,
    )

    // Pautas y matrices.
    seccion('PAUTAS Y ACTIVIDADES')

    const pautas = new Map<string, RegistroInforme[]>()

    for (const registro of registros) {
        const clave = `${registro.pauta_id ?? 'sin-pauta'}:${registro.version ?? ''}`
        const grupo = pautas.get(clave)

        if (grupo) grupo.push(registro)
        else pautas.set(clave, [registro])
    }

    for (const grupo of pautas.values()) {
        const primera = grupo[0]!

        subtitulo(
            `${texto(primera.pauta)} · Versión ${texto(primera.version)}`,
        )

        parrafo(
            'Cada columna corresponde a una mantención por máquina. ' +
            'Los resultados se muestran tal como fueron registrados.',
            8,
            colores.secundario,
        )

        const items = new Map<
            string,
            { seccion: string; descripcion: string }
        >()

        for (const registro of grupo) {
            for (const respuesta of registro.respuestas) {
                items.set(respuesta.item_id ?? respuesta.id, {
                    seccion: texto(respuesta.seccion),
                    descripcion: texto(respuesta.item),
                })
            }
        }

        if (!items.size) {
            parrafo('No hay respuestas de pauta registradas en estas mantenciones.')
            continue
        }

        for (let inicio = 0; inicio < grupo.length; inicio += 3) {
            const bloque = grupo.slice(inicio, inicio + 3)

            tabla(
                [
                    'Sección / control',
                    ...bloque.map(registro =>
                        `${texto(registro.codigo)}\n` +
                        `${fecha(registro.finalizada_at)}\n` +
                        numero(registro),
                    ),
                ],
                [...items].map(([id, item]) => [
                    `${item.seccion}\n${item.descripcion}`,
                    ...bloque.map(registro =>
                        registro.respuestas
                            .filter(respuesta => (respuesta.item_id ?? respuesta.id) === id)
                            .map(respuesta => texto(respuesta.resultado))
                            .join(' / ') || 'Sin respuesta',
                    ),
                ]),
                76,
            )
        }
    }

    // Referencia completa de registros.
    seccion('ACTIVIDAD DEL PERÍODO')

    parrafo(
        'Los números de registro permiten relacionar las tablas del informe con ' +
        'cada mantención. Un registro no equivale necesariamente a una visita.',
        8,
        colores.secundario,
    )

    tabla(
        ['Registro / identificador', 'Equipo', 'Técnico', 'Fechas en Chile'],
        registros.map(registro => [
            `${numero(registro)}\n${registro.id}`,
            `${texto(registro.maquina)}\n${texto(registro.codigo)}`,
            texto(registro.tecnico),
            `Finalización:\n${fecha(registro.finalizada_at)}\n\n` +
            `Recepción:\n${fecha(registro.recibida_at)}`,
        ]),
        55,
    )

    seccion('RECOMENDACIONES')

    parrafo(
        texto(
            opciones.recomendaciones,
            'No se incorporaron recomendaciones adicionales.',
        ),
    )

    const pendientes = registros.filter(registro => registro.pendientes)

    if (pendientes.length) {
        subtitulo('Pendientes registrados')

        tabla(
            ['Registro', 'Equipo', 'Pendiente'],
            pendientes.map(registro => [
                numero(registro),
                texto(registro.codigo),
                texto(registro.pendientes),
            ]),
            28,
        )
    }

    seccion('CONCLUSIONES')

    parrafo(
        texto(opciones.conclusiones, 'No se incorporaron conclusiones adicionales.'),
    )

    seccion('REPUESTOS Y NOVEDADES')

    tabla(
        ['Registro / fecha', 'Equipo', 'Requiere repuestos', 'Detalle'],
        registros
            .filter(registro =>
                registro.requiere_repuestos || registro.detalle_repuestos,
            )
            .map(registro => [
                `${numero(registro)}\n${fecha(registro.finalizada_at)}`,
                texto(registro.codigo),
                registro.requiere_repuestos === null
                    ? 'Sin registro'
                    : registro.requiere_repuestos ? 'Sí' : 'No',
                texto(registro.detalle_repuestos),
            ]),
        40,
    )

    parrafo(
        'El detalle de repuestos corresponde al texto registrado. ' +
        'No se dispone de números de parte ni cantidades estructuradas.',
        8,
        colores.secundario,
    )

    seccion('CONTADORES Y PRUEBAS')

    parrafo(
        'No se dispone de datos de contador inicial, contador final, pruebas ' +
        'ni uso de la semana anterior en la información utilizada para este informe.',
    )

    seccion('DETALLE DE LOS TRABAJOS')

    for (const registro of registros) {
        subtitulo(
            `${numero(registro)} · ${texto(registro.maquina)} · ${texto(registro.codigo)}`,
        )

        tabla(
            ['Campo', 'Información registrada'],
            [
                ['Identificador', registro.id],
                ['Falla reportada', texto(registro.falla_reportada)],
                ['Trabajos realizados', texto(registro.trabajos_realizados)],
                ['Estado final', texto(registro.estado)],
                ['Observaciones', texto(registro.observaciones)],
            ],
            40,
        )

        if (registro.respuestas.length) {
            tabla(
                ['Control', 'Resultado', 'Observaciones'],
                registro.respuestas.map(respuesta => [
                    texto(respuesta.item),
                    texto(respuesta.resultado),
                    texto(respuesta.observaciones),
                ]),
                76,
            )
        } else {
            parrafo('Esta mantención no contiene respuestas de pauta registradas.')
        }
    }

    seccion('RESPONSABLE DEL INFORME')

    parrafo(texto(opciones.responsable, 'No informado'), 11)

    parrafo(
        'El nombre indicado identifica al responsable de la elaboración del documento. ' +
        'No constituye una firma electrónica ni sustituye la autoría de las mantenciones.',
        8,
        colores.secundario,
    )

    parrafo(
        'La orden, el encargado, las recomendaciones, las conclusiones y el responsable ' +
        'son datos complementarios del documento y no modifican los registros originales.',
        8,
        colores.secundario,
    )

    // Encabezados y pies al finalizar, con el total real de páginas.
    const paginas = doc.getNumberOfPages()
    const imagen = doc.getImageProperties(logo)

    const factorLogo = Math.min(
        41 / imagen.width,
        27 / imagen.height,
    )

    const anchoLogo = imagen.width * factorLogo
    const altoLogo = imagen.height * factorLogo

    for (let pagina = 1; pagina <= paginas; pagina++) {
        doc.setPage(pagina)
        doc.setFont('DejaVu', 'normal')

        doc.setFillColor(...colores.dorado)
        doc.rect(0, 0, ancho, 1.5, 'F')

        if (pagina === 1) {
            doc.addImage(
                logo,
                'PNG',
                margen,
                10 + (27 - altoLogo) / 2,
                anchoLogo,
                altoLogo,
                'logo-bowling',
                'FAST',
            )

            doc.setFontSize(8)
            doc.setTextColor(...colores.texto)

            const contacto = [
                'Reparación y mantención de equipos de bowling',
                'RUT 76.987.945-5',
                'Moneda 1137, Oficina 56, Santiago',
                'Teléfono: +569 90895329',
            ]

            contacto.forEach((linea, indice) => {
                doc.text(linea, ancho - margen, 15 + indice * 5, {
                    align: 'right',
                })
            })

            doc.setDrawColor(...colores.borde)
            doc.setLineWidth(0.3)
            doc.line(margen, 43, ancho - margen, 43)
        } else {
            doc.setFontSize(9)
            doc.setTextColor(...colores.azul)
            doc.text('INFORME DE MANTENCIÓN', margen, 13)

            doc.setFontSize(7)
            doc.setTextColor(...colores.secundario)
            doc.text(periodo, ancho - margen, 13, { align: 'right' })

            doc.setFontSize(7.5)

            lineasLocal.forEach((linea, indice) => {
                doc.text(linea, margen, 20 + indice * 3.6)
            })

            doc.setDrawColor(...colores.borde)
            doc.setLineWidth(0.2)
            doc.line(
                margen,
                inicioContinuacion - 5,
                ancho - margen,
                inicioContinuacion - 5,
            )
        }

        doc.setDrawColor(...colores.borde)
        doc.setLineWidth(0.2)
        doc.line(margen, alto - 21, ancho - margen, alto - 21)

        doc.setFontSize(6.5)
        doc.setTextColor(...colores.secundario)
        doc.text(
            'BOWLING SERVICE ROBERTO PEREZ E.I.R.L.',
            margen,
            alto - 15,
        )

        doc.setFontSize(7)
        doc.text('Bowling Service', margen, alto - 10)
        doc.text(
            `Página ${pagina} de ${paginas}`,
            ancho - margen,
            alto - 10,
            { align: 'right' },
        )
    }

    return doc.output('arraybuffer')
}