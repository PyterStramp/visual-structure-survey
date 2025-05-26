// components/ResumenSoftware.tsx

"use client";

import React, { useEffect, useState } from "react";

interface Software {
  nombre: string;
  windowsCount: number;
  ubuntuCount: number;
  recomendadoCount: number;
}

interface Asignatura {
  codigo: string;
  nombre: string;
  creditos: number;
  htd: number;
  htc: number;
  hta: number;
  clasificacion: string;
  es_electiva: boolean;
  grupo_electiva?: string;
  opciones?: Asignatura[];
}

interface Periodo {
  nombre: string;
  asignaturas: Asignatura[];
  total_creditos: number;
}

export interface PlanEstudios {
  carrera: string;
  plan_estudios: string;
  estructura: {
    tecnologia: string;
    componente_propedeutico: string;
    ingenieria: string;
  };
  periodos: {
    [periodoId: string]: Periodo;
  };
}

interface SoftwarePorAsignatura {
  [asignatura: string]: Software[];
}

interface SoftwarePorPeriodo {
  [periodo: string]: SoftwarePorAsignatura;
}

interface EstadisticasPeriodo {
  totalAsignaturas: number;
  asignaturasConEncuesta: number;
  asignaturasSinEncuesta: string[];
  softwareUnico: number;
}

interface ResumenSoftwareProps {
  encuestas: any[];
  planEstudios?: PlanEstudios;
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "jerarquico" | "global" | "cobertura";

export function ResumenSoftware({
  encuestas,
  planEstudios,
  isOpen,
  onClose,
}: ResumenSoftwareProps) {
  const [softwareGlobal, setSoftwareGlobal] = useState<Software[]>([]);
  const [softwarePorPeriodo, setSoftwarePorPeriodo] =
    useState<SoftwarePorPeriodo>({});
  const [estadisticasPorPeriodo, setEstadisticasPorPeriodo] = useState<{
    [periodo: string]: EstadisticasPeriodo;
  }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [activeTab, setActiveTab] = useState<TabType>("jerarquico");
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string>("");
  const [asignaturaSeleccionada, setAsignaturaSeleccionada] =
    useState<string>("");

  // Función para normalizar nombres de asignaturas/materias para hacer matching
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
    if (!planEstudios) return null;

    const nombreNormalizado = normalizarNombre(nombreEncuesta);

    for (const [periodoId, periodo] of Object.entries(planEstudios.periodos)) {
      for (const asignatura of periodo.asignaturas) {
        // Verificar asignatura principal
        if (normalizarNombre(asignatura.nombre) === nombreNormalizado) {
          return asignatura.nombre;
        }

        // Verificar opciones de electivas
        if (asignatura.es_electiva && asignatura.opciones) {
          for (const opcion of asignatura.opciones) {
            if (normalizarNombre(opcion.nombre) === nombreNormalizado) {
              return opcion.nombre;
            }
          }
        }
      }
    }

    return null;
  };

  // Función para obtener el período de una asignatura
  const obtenerPeriodoDeAsignatura = (
    nombreAsignatura: string
  ): string | null => {
    if (!planEstudios) return null;

    const nombreNormalizado = normalizarNombre(nombreAsignatura);

    for (const [periodoId, periodo] of Object.entries(planEstudios.periodos)) {
      for (const asignatura of periodo.asignaturas) {
        if (normalizarNombre(asignatura.nombre) === nombreNormalizado) {
          return periodoId;
        }

        if (asignatura.es_electiva && asignatura.opciones) {
          for (const opcion of asignatura.opciones) {
            if (normalizarNombre(opcion.nombre) === nombreNormalizado) {
              return periodoId;
            }
          }
        }
      }
    }

    return null;
  };

  useEffect(() => {
    if (!encuestas || encuestas.length === 0) {
      setSoftwareGlobal([]);
      setSoftwarePorPeriodo({});
      setEstadisticasPorPeriodo({});
      setLoading(false);
      return;
    }

    // Procesar software global
    const softwareMapGlobal = new Map<string, Software>();

    // Procesar software por período y asignatura
    const softwarePorPeriodoMap: SoftwarePorPeriodo = {};
    const encuestasPorAsignatura = new Map<string, number>();

    encuestas.forEach((encuesta) => {
      const nombreAsignaturaEncuesta = encuesta.asignatura || "Sin definir";
      const asignaturaOficial = encontrarCoincidenciaAsignatura(
        nombreAsignaturaEncuesta
      );
      const nombreAsignaturaFinal =
        asignaturaOficial || nombreAsignaturaEncuesta;

      // Contar encuestas por asignatura
      encuestasPorAsignatura.set(
        nombreAsignaturaFinal,
        (encuestasPorAsignatura.get(nombreAsignaturaFinal) || 0) + 1
      );

      let periodo = "Sin clasificar";

      if (planEstudios) {
        const periodoEncontrado = obtenerPeriodoDeAsignatura(
          nombreAsignaturaFinal
        );
        if (periodoEncontrado) {
          periodo = planEstudios.periodos[periodoEncontrado].nombre;
        }
      }

      // Inicializar estructura si no existe
      if (!softwarePorPeriodoMap[periodo]) {
        softwarePorPeriodoMap[periodo] = {};
      }
      if (!softwarePorPeriodoMap[periodo][nombreAsignaturaFinal]) {
        softwarePorPeriodoMap[periodo][nombreAsignaturaFinal] = [];
      }

      // Procesar software para vista global
      procesarSoftware(
        encuesta.software_windows || encuesta.softwareWindows,
        softwareMapGlobal,
        "windows"
      );
      procesarSoftware(
        encuesta.software_ubuntu || encuesta.softwareUbuntu,
        softwareMapGlobal,
        "ubuntu"
      );
      procesarSoftware(
        encuesta.software_recomendado || encuesta.softwareRecomendado,
        softwareMapGlobal,
        "recomendado"
      );

      // Procesar software para vista jerárquica
      const softwareAsignatura = new Map<string, Software>();
      procesarSoftware(
        encuesta.software_windows || encuesta.softwareWindows,
        softwareAsignatura,
        "windows"
      );
      procesarSoftware(
        encuesta.software_ubuntu || encuesta.softwareUbuntu,
        softwareAsignatura,
        "ubuntu"
      );
      procesarSoftware(
        encuesta.software_recomendado || encuesta.softwareRecomendado,
        softwareAsignatura,
        "recomendado"
      );

      // Convertir y mergear con software existente de la asignatura
      const softwareArray = Array.from(softwareAsignatura.values());
      softwarePorPeriodoMap[periodo][nombreAsignaturaFinal] =
        mergeArraysSoftware(
          softwarePorPeriodoMap[periodo][nombreAsignaturaFinal],
          softwareArray
        );
    });

    // Calcular estadísticas de cobertura si hay plan de estudios
    const estadisticas: { [periodo: string]: EstadisticasPeriodo } = {};

    if (planEstudios) {
      for (const [periodoId, periodo] of Object.entries(
        planEstudios.periodos
      )) {
        const asignaturasDelPeriodo = periodo.asignaturas.flatMap((asig) => {
          if (asig.es_electiva && asig.opciones) {
            return asig.opciones.map((opcion) => opcion.nombre);
          }
          return [asig.nombre];
        });

        const asignaturasConEncuesta = asignaturasDelPeriodo.filter((asig) =>
          encuestasPorAsignatura.has(asig)
        );

        const asignaturasSinEncuesta = asignaturasDelPeriodo.filter(
          (asig) => !encuestasPorAsignatura.has(asig)
        );

        const softwareUnicoCount = softwarePorPeriodoMap[periodo.nombre]
          ? Object.values(softwarePorPeriodoMap[periodo.nombre])
              .flat()
              .reduce((acc, curr) => {
                acc.add(curr.nombre.toLowerCase());
                return acc;
              }, new Set()).size
          : 0;

        estadisticas[periodo.nombre] = {
          totalAsignaturas: asignaturasDelPeriodo.length,
          asignaturasConEncuesta: asignaturasConEncuesta.length,
          asignaturasSinEncuesta,
          softwareUnico: softwareUnicoCount,
        };
      }
    }

    // Convertir y ordenar software global
    const softwareGlobalArray = Array.from(softwareMapGlobal.values());
    sortSoftwareList(softwareGlobalArray, sortDirection);

    setSoftwareGlobal(softwareGlobalArray);
    setSoftwarePorPeriodo(softwarePorPeriodoMap);
    setEstadisticasPorPeriodo(estadisticas);
    setLoading(false);
  }, [encuestas, planEstudios, sortDirection]);

  // Función para procesar software (igual que antes)
  const procesarSoftware = (
    softwareStr: string,
    softwareMap: Map<string, Software>,
    tipo: "windows" | "ubuntu" | "recomendado"
  ) => {
    if (
      !softwareStr ||
      softwareStr === "Ninguno" ||
      softwareStr === "Ninguna"
    ) {
      return;
    }

    const softwares = softwareStr.split(",").map((s) => s.trim());

    softwares.forEach((software) => {
      if (!software) return;

      const sanitizedName = software.toLowerCase().trim();

      if (!softwareMap.has(sanitizedName)) {
        softwareMap.set(sanitizedName, {
          nombre: software.trim(),
          windowsCount: 0,
          ubuntuCount: 0,
          recomendadoCount: 0,
        });
      }

      const softwareEntry = softwareMap.get(sanitizedName)!;

      if (tipo === "windows") {
        softwareEntry.windowsCount++;
      } else if (tipo === "ubuntu") {
        softwareEntry.ubuntuCount++;
      } else if (tipo === "recomendado") {
        softwareEntry.recomendadoCount++;
      }
    });
  };

  // Función para combinar arrays de software
  const mergeArraysSoftware = (
    existing: Software[],
    newSoftware: Software[]
  ): Software[] => {
    const merged = new Map<string, Software>();

    existing.forEach((sw) => {
      merged.set(sw.nombre.toLowerCase(), sw);
    });

    newSoftware.forEach((sw) => {
      const key = sw.nombre.toLowerCase();
      if (merged.has(key)) {
        const existing = merged.get(key)!;
        existing.windowsCount += sw.windowsCount;
        existing.ubuntuCount += sw.ubuntuCount;
        existing.recomendadoCount += sw.recomendadoCount;
      } else {
        merged.set(key, { ...sw });
      }
    });

    return Array.from(merged.values());
  };

  const sortSoftwareList = (list: Software[], direction: "asc" | "desc") => {
    list.sort((a, b) => {
      const totalA = a.windowsCount + a.ubuntuCount + a.recomendadoCount;
      const totalB = b.windowsCount + b.ubuntuCount + b.recomendadoCount;

      return direction === "desc" ? totalB - totalA : totalA - totalB;
    });
  };

  const toggleSortDirection = () => {
    const newDirection = sortDirection === "desc" ? "asc" : "desc";
    setSortDirection(newDirection);
  };

  // Obtener períodos disponibles
  const periodosDisponibles = Object.keys(softwarePorPeriodo).sort();

  // Obtener asignaturas del período seleccionado
  const asignaturasDisponibles = periodoSeleccionado
    ? Object.keys(softwarePorPeriodo[periodoSeleccionado] || {}).sort()
    : [];

  // Obtener software de la asignatura seleccionada
  const softwareAsignaturaSeleccionada =
    periodoSeleccionado && asignaturaSeleccionada
      ? softwarePorPeriodo[periodoSeleccionado]?.[asignaturaSeleccionada] || []
      : [];

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full">
          <div className="text-center py-4">
            <p>Analizando software por períodos académicos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">Resumen de Software</h2>
            {planEstudios && (
              <p className="text-sm text-gray-600">{planEstudios.carrera}</p>
            )}
          </div>
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
                onClick={() => setActiveTab("jerarquico")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "jerarquico"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Vista por Períodos
              </button>
              <button
                onClick={() => setActiveTab("global")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "global"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Software Global
              </button>
              {planEstudios && (
                <button
                  onClick={() => setActiveTab("cobertura")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "cobertura"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Cobertura de Encuestas
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Contenido de la pestaña jerárquica */}
        {activeTab === "jerarquico" && (
          <div className="space-y-4">
            {/* Selectores de período y asignatura */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Seleccionar Período:
                </label>
                <select
                  value={periodoSeleccionado}
                  onChange={(e) => {
                    setPeriodoSeleccionado(e.target.value);
                    setAsignaturaSeleccionada("");
                  }}
                  className="w-full border rounded p-2"
                >
                  <option value="">-- Selecciona un período --</option>
                  {periodosDisponibles.map((periodo) => (
                    <option key={periodo} value={periodo}>
                      {periodo}
                    </option>
                  ))}
                </select>
              </div>

              {periodoSeleccionado && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Seleccionar Asignatura:
                  </label>
                  <select
                    value={asignaturaSeleccionada}
                    onChange={(e) => setAsignaturaSeleccionada(e.target.value)}
                    className="w-full border rounded p-2"
                  >
                    <option value="">-- Selecciona una asignatura --</option>
                    {asignaturasDisponibles.map((asignatura) => (
                      <option key={asignatura} value={asignatura}>
                        {asignatura}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Vista de períodos cuando no hay selección */}
            {!periodoSeleccionado && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {periodosDisponibles.map((periodo) => {
                  const asignaturas = Object.keys(softwarePorPeriodo[periodo]);
                  const totalSoftware = asignaturas.reduce(
                    (acc, asignatura) => {
                      return (
                        acc + softwarePorPeriodo[periodo][asignatura].length
                      );
                    },
                    0
                  );

                  const estadisticas = estadisticasPorPeriodo[periodo];

                  return (
                    <div
                      key={periodo}
                      className="border rounded-lg p-4 bg-blue-50 hover:bg-blue-100 cursor-pointer"
                      onClick={() => setPeriodoSeleccionado(periodo)}
                    >
                      <h3 className="font-semibold text-lg mb-2">{periodo}</h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          {asignaturas.length} asignatura
                          {asignaturas.length !== 1 ? "s" : ""} con encuestas
                        </p>
                        <p>
                          ~{totalSoftware} software
                          {totalSoftware !== 1 ? "s" : ""} únicos
                        </p>
                        {estadisticas && (
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <p className="text-xs">
                              Cobertura: {estadisticas.asignaturasConEncuesta}/
                              {estadisticas.totalAsignaturas} asignaturas
                            </p>
                            <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: `${
                                    (estadisticas.asignaturasConEncuesta /
                                      estadisticas.totalAsignaturas) *
                                    100
                                  }%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Vista de asignaturas cuando hay período seleccionado pero no asignatura */}
            {periodoSeleccionado && !asignaturaSeleccionada && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">
                    Asignaturas en {periodoSeleccionado}
                  </h3>
                  <button
                    onClick={() => setPeriodoSeleccionado("")}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    ← Volver a períodos
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {asignaturasDisponibles.map((asignatura) => {
                    const softwareCount =
                      softwarePorPeriodo[periodoSeleccionado][asignatura]
                        .length;

                    return (
                      <div
                        key={asignatura}
                        className="border rounded-lg p-4 bg-green-50 hover:bg-green-100 cursor-pointer"
                        onClick={() => setAsignaturaSeleccionada(asignatura)}
                      >
                        <h4 className="font-medium mb-1">{asignatura}</h4>
                        <p className="text-sm text-gray-600">
                          {softwareCount} software
                          {softwareCount !== 1 ? "s" : ""} únicos
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Vista de software de la asignatura seleccionada */}
            {periodoSeleccionado && asignaturaSeleccionada && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">
                    Software en {asignaturaSeleccionada}
                  </h3>
                  <button
                    onClick={() => setAsignaturaSeleccionada("")}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    ← Volver a asignaturas
                  </button>
                </div>

                {softwareAsignaturaSeleccionada.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg border">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="py-2 px-4 text-left font-semibold border-b">
                            Software
                          </th>
                          <th className="py-2 px-4 text-center font-semibold border-b">
                            Windows
                          </th>
                          <th className="py-2 px-4 text-center font-semibold border-b">
                            Ubuntu
                          </th>
                          <th className="py-2 px-4 text-center font-semibold border-b">
                            Recomendado
                          </th>
                          <th className="py-2 px-4 text-center font-semibold border-b">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {softwareAsignaturaSeleccionada.map(
                          (software, index) => {
                            const total =
                              software.windowsCount +
                              software.ubuntuCount +
                              software.recomendadoCount;
                            return (
                              <tr
                                key={index}
                                className={
                                  index % 2 === 0 ? "bg-gray-50" : "bg-white"
                                }
                              >
                                <td className="py-2 px-4 border-b">
                                  {software.nombre}
                                </td>
                                <td className="py-2 px-4 text-center border-b">
                                  {software.windowsCount > 0 ? (
                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                      {software.windowsCount}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="py-2 px-4 text-center border-b">
                                  {software.ubuntuCount > 0 ? (
                                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">
                                      {software.ubuntuCount}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="py-2 px-4 text-center border-b">
                                  {software.recomendadoCount > 0 ? (
                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                                      {software.recomendadoCount}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="py-2 px-4 text-center border-b">
                                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                                    {total}
                                  </span>
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    No hay software registrado para esta asignatura.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Contenido de la pestaña global */}
        {activeTab === "global" && (
          <div>
            {softwareGlobal.length === 0 ? (
              <div className="text-center py-4">
                <p>No hay datos de software disponibles.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-2 px-4 text-left font-semibold border-b">
                        Software
                      </th>
                      <th className="py-2 px-4 text-center font-semibold border-b">
                        Windows
                      </th>
                      <th className="py-2 px-4 text-center font-semibold border-b">
                        Ubuntu
                      </th>
                      <th className="py-2 px-4 text-center font-semibold border-b">
                        Recomendado
                      </th>
                      <th className="py-2 px-4 text-center font-semibold border-b">
                        <div
                          className="flex items-center justify-center cursor-pointer"
                          onClick={toggleSortDirection}
                        >
                          <span>Total Menciones</span>
                          <button className="ml-1 focus:outline-none">
                            {sortDirection === "desc" ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 15l7-7 7 7"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {softwareGlobal.map((software, index) => {
                      const totalMenciones =
                        software.windowsCount +
                        software.ubuntuCount +
                        software.recomendadoCount;
                      return (
                        <tr
                          key={index}
                          className={
                            index % 2 === 0 ? "bg-gray-50" : "bg-white"
                          }
                        >
                          <td className="py-2 px-4 border-b">
                            {software.nombre}
                          </td>
                          <td className="py-2 px-4 text-center border-b">
                            {software.windowsCount > 0 ? (
                              <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                {software.windowsCount}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-2 px-4 text-center border-b">
                            {software.ubuntuCount > 0 ? (
                              <span className="inline-flex items-center justify-center bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">
                                {software.ubuntuCount}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-2 px-4 text-center border-b">
                            {software.recomendadoCount > 0 ? (
                              <span className="inline-flex items-center justify-center bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                                {software.recomendadoCount}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-2 px-4 text-center border-b">
                            <span className="inline-flex items-center justify-center bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                              {totalMenciones}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Contenido de la pestaña de cobertura */}
        {activeTab === "cobertura" && planEstudios && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Cobertura de Encuestas por Período
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(estadisticasPorPeriodo).map(
                  ([periodo, stats]) => {
                    const porcentajeCobertura =
                      (stats.asignaturasConEncuesta / stats.totalAsignaturas) *
                      100;

                    return (
                      <div
                        key={periodo}
                        className="border rounded-lg p-4 bg-gray-50"
                      >
                        <h4 className="font-medium mb-3">{periodo}</h4>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Asignaturas con encuesta:</span>
                            <span className="font-medium">
                              {stats.asignaturasConEncuesta}
                            </span>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span>Total de asignaturas:</span>
                            <span className="font-medium">
                              {stats.totalAsignaturas}
                            </span>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span>Software único encontrado:</span>
                            <span className="font-medium">
                              {stats.softwareUnico}
                            </span>
                          </div>

                          <div className="mt-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Cobertura:</span>
                              <span className="font-medium">
                                {Math.round(porcentajeCobertura)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  porcentajeCobertura >= 80
                                    ? "bg-green-500"
                                    : porcentajeCobertura >= 60
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                                }`}
                                style={{ width: `${porcentajeCobertura}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {/* Lista detallada de asignaturas sin encuesta */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Asignaturas sin Encuestar
              </h3>
              <div className="space-y-4">
                {Object.entries(estadisticasPorPeriodo).map(
                  ([periodo, stats]) =>
                    stats.asignaturasSinEncuesta.length > 0 && (
                      <div key={periodo} className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2 text-red-700">
                          {periodo} ({stats.asignaturasSinEncuesta.length}{" "}
                          asignaturas pendientes)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {stats.asignaturasSinEncuesta.map(
                            (asignatura, index) => (
                              <div
                                key={index}
                                className="bg-red-50 border border-red-200 rounded p-2 text-sm"
                              >
                                {asignatura}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )
                )}
              </div>

              {Object.values(estadisticasPorPeriodo).every(
                (stats) => stats.asignaturasSinEncuesta.length === 0
              ) && (
                <div className="text-center py-8 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-green-600 text-2xl mb-2">✓</div>
                  <p className="text-green-700 font-medium">
                    ¡Excelente! Todas las asignaturas del plan de estudios
                    tienen al menos una encuesta.
                  </p>
                </div>
              )}
            </div>

            {/* Resumen general */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Resumen General</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total Períodos:</p>
                  <p className="font-medium text-lg">
                    {Object.keys(estadisticasPorPeriodo).length}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Asignaturas Totales:</p>
                  <p className="font-medium text-lg">
                    {Object.values(estadisticasPorPeriodo).reduce(
                      (acc, stats) => acc + stats.totalAsignaturas,
                      0
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Con Encuesta:</p>
                  <p className="font-medium text-lg">
                    {Object.values(estadisticasPorPeriodo).reduce(
                      (acc, stats) => acc + stats.asignaturasConEncuesta,
                      0
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Cobertura Global:</p>
                  <p className="font-medium text-lg">
                    {Math.round(
                      (Object.values(estadisticasPorPeriodo).reduce(
                        (acc, stats) => acc + stats.asignaturasConEncuesta,
                        0
                      ) /
                        Object.values(estadisticasPorPeriodo).reduce(
                          (acc, stats) => acc + stats.totalAsignaturas,
                          0
                        )) *
                        100
                    )}
                    %
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
