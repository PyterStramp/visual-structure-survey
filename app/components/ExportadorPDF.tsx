// components/ExportadorPDF.tsx

"use client";

import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PlanEstudios {
  carrera: string;
  plan_estudios: string;
  estructura: {
    tecnologia: string;
    componente_propedeutico: string;
    ingenieria: string;
  };
  periodos: {
    [periodoId: string]: {
      nombre: string;
      asignaturas: any[];
      total_creditos: number;
    };
  };
}

interface ConfiguracionReporte {
  incluirResumenGeneral: boolean;
  incluirSoftwarePorPeriodos: boolean;
  incluirDetalleDocentes: boolean;
  incluirEstadisticasCobertura: boolean;
  incluirRecomendaciones: boolean;
  filtros: {
    periodo?: string;
    asignatura?: string;
  };
}

interface DatosDisponibles {
  tieneEncuestas: boolean;
  tieneListaDocentes: boolean;
  tienePlanEstudios: boolean;
  totalEncuestas: number;
  totalDocentes: number;
  totalPeriodos: number;
  softwareUnico: number;
  cobertura: number;
}

interface ExportadorPDFProps {
  encuestas: any[];
  listaDocentes: string[];
  planEstudios?: PlanEstudios;
  isOpen: boolean;
  onClose: () => void;
}

export function ExportadorPDF({
  encuestas,
  listaDocentes,
  planEstudios,
  isOpen,
  onClose,
}: ExportadorPDFProps) {
  const [configuracion, setConfiguracion] = useState<ConfiguracionReporte>({
    incluirResumenGeneral: true,
    incluirSoftwarePorPeriodos: false,
    incluirDetalleDocentes: false,
    incluirEstadisticasCobertura: false,
    incluirRecomendaciones: true,
    filtros: {},
  });

  const [datosDisponibles, setDatosDisponibles] = useState<DatosDisponibles>({
    tieneEncuestas: false,
    tieneListaDocentes: false,
    tienePlanEstudios: false,
    totalEncuestas: 0,
    totalDocentes: 0,
    totalPeriodos: 0,
    softwareUnico: 0,
    cobertura: 0,
  });

  const [vistaPreviaActiva, setVistaPreviaActiva] = useState<
    "configuracion" | "preview"
  >("configuracion");
  const [generandoPDF, setGenerandoPDF] = useState<boolean>(false);

  // Analizar datos disponibles
  useEffect(() => {
    const softwareUnico = new Map<string, string>();

    encuestas.forEach((encuesta) => {
      [
        encuesta.software_windows,
        encuesta.software_ubuntu,
        encuesta.software_recomendado,
      ].forEach((software) => {
        if (software && software !== "Ninguno" && software !== "Ninguna") {
          software.split(",").forEach((s: string) => {
            const trimmed = s.trim();
            if (trimmed) {
              // Normalizar y usar como clave para evitar duplicados
              const softwareNormalizado = normalizarNombreSoftware(trimmed);
              const softwareKey = softwareNormalizado.toLowerCase();

              // Mantener la primera versión encontrada (con su capitalización original)
              if (!softwareUnico.has(softwareKey)) {
                softwareUnico.set(softwareKey, trimmed);
              }
            }
          });
        }
      });
    });

    // Calcular cobertura si hay plan de estudios
    let cobertura = 0;
    if (planEstudios) {
      const totalAsignaturas = Object.values(planEstudios.periodos).reduce(
        (acc, periodo) => acc + periodo.asignaturas.length,
        0
      );

      const asignaturasConEncuesta = new Set(
        encuestas.map((e) => e.asignatura?.toLowerCase().trim())
      ).size;

      cobertura =
        totalAsignaturas > 0
          ? (asignaturasConEncuesta / totalAsignaturas) * 100
          : 0;
    }

    setDatosDisponibles({
      tieneEncuestas: encuestas.length > 0,
      tieneListaDocentes: listaDocentes.length > 0,
      tienePlanEstudios: !!planEstudios,
      totalEncuestas: encuestas.length,
      totalDocentes: listaDocentes.length,
      totalPeriodos: planEstudios
        ? Object.keys(planEstudios.periodos).length
        : 0,
      softwareUnico: softwareUnico.size,
      cobertura: Math.round(cobertura),
    });

    // Configuración automática basada en datos disponibles
    setConfiguracion((prev) => ({
      ...prev,
      incluirSoftwarePorPeriodos: !!planEstudios,
      incluirDetalleDocentes: encuestas.length > 0,
      incluirEstadisticasCobertura: !!planEstudios && listaDocentes.length > 0,
    }));
  }, [encuestas, listaDocentes, planEstudios]);

  // Generar datos para el reporte
  const generarDatosReporte = () => {
    const datos: any = {
      metadatos: {
        fechaGeneracion: new Date().toLocaleDateString("es-ES"),
        horaGeneracion: new Date().toLocaleTimeString("es-ES"),
        ...datosDisponibles,
      },
    };

    if (configuracion.incluirResumenGeneral) {
      datos.resumenGeneral = {
        totalEncuestas: datosDisponibles.totalEncuestas,
        softwareUnico: datosDisponibles.softwareUnico,
        cobertura: datosDisponibles.cobertura,
        carrera: planEstudios?.carrera || "No especificada",
      };
    }

    if (configuracion.incluirSoftwarePorPeriodos && planEstudios) {
      datos.softwarePorPeriodos = organizarSoftwarePorPeriodos();
    }

    if (configuracion.incluirDetalleDocentes) {
      datos.detalleDocentes = organizarDetalleDocentes();
    }

    if (configuracion.incluirEstadisticasCobertura && planEstudios) {
      datos.estadisticasCobertura = calcularEstadisticasCobertura();
    }

    if (configuracion.incluirRecomendaciones) {
      datos.recomendaciones = extraerRecomendaciones();
    }

    return datos;
  };

  const normalizarNombre = (nombre: string): string => {
    return nombre
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
      .replace(/[^\w\s]/g, "") // Eliminar caracteres especiales
      .replace(/\s+/g, " "); // Normalizar espacios
  };

  // Función para encontrar coincidencias entre nombres de encuestas y plan de estudios
  const encontrarCoincidenciaAsignatura = (
    nombreEncuesta: string
  ): string | null => {
    if (!planEstudios || !nombreEncuesta) return null;

    const nombreNormalizado = normalizarNombre(nombreEncuesta);

    for (const [periodoId, periodo] of Object.entries(planEstudios.periodos)) {
      // Expandir todas las asignaturas incluyendo las opciones de electivas
      const asignaturasDelPeriodo = periodo.asignaturas.flatMap((asig) => {
        if (asig.es_electiva && asig.opciones) {
          // Si es electiva, devolver todas las opciones
          return asig.opciones.map((opcion: { nombre: any }) => opcion.nombre);
        }
        // Si no es electiva, devolver la asignatura normal
        return [asig.nombre];
      });

      // Buscar coincidencia exacta primero
      for (const nombreAsignatura of asignaturasDelPeriodo) {
        if (normalizarNombre(nombreAsignatura) === nombreNormalizado) {
          return nombreAsignatura;
        }
      }
    }

    return null;
  };

  const normalizarNombreSoftware = (nombreSoftware: string): string => {
    if (!nombreSoftware) return "";

    return nombreSoftware
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
      .replace(/\s+/g, " ") // Normalizar espacios múltiples
      .trim();
  };

  // Organizar software por períodos
  const organizarSoftwarePorPeriodos = () => {
    const softwarePorPeriodo: any = {};

    encuestas.forEach((encuesta) => {
      const nombreAsignaturaOriginal = encuesta.asignatura || "Sin especificar";
      const asignaturaOficial = encontrarCoincidenciaAsignatura(
        nombreAsignaturaOriginal
      );
      const nombreAsignaturaFinal =
        asignaturaOficial || nombreAsignaturaOriginal;

      const periodo =
        obtenerPeriodoDeAsignatura(nombreAsignaturaFinal) || "Sin clasificar";

      if (!softwarePorPeriodo[periodo]) {
        softwarePorPeriodo[periodo] = {};
      }

      // Usar el nombre original si no se encontró coincidencia, pero indicarlo
      const nombreParaMostrar =
        asignaturaOficial || `${nombreAsignaturaOriginal} (*)`;

      if (!softwarePorPeriodo[periodo][nombreParaMostrar]) {
        softwarePorPeriodo[periodo][nombreParaMostrar] = new Map();
      }

      [
        encuesta.software_windows,
        encuesta.software_ubuntu,
        encuesta.software_recomendado,
      ].forEach((software) => {
        if (software && software !== "Ninguno" && software !== "Ninguna") {
          software.split(",").forEach((s: string) => {
            const trimmed = s.trim();
            if (trimmed) {
              // Normalizar el nombre del software para evitar duplicados
              const softwareNormalizado = normalizarNombreSoftware(trimmed);
              const softwareKey = softwareNormalizado.toLowerCase();

              // Usar el Map para evitar duplicados, manteniendo la primera versión encontrada
              if (
                !softwarePorPeriodo[periodo][nombreParaMostrar].has(softwareKey)
              ) {
                softwarePorPeriodo[periodo][nombreParaMostrar].set(
                  softwareKey,
                  trimmed
                );
              }
            }
          });
        }
      });
    });

    // Convertir Sets a Arrays y ordenar períodos
    const periodosOrdenados: any = {};

    // Definir orden de períodos
    const ordenPeriodos = [
      "PERIODO DE FORMACIÓN 1",
      "PERIODO DE FORMACIÓN 2",
      "PERIODO DE FORMACIÓN 3",
      "PERIODO DE FORMACIÓN 4",
      "PERIODO DE FORMACIÓN 5",
      "PERIODO DE FORMACIÓN 6",
      "COMPONENTE PROPEDÉUTICO",
      "PERIODO DE FORMACIÓN 7",
      "PERIODO DE FORMACIÓN 8",
      "PERIODO DE FORMACIÓN 9",
      "PERIODO DE FORMACIÓN 10",
      "Sin clasificar",
    ];

    // Reorganizar según el orden definido
    ordenPeriodos.forEach((nombrePeriodo) => {
      if (softwarePorPeriodo[nombrePeriodo]) {
        periodosOrdenados[nombrePeriodo] = {};
        Object.keys(softwarePorPeriodo[nombrePeriodo]).forEach((asignatura) => {
          const softwareArray = Array.from(
            softwarePorPeriodo[nombrePeriodo][asignatura].values()
          ).sort((a: any, b: any) =>
            a.toLowerCase().localeCompare(b.toLowerCase())
          );
          periodosOrdenados[nombrePeriodo][asignatura] = softwareArray;
        });
      }
    });

    // Añadir cualquier período que no esté en la lista predefinida
    Object.keys(softwarePorPeriodo).forEach((periodo) => {
      if (!ordenPeriodos.includes(periodo)) {
        periodosOrdenados[periodo] = {};
        Object.keys(softwarePorPeriodo[periodo]).forEach((asignatura) => {
          const softwareArray = Array.from(
            softwarePorPeriodo[periodo][asignatura].values()
          ).sort((a: any, b: any) =>
            a.toLowerCase().localeCompare(b.toLowerCase())
          );
          periodosOrdenados[periodo][asignatura] = softwareArray;
        });
      }
    });

    return periodosOrdenados;
  };

  // Organizar detalle de docentes
  const organizarDetalleDocentes = () => {
    return encuestas.map((encuesta) => ({
      nombre: encuesta.nombre_docente || "Sin especificar",
      asignatura: encuesta.asignatura || "Sin especificar",
      semestre: encuesta.semestre || "Sin especificar",
      softwareWindows: encuesta.software_windows || "Ninguno",
      softwareUbuntu: encuesta.software_ubuntu || "Ninguno",
      softwareRecomendado: encuesta.software_recomendado || "Ninguno",
      dispositivosAdicionales: encuesta.dispositivos_adicionales || "Ninguno",
      recomendaciones: encuesta.recomendaciones || "Ninguna",
    }));
  };

  // Calcular estadísticas de cobertura
  const calcularEstadisticasCobertura = () => {
    if (!planEstudios) return {};

    const estadisticas: any = {};
    const docentesEncuestados = new Set(
      encuestas.map((e) => e.nombre_docente?.toLowerCase().trim())
    );

    Object.entries(planEstudios.periodos).forEach(([periodoId, periodo]) => {
      const asignaturasDelPeriodo = periodo.asignaturas.map((a) => a.nombre);
      const asignaturasConEncuesta = asignaturasDelPeriodo.filter((asig) =>
        encuestas.some(
          (e) =>
            e.asignatura?.toLowerCase().trim() === asig.toLowerCase().trim()
        )
      );

      estadisticas[periodo.nombre] = {
        totalAsignaturas: asignaturasDelPeriodo.length,
        asignaturasConEncuesta: asignaturasConEncuesta.length,
        cobertura:
          (asignaturasConEncuesta.length / asignaturasDelPeriodo.length) * 100,
      };
    });

    estadisticas.resumenGeneral = {
      totalDocentes: listaDocentes.length,
      docentesEncuestados: docentesEncuestados.size,
      coberturaDocentes:
        (docentesEncuestados.size / listaDocentes.length) * 100,
    };

    return estadisticas;
  };

  // Extraer recomendaciones
  const extraerRecomendaciones = () => {
    const recomendaciones = encuestas
      .filter((e) => e.recomendaciones && e.recomendaciones !== "Ninguna")
      .map((e) => ({
        docente: e.nombre_docente,
        asignatura: e.asignatura,
        recomendacion: e.recomendaciones,
      }));

    const dispositivosAdicionales = encuestas
      .filter(
        (e) =>
          e.dispositivos_adicionales && e.dispositivos_adicionales !== "Ninguno"
      )
      .map((e) => ({
        docente: e.nombre_docente,
        asignatura: e.asignatura,
        dispositivos: e.dispositivos_adicionales,
      }));

    return {
      recomendacionesGenerales: recomendaciones,
      dispositivosAdicionales: dispositivosAdicionales,
    };
  };

  // Función auxiliar para obtener período de asignatura
  const obtenerPeriodoDeAsignatura = (
    nombreAsignatura: string
  ): string | null => {
    if (!planEstudios || !nombreAsignatura) return null;

    const nombreNormalizado = normalizarNombre(nombreAsignatura);

    for (const [periodoId, periodo] of Object.entries(planEstudios.periodos)) {
      // Expandir todas las asignaturas incluyendo las opciones de electivas
      const asignaturasDelPeriodo = periodo.asignaturas.flatMap((asig) => {
        if (asig.es_electiva && asig.opciones) {
          // Si es electiva, devolver todas las opciones
          return asig.opciones.map((opcion: { nombre: any }) => ({
            nombre: opcion.nombre,
            periodo: periodo.nombre,
          }));
        }
        // Si no es electiva, devolver la asignatura normal
        return [
          {
            nombre: asig.nombre,
            periodo: periodo.nombre,
          },
        ];
      });

      // Buscar coincidencia exacta primero
      for (const asignatura of asignaturasDelPeriodo) {
        if (normalizarNombre(asignatura.nombre) === nombreNormalizado) {
          return periodo.nombre;
        }
      }
    }

    console.log(`No se encontró período para: "${nombreAsignatura}"`);
    return null;
  };

  // Generar PDF
  const generarPDF = async () => {
    setGenerandoPDF(true);

    try {
      const doc = new jsPDF();
      const datos = generarDatosReporte();

      // Configuración del documento
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;
      let yPosition = margin;

      // Función para añadir nueva página si es necesario
      const checkNewPage = (requiredSpace = 30) => {
        if (yPosition + requiredSpace > doc.internal.pageSize.height - margin) {
          doc.addPage();
          yPosition = margin;
        }
      };

      // Título principal
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text(
        "Reporte de Análisis de Software Educativo",
        pageWidth / 2,
        yPosition,
        { align: "center" }
      );
      yPosition += 15;

      // Información general
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Generado el: ${datos.metadatos.fechaGeneracion} a las ${datos.metadatos.horaGeneracion}`,
        margin,
        yPosition
      );
      yPosition += 10;

      if (planEstudios) {
        doc.text(`Carrera: ${planEstudios.carrera}`, margin, yPosition);
        yPosition += 10;
      }

      yPosition += 10;

      // Resumen general
      if (configuracion.incluirResumenGeneral && datos.resumenGeneral) {
        checkNewPage(50);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Resumen General", margin, yPosition);
        yPosition += 15;

        const resumenData = [
          ["Métrica", "Valor"],
          [
            "Total de encuestas",
            datos.resumenGeneral.totalEncuestas.toString(),
          ],
          [
            "Software único identificado",
            datos.resumenGeneral.softwareUnico.toString(),
          ],
          [
            "Cobertura del plan de estudios",
            `${datos.resumenGeneral.cobertura}%`,
          ],
        ];

        autoTable(doc, {
          startY: yPosition,
          head: [resumenData[0]],
          body: resumenData.slice(1),
          margin: { left: margin, right: margin },
          styles: { fontSize: 10 },
          theme: "grid",
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      // Software por períodos
      if (
        configuracion.incluirSoftwarePorPeriodos &&
        datos.softwarePorPeriodos
      ) {
        checkNewPage(50);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Software por Períodos Académicos", margin, yPosition);
        yPosition += 15;

        Object.entries(datos.softwarePorPeriodos).forEach(
          ([periodo, asignaturas]: [string, any]) => {
            checkNewPage(40);
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text(periodo, margin, yPosition);
            yPosition += 10;

            const softwareData = [["Asignatura", "Software Utilizado"]];

            Object.entries(asignaturas).forEach(
              ([asignatura, software]: [string, any]) => {
                softwareData.push([
                  asignatura,
                  Array.isArray(software)
                    ? software.join(", ")
                    : software.toString(),
                ]);
              }
            );

            autoTable(doc, {
              startY: yPosition,
              head: [softwareData[0]],
              body: softwareData.slice(1),
              margin: { left: margin, right: margin },
              styles: { fontSize: 9, cellPadding: 3 },
              columnStyles: {
                0: { cellWidth: 60 },
                1: { cellWidth: "auto" },
              },
              theme: "striped",
            });

            yPosition = (doc as any).lastAutoTable.finalY + 10;
          }
        );
      }

      // Detalle de docentes
      if (configuracion.incluirDetalleDocentes && datos.detalleDocentes) {
        checkNewPage(50);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Detalle por Docente", margin, yPosition);
        yPosition += 15;

        const docentesData = [
          [
            "Docente",
            "Asignatura",
            "Software Windows",
            "Software Ubuntu",
            "Recomendado",
          ],
        ];

        const docentesDataTransformed = datos.detalleDocentes
          .map((docente: any) => [
            docente.nombre,
            docente.asignatura,
            docente.softwareWindows !== "Ninguno"
              ? docente.softwareWindows
              : "-",
            docente.softwareUbuntu !== "Ninguno" ? docente.softwareUbuntu : "-",
            docente.softwareRecomendado !== "Ninguno"
              ? docente.softwareRecomendado
              : "-",
          ])

        docentesData.push(...docentesDataTransformed);

        autoTable(doc, {
          startY: yPosition,
          head: [docentesData[0]],
          body: docentesData.slice(1),
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 40 },
            2: { cellWidth: 35 },
            3: { cellWidth: 35 },
            4: { cellWidth: 35 },
          },
          theme: "grid",
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      // Estadísticas de cobertura
      if (
        configuracion.incluirEstadisticasCobertura &&
        datos.estadisticasCobertura
      ) {
        checkNewPage(50);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Estadísticas de Cobertura", margin, yPosition);
        yPosition += 15;

        const coberturaData = [
          ["Período", "Asignaturas Totales", "Con Encuesta", "Cobertura %"],
        ];

        Object.entries(datos.estadisticasCobertura).forEach(
          ([periodo, stats]: [string, any]) => {
            if (periodo !== "resumenGeneral") {
              coberturaData.push([
                periodo,
                stats.totalAsignaturas.toString(),
                stats.asignaturasConEncuesta.toString(),
                `${Math.round(stats.cobertura)}%`,
              ]);
            }
          }
        );

        autoTable(doc, {
          startY: yPosition,
          head: [coberturaData[0]],
          body: coberturaData.slice(1),
          margin: { left: margin, right: margin },
          styles: { fontSize: 10 },
          theme: "grid",
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      // Recomendaciones
      if (configuracion.incluirRecomendaciones && datos.recomendaciones) {
        checkNewPage(50);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Recomendaciones y Sugerencias", margin, yPosition);
        yPosition += 15;

        if (datos.recomendaciones.recomendacionesGenerales.length > 0) {
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text("Recomendaciones de Docentes:", margin, yPosition);
          yPosition += 10;

          datos.recomendaciones.recomendacionesGenerales.forEach(
            (rec: any, index: number) => {
              checkNewPage(25);
              doc.setFontSize(10);
              doc.setFont("helvetica", "bold");
              doc.text(
                `${index + 1}. ${rec.docente} (${rec.asignatura}):`,
                margin,
                yPosition
              );
              yPosition += 7;

              doc.setFont("helvetica", "normal");
              const lines = doc.splitTextToSize(
                rec.recomendacion,
                pageWidth - margin * 2
              );
              doc.text(lines, margin + 10, yPosition);
              yPosition += lines.length * 5 + 5;
            }
          );
        }

        if (datos.recomendaciones.dispositivosAdicionales.length > 0) {
          checkNewPage(30);
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text("Dispositivos Adicionales Solicitados:", margin, yPosition);
          yPosition += 10;

          datos.recomendaciones.dispositivosAdicionales.forEach(
            (disp: any, index: number) => {
              checkNewPage(20);
              doc.setFontSize(10);
              doc.setFont("helvetica", "bold");
              doc.text(
                `${index + 1}. ${disp.docente} (${disp.asignatura}):`,
                margin,
                yPosition
              );
              yPosition += 7;

              doc.setFont("helvetica", "normal");
              const lines = doc.splitTextToSize(
                disp.dispositivos,
                pageWidth - margin * 2
              );
              doc.text(lines, margin + 10, yPosition);
              yPosition += lines.length * 5 + 5;
            }
          );
        }
      }

      // Guardar PDF
      const fileName = `reporte-software-educativo-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Error generando PDF:", error);
      alert("Error al generar el PDF. Por favor, intenta de nuevo.");
    } finally {
      setGenerandoPDF(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Exportar Reporte a PDF</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Pestañas */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setVistaPreviaActiva("configuracion")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  vistaPreviaActiva === "configuracion"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Configuración
              </button>
              <button
                onClick={() => setVistaPreviaActiva("preview")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  vistaPreviaActiva === "preview"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Vista Previa
              </button>
            </nav>
          </div>
        </div>

        {/* Contenido de configuración */}
        {vistaPreviaActiva === "configuracion" && (
          <div className="space-y-6">
            {/* Estado de datos disponibles */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Datos Disponibles</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div
                  className={`p-3 rounded ${
                    datosDisponibles.tieneEncuestas
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  <p className="font-medium">Encuestas</p>
                  <p>{datosDisponibles.totalEncuestas} registros</p>
                </div>
                <div
                  className={`p-3 rounded ${
                    datosDisponibles.tieneListaDocentes
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  <p className="font-medium">Lista Docentes</p>
                  <p>{datosDisponibles.totalDocentes} docentes</p>
                </div>
                <div
                  className={`p-3 rounded ${
                    datosDisponibles.tienePlanEstudios
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  <p className="font-medium">Plan de Estudios</p>
                  <p>{datosDisponibles.totalPeriodos} períodos</p>
                </div>
              </div>
            </div>

            {/* Opciones de configuración */}
            <div className="space-y-4">
              <h3 className="font-semibold">Secciones a Incluir</h3>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={configuracion.incluirResumenGeneral}
                    onChange={(e) =>
                      setConfiguracion((prev) => ({
                        ...prev,
                        incluirResumenGeneral: e.target.checked,
                      }))
                    }
                    className="mr-3"
                  />
                  <div>
                    <span className="font-medium">Resumen General</span>
                    <p className="text-sm text-gray-600">
                      Estadísticas básicas del análisis
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-center ${
                    !datosDisponibles.tienePlanEstudios ? "opacity-50" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={configuracion.incluirSoftwarePorPeriodos}
                    onChange={(e) =>
                      setConfiguracion((prev) => ({
                        ...prev,
                        incluirSoftwarePorPeriodos: e.target.checked,
                      }))
                    }
                    disabled={!datosDisponibles.tienePlanEstudios}
                    className="mr-3"
                  />
                  <div>
                    <span className="font-medium">Software por Períodos</span>
                    <p className="text-sm text-gray-600">
                      Vista jerárquica organizaada por períodos académicos
                    </p>
                    {!datosDisponibles.tienePlanEstudios && (
                      <p className="text-xs text-red-600">
                        Requiere plan de estudios
                      </p>
                    )}
                  </div>
                </label>

                <label
                  className={`flex items-center ${
                    !datosDisponibles.tieneEncuestas ? "opacity-50" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={configuracion.incluirDetalleDocentes}
                    onChange={(e) =>
                      setConfiguracion((prev) => ({
                        ...prev,
                        incluirDetalleDocentes: e.target.checked,
                      }))
                    }
                    disabled={!datosDisponibles.tieneEncuestas}
                    className="mr-3"
                  />
                  <div>
                    <span className="font-medium">Detalle por Docente</span>
                    <p className="text-sm text-gray-600">
                      Información completa de cada docente encuestado
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-center ${
                    !datosDisponibles.tienePlanEstudios ||
                    !datosDisponibles.tieneListaDocentes
                      ? "opacity-50"
                      : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={configuracion.incluirEstadisticasCobertura}
                    onChange={(e) =>
                      setConfiguracion((prev) => ({
                        ...prev,
                        incluirEstadisticasCobertura: e.target.checked,
                      }))
                    }
                    disabled={
                      !datosDisponibles.tienePlanEstudios ||
                      !datosDisponibles.tieneListaDocentes
                    }
                    className="mr-3"
                  />
                  <div>
                    <span className="font-medium">
                      Estadísticas de Cobertura
                    </span>
                    <p className="text-sm text-gray-600">
                      Análisis de qué tan completa está la recolección de datos
                    </p>
                    {(!datosDisponibles.tienePlanEstudios ||
                      !datosDisponibles.tieneListaDocentes) && (
                      <p className="text-xs text-red-600">
                        Requiere plan de estudios y lista de docentes
                      </p>
                    )}
                  </div>
                </label>

                <label
                  className={`flex items-center ${
                    !datosDisponibles.tieneEncuestas ? "opacity-50" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={configuracion.incluirRecomendaciones}
                    onChange={(e) =>
                      setConfiguracion((prev) => ({
                        ...prev,
                        incluirRecomendaciones: e.target.checked,
                      }))
                    }
                    disabled={!datosDisponibles.tieneEncuestas}
                    className="mr-3"
                  />
                  <div>
                    <span className="font-medium">
                      Recomendaciones y Sugerencias
                    </span>
                    <p className="text-sm text-gray-600">
                      Comentarios y dispositivos adicionales solicitados
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Vista previa */}
        {vistaPreviaActiva === "preview" && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300">
              <h3 className="font-semibold mb-3">Vista Previa del Reporte</h3>

              <div className="space-y-3 text-sm">
                <div className="bg-white p-3 rounded border">
                  <h4 className="font-medium text-blue-700">
                    📋 Portada del Reporte
                  </h4>
                  <p className="text-gray-600 mt-1">
                    • Título: "Reporte de Análisis de Software Educativo"
                    <br />• Fecha de generación:{" "}
                    {new Date().toLocaleDateString("es-ES")}
                    <br />
                    {planEstudios && `• Carrera: ${planEstudios.carrera}`}
                  </p>
                </div>

                {configuracion.incluirResumenGeneral && (
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-medium text-green-700">
                      📊 Resumen General
                    </h4>
                    <div className="text-gray-600 mt-1 grid grid-cols-2 gap-2">
                      <span>
                        • Total encuestas: {datosDisponibles.totalEncuestas}
                      </span>
                      <span>
                        • Software único: {datosDisponibles.softwareUnico}
                      </span>
                      <span>• Cobertura: {datosDisponibles.cobertura}%</span>
                      <span>• Períodos: {datosDisponibles.totalPeriodos}</span>
                    </div>
                  </div>
                )}

                {configuracion.incluirSoftwarePorPeriodos &&
                  datosDisponibles.tienePlanEstudios && (
                    <div className="bg-white p-3 rounded border">
                      <h4 className="font-medium text-purple-700">
                        🗂️ Software por Períodos
                      </h4>
                      <p className="text-gray-600 mt-1">
                        • Vista jerárquica organizada por períodos académicos
                        <br />
                        • Tabla detallada: Asignatura → Software utilizado
                        <br />• {datosDisponibles.totalPeriodos} períodos
                        incluidos
                      </p>
                    </div>
                  )}

                {configuracion.incluirDetalleDocentes &&
                  datosDisponibles.tieneEncuestas && (
                    <div className="bg-white p-3 rounded border">
                      <h4 className="font-medium text-orange-700">
                        👥 Detalle por Docente
                      </h4>
                      <p className="text-gray-600 mt-1">
                        • Tabla completa con {datosDisponibles.totalEncuestas}{" "}
                        registros
                        <br />
                        • Columnas: Docente, Asignatura, Software Windows,
                        Ubuntu, Recomendado
                        <br />• Incluye dispositivos adicionales y
                        recomendaciones
                      </p>
                    </div>
                  )}

                {configuracion.incluirEstadisticasCobertura &&
                  datosDisponibles.tienePlanEstudios &&
                  datosDisponibles.tieneListaDocentes && (
                    <div className="bg-white p-3 rounded border">
                      <h4 className="font-medium text-teal-700">
                        📈 Estadísticas de Cobertura
                      </h4>
                      <p className="text-gray-600 mt-1">
                        • Análisis de cobertura por período académico
                        <br />
                        • Comparación: Asignaturas totales vs. encuestadas
                        <br />• Cobertura de docentes:{" "}
                        {Math.round(
                          (encuestas.length / datosDisponibles.totalDocentes) *
                            100
                        )}
                        %
                      </p>
                    </div>
                  )}

                {configuracion.incluirRecomendaciones &&
                  datosDisponibles.tieneEncuestas && (
                    <div className="bg-white p-3 rounded border">
                      <h4 className="font-medium text-red-700">
                        💡 Recomendaciones
                      </h4>
                      <p className="text-gray-600 mt-1">
                        • Recomendaciones generales de docentes
                        <br />
                        • Dispositivos adicionales solicitados
                        <br />• Sugerencias para mejoras en laboratorios
                      </p>
                    </div>
                  )}

                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <h4 className="font-medium text-blue-700">
                    📄 Estimación del Documento
                  </h4>
                  <div className="text-gray-600 mt-1 grid grid-cols-2 gap-2 text-xs">
                    <span>
                      • Páginas estimadas: {calcularPaginasEstimadas()}
                    </span>
                    <span>
                      • Secciones incluidas: {contarSeccionesActivas()}
                    </span>
                    <span>• Formato: PDF con tablas</span>
                    <span>• Tamaño aprox: {calcularTamañoEstimado()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Advertencias si faltan datos */}
            {(!datosDisponibles.tieneEncuestas ||
              (!datosDisponibles.tienePlanEstudios &&
                configuracion.incluirSoftwarePorPeriodos)) && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">
                  ⚠️ Advertencias
                </h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {!datosDisponibles.tieneEncuestas && (
                    <li>
                      • No hay encuestas cargadas. El reporte será muy limitado.
                    </li>
                  )}
                  {!datosDisponibles.tienePlanEstudios &&
                    configuracion.incluirSoftwarePorPeriodos && (
                      <li>
                        • Falta el plan de estudios para la vista jerárquica por
                        períodos.
                      </li>
                    )}
                  {!datosDisponibles.tieneListaDocentes &&
                    configuracion.incluirEstadisticasCobertura && (
                      <li>
                        • Falta la lista de docentes para estadísticas de
                        cobertura completas.
                      </li>
                    )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Botones de acción */}
        <div className="mt-6 flex justify-between">
          <button
            onClick={onClose}
            className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
          >
            Cancelar
          </button>

          <div className="space-x-3">
            {vistaPreviaActiva === "configuracion" && (
              <button
                onClick={() => setVistaPreviaActiva("preview")}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                Ver Vista Previa
              </button>
            )}

            <button
              onClick={generarPDF}
              disabled={generandoPDF || !datosDisponibles.tieneEncuestas}
              className={`px-6 py-2 rounded font-medium ${
                generandoPDF || !datosDisponibles.tieneEncuestas
                  ? "bg-gray-400 cursor-not-allowed text-gray-600"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              {generandoPDF ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin h-4 w-4 mr-2"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Generando PDF...
                </span>
              ) : (
                <span className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Descargar PDF
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Funciones auxiliares para la vista previa
  function calcularPaginasEstimadas(): number {
    let paginas = 1; // Página de portada

    if (configuracion.incluirResumenGeneral) paginas += 1;
    if (
      configuracion.incluirSoftwarePorPeriodos &&
      datosDisponibles.tienePlanEstudios
    ) {
      paginas += Math.ceil(datosDisponibles.totalPeriodos / 2);
    }
    if (
      configuracion.incluirDetalleDocentes &&
      datosDisponibles.tieneEncuestas
    ) {
      paginas += Math.ceil(datosDisponibles.totalEncuestas / 15); // ~15 registros por página
    }
    if (configuracion.incluirEstadisticasCobertura) paginas += 1;
    if (configuracion.incluirRecomendaciones) paginas += 1;

    return paginas;
  }

  function contarSeccionesActivas(): number {
    return [
      configuracion.incluirResumenGeneral,
      configuracion.incluirSoftwarePorPeriodos &&
        datosDisponibles.tienePlanEstudios,
      configuracion.incluirDetalleDocentes && datosDisponibles.tieneEncuestas,
      configuracion.incluirEstadisticasCobertura &&
        datosDisponibles.tienePlanEstudios &&
        datosDisponibles.tieneListaDocentes,
      configuracion.incluirRecomendaciones && datosDisponibles.tieneEncuestas,
    ].filter(Boolean).length;
  }

  function calcularTamañoEstimado(): string {
    const paginas = calcularPaginasEstimadas();
    const kbPorPagina = 50; // Estimación conservadora
    const totalKb = paginas * kbPorPagina;

    if (totalKb < 1024) {
      return `${totalKb} KB`;
    } else {
      return `${(totalKb / 1024).toFixed(1)} MB`;
    }
  }
}
