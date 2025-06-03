"use client";
import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import { ResumenSoftware, PlanEstudios } from "./ResumenSoftware";
import { SeguimientoDocentes } from "./SeguimientoDocentes";
import { CargadorListaDocentes } from "./CargadorListaDocentes";
import { ExportadorPDF } from "./ExportadorPDF";

// Definición de tipos para TypeScript
export interface EncuestaCSV {
  Id?: string;
  "Hora de inicio": string;
  "Hora de finalización": string;
  "Correo electrónico"?: string;
  Nombre?: string;
  "Nombre del docente": string;
  "Asignatura(s) que imparte": string;
  Semestre: string;
  "¿Qué software utiliza en windows para su asignatura?": string;
  "¿Qué software utiliza en ubuntu para su asignatura?": string;
  "¿Qué software adicional recomendaría incorporar para la asignatura(s)?": string;
  "¿Requiere algún dispositivos y/o elementos además de los computadores (IoT, redes...)": string;
  "¿Tiene alguna recomendación o sugerencia adicional respecto a los equipos de cómputo con los que cuentan actualmente los laboratorios?": string;
}

interface Encuesta {
  hora_inicio: string;
  hora_fin: string;
  nombre_docente: string;
  asignatura: string;
  semestre: string;
  software_windows: string;
  software_ubuntu: string;
  software_recomendado: string;
  dispositivos_adicionales: string;
  recomendaciones: string;
}

interface FiltrosEncuesta {
  semestre: string;
  asignatura: string;
  docente: string;
}

function VisualizadorEncuestasPage() {
  // Estados para almacenar datos y filtros
  const [encuestasOriginales, setEncuestasOriginales] = useState<EncuestaCSV[]>(
    []
  );
  const [encuestas, setEncuestas] = useState<Encuesta[]>([]);
  const [datosFiltrados, setDatosFiltrados] = useState<Encuesta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [archivoSubido, setArchivoSubido] = useState<boolean>(false);
  const [filtros, setFiltros] = useState<FiltrosEncuesta>({
    semestre: "",
    asignatura: "",
    docente: "",
  });

  // Listas para opciones de filtro únicas
  const [semestres, setSemestres] = useState<string[]>([]);
  const [asignaturas, setAsignaturas] = useState<string[]>([]);
  const [docentes, setDocentes] = useState<string[]>([]);

  // Listas filtradas según selección de semestre
  const [asignaturasFiltradas, setAsignaturasFiltradas] = useState<string[]>(
    []
  );
  const [docentesFiltrados, setDocentesFiltrados] = useState<string[]>([]);

  // Estado para mostrar detalles de una entrada específica
  const [entradaSeleccionada, setEntradaSeleccionada] =
    useState<Encuesta | null>(null);

  const [showSoftwareModal, setShowSoftwareModal] = useState<boolean>(false);

  const [showSeguimientoModal, setShowSeguimientoModal] =
    useState<boolean>(false);

  // Estado de lista docentes
  const [listaCompletaDocentes, setListaCompletaDocentes] = useState<string[]>(
    []
  );
  const [listaDocentesCargada, setListaDocentesCargada] =
    useState<boolean>(false);

  const [planEstudios, setPlanEstudios] = useState<PlanEstudios | undefined>(
    undefined
  );

  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  // Función para manejar la carga de la lista de docentes
  const handleCargarListaDocentes = (docentes: string[]) => {
    setListaCompletaDocentes(docentes);
    setListaDocentesCargada(true);
  };

  // Función para ordenar los semestres en un orden específico
  const ordenarSemestres = (semestresDesordenados: string[]): string[] => {
    // Orden personalizado de semestres
    const ordenSemestres = [
      "SEMESTRE I",
      "SEMESTRE II",
      "SEMESTRE III",
      "SEMESTRE IV",
      "SEMESTRE V",
      "SEMESTRE VI",
      "COMPONENTE PROPEDEUTICO",
      "OTRO",
    ];

    // Filtrar semestres conocidos según el orden predefinido
    const semestresOrdenados = ordenSemestres.filter((semestre) =>
      semestresDesordenados.includes(semestre)
    );

    // Añadir cualquier otro semestre que no esté en la lista predefinida al final
    const otrosSemestres = semestresDesordenados.filter(
      (semestre) => !ordenSemestres.includes(semestre)
    );

    // Combinar las listas
    return [...semestresOrdenados, ...otrosSemestres];
  };

  const cargarPlanEstudios = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const archivo = e.target.files[0];
    const lector = new FileReader();

    lector.onload = (evento: ProgressEvent<FileReader>) => {
      try {
        if (!evento.target || !evento.target.result) {
          throw new Error("Error al leer el archivo");
        }

        const contenido = evento.target.result.toString();
        const planData = JSON.parse(contenido);
        setPlanEstudios(planData);
      } catch (err: any) {
        setError("Error al procesar el plan de estudios: " + err.message);
      }
    };

    lector.readAsText(archivo);
  };

  // Convertir CSV a objeto y transformar los datos
  const transformarDatosCSV = (datos: EncuestaCSV[]): Encuesta[] => {
    return datos.map((item) => ({
      hora_inicio: item["Hora de inicio"] || "",
      hora_fin: item["Hora de finalización"] || "",
      nombre_docente: item["Nombre del docente"] || "",
      asignatura: item["Asignatura(s) que imparte"] || "",
      semestre: item["Semestre"] || "",
      software_windows:
        item["¿Qué software utiliza en windows para su asignatura?"] || "",
      software_ubuntu:
        item["¿Qué software utiliza en ubuntu para su asignatura?"] || "",
      software_recomendado:
        item[
          "¿Qué software adicional recomendaría incorporar para la asignatura(s)?"
        ] || "",
      dispositivos_adicionales:
        item[
          "¿Requiere algún dispositivos y/o elementos además de los computadores (IoT, redes...)"
        ] || "",
      recomendaciones:
        item[
          "¿Tiene alguna recomendación o sugerencia adicional respecto a los equipos de cómputo con los que cuentan actualmente los laboratorios?"
        ] || "",
    }));
  };

  // Función para cargar archivo CSV
  const cargarArchivoCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const archivo = e.target.files[0];
    setCargando(true);
    setError(null);

    const lector = new FileReader();
    lector.onload = (evento: ProgressEvent<FileReader>) => {
      try {
        if (!evento.target || !evento.target.result) {
          throw new Error("Error al leer el archivo");
        }

        const contenido = evento.target.result.toString();

        Papa.parse(contenido, {
          header: true,
          delimiter: ";",
          skipEmptyLines: true,
          complete: (results: any) => {
            const datosOriginales = results.data as EncuestaCSV[];
            setEncuestasOriginales(datosOriginales);

            // Transformar datos para la UI
            const datosTransformados = transformarDatosCSV(datosOriginales);
            setEncuestas(datosTransformados);
            setDatosFiltrados(datosTransformados);

            // Extraer opciones únicas para los filtros
            const uniqueSemestres = [
              ...new Set(datosTransformados.map((item) => item.semestre)),
            ];
            const uniqueAsignaturas = [
              ...new Set(datosTransformados.map((item) => item.asignatura)),
            ];
            const uniqueDocentes = [
              ...new Set(datosTransformados.map((item) => item.nombre_docente)),
            ];

            const semestresOrdenados = ordenarSemestres(uniqueSemestres);

            setSemestres(semestresOrdenados);
            setAsignaturas(uniqueAsignaturas);
            setDocentes(uniqueDocentes);

            setAsignaturasFiltradas(uniqueAsignaturas);
            setDocentesFiltrados(uniqueDocentes);

            setArchivoSubido(true);
            setCargando(false);
          },
          error: (error: any) => {
            setError("Error al procesar el archivo CSV: " + error.message);
            setCargando(false);
          },
        });
      } catch (err: any) {
        setError("Error al procesar el archivo: " + err.message);
        setCargando(false);
      }
    };

    lector.onerror = () => {
      setError("Error al leer el archivo");
      setCargando(false);
    };

    lector.readAsText(archivo);
  };

  // Función para manejar cambios en los filtros
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Si se cambia el semestre, actualizar las listas filtradas de asignaturas y docentes
    if (name === "semestre") {
      // Resetear los otros filtros
      setFiltros({
        semestre: value,
        asignatura: "",
        docente: "",
      });

      if (value === "") {
        // Si no hay semestre seleccionado, mostrar todas las opciones
        setAsignaturasFiltradas(asignaturas);
        setDocentesFiltrados(docentes);
      } else {
        // Filtrar asignaturas para el semestre seleccionado
        const asignaturasDelSemestre = encuestas
          .filter((item) => item.semestre === value)
          .map((item) => item.asignatura);

        // Filtrar docentes para el semestre seleccionado
        const docentesDelSemestre = encuestas
          .filter((item) => item.semestre === value)
          .map((item) => item.nombre_docente);

        setAsignaturasFiltradas([...new Set(asignaturasDelSemestre)]);
        setDocentesFiltrados([...new Set(docentesDelSemestre)]);
      }
    } else if (name === "asignatura") {
      // Actualizar el filtro de asignatura
      setFiltros({
        ...filtros,
        asignatura: value,
        docente: "", // Resetear el filtro de docente
      });

      if (value === "") {
        // Si no hay asignatura seleccionada, mostrar los docentes del semestre actual (si hay uno seleccionado)
        if (filtros.semestre) {
          const docentesDelSemestre = encuestas
            .filter((item) => item.semestre === filtros.semestre)
            .map((item) => item.nombre_docente);

          setDocentesFiltrados([...new Set(docentesDelSemestre)]);
        } else {
          // Si tampoco hay semestre seleccionado, mostrar todos los docentes
          setDocentesFiltrados(docentes);
        }
      } else {
        // Filtrar docentes para la asignatura seleccionada (y semestre, si está seleccionado)
        let docentesFiltro = encuestas;

        if (filtros.semestre) {
          docentesFiltro = docentesFiltro.filter(
            (item) => item.semestre === filtros.semestre
          );
        }

        const docentesDeLaAsignatura = docentesFiltro
          .filter((item) => item.asignatura === value)
          .map((item) => item.nombre_docente);

        setDocentesFiltrados([...new Set(docentesDeLaAsignatura)]);
      }
    } else {
      // Para otros filtros, actualizar normalmente
      setFiltros({
        ...filtros,
        [name]: value,
      });
    }
  };

  // Efecto para aplicar filtros cuando cambian
  useEffect(() => {
    let resultados = [...encuestas];

    if (filtros.semestre) {
      resultados = resultados.filter(
        (item) => item.semestre === filtros.semestre
      );
    }

    if (filtros.asignatura) {
      resultados = resultados.filter(
        (item) => item.asignatura === filtros.asignatura
      );
    }

    if (filtros.docente) {
      resultados = resultados.filter(
        (item) => item.nombre_docente === filtros.docente
      );
    }

    setDatosFiltrados(resultados);
  }, [filtros, encuestas]);

  // Función para limpiar todos los filtros
  const limpiarFiltros = () => {
    setFiltros({
      semestre: "",
      asignatura: "",
      docente: "",
    });
    // Restaurar las listas completas
    setAsignaturasFiltradas(asignaturas);
    setDocentesFiltrados(docentes);
  };

  // Función para mostrar detalles de una entrada
  const verDetalles = (entrada: Encuesta) => {
    setEntradaSeleccionada(entrada);
  };

  // Función para cerrar modal de detalles
  const cerrarDetalles = () => {
    setEntradaSeleccionada(null);
  };

  // Formatear fecha para mostrar
  const formatearFecha = (fechaStr: string) => {
    try {
      if (!fechaStr) return "";

      // Asumiendo formato "DD/MM/YYYY HH:MM"
      const partes = fechaStr.split(" ");
      if (partes.length < 2) return fechaStr;

      return `${partes[0]} ${partes[1]}`;
    } catch (err) {
      return fechaStr;
    }
  };

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p>Error al cargar los datos: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-full overflow-x-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Visualizador de Encuestas Docentes
      </h1>

      {/* Panel de carga de archivo */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">Cargar datos</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Cargador de CSV */}
          <div>
            <p className="text-sm text-gray-600 mb-3">
              Selecciona tu archivo CSV con los datos de las encuestas
            </p>
            <div className="flex items-center">
              <label className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded cursor-pointer border">
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={cargarArchivoCSV}
                />
                {archivoSubido ? "Encuesta cargada ✓" : "Cargar encuesta"}
              </label>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Archivo CSV con los datos de la encuesta
            </p>
          </div>

          {/* Cargador de lista de docentes */}
          <div>
            <p className="text-sm text-gray-600 mb-3">
              Lista completa de docentes (confidencial)
            </p>
            <CargadorListaDocentes onCargarLista={handleCargarListaDocentes} />
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-3">
              Plan de estudios (JSON)
            </p>
            <div className="flex items-center">
              <label className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded cursor-pointer border">
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={cargarPlanEstudios}
                />
                {planEstudios ? "Plan cargado ✓" : "Cargar plan de estudios"}
              </label>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Archivo JSON con la estructura curricular
            </p>
          </div>
        </div>

        {/* Mostrar mensaje de carga exitosa */}
        {(archivoSubido || listaDocentesCargada || planEstudios) && (
          <div className="mt-4 space-y-2">
            {/* Estado de archivos cargados */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <div
                className={`flex items-center p-2 rounded ${
                  archivoSubido
                    ? "bg-green-50 border border-green-200 text-green-700"
                    : "bg-gray-50 border border-gray-200 text-gray-500"
                }`}
              >
                <span className="mr-2">{archivoSubido ? "✓" : "⧖"}</span>
                <span>CSV de encuestas</span>
              </div>

              <div
                className={`flex items-center p-2 rounded ${
                  listaDocentesCargada
                    ? "bg-green-50 border border-green-200 text-green-700"
                    : "bg-gray-50 border border-gray-200 text-gray-500"
                }`}
              >
                <span className="mr-2">{listaDocentesCargada ? "✓" : "⧖"}</span>
                <span>Lista de docentes</span>
              </div>

              <div
                className={`flex items-center p-2 rounded ${
                  planEstudios
                    ? "bg-green-50 border border-green-200 text-green-700"
                    : "bg-gray-50 border border-gray-200 text-gray-500"
                }`}
              >
                <span className="mr-2">{planEstudios ? "✓" : "⧖"}</span>
                <span>Plan de estudios</span>
              </div>
            </div>

            {/* Mensaje principal según el estado */}
            {archivoSubido && listaDocentesCargada && planEstudios && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                <div className="flex items-center">
                  <span className="text-lg mr-2">✓</span>
                  <div>
                    <p className="font-medium">Sistema completo cargado</p>
                    <p className="text-sm">
                      Todos los archivos están listos. Ahora podrás acceder a
                      análisis completos, seguimiento de docentes y vista
                      jerárquica por períodos académicos.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {archivoSubido && listaDocentesCargada && !planEstudios && (
              <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
                <div className="flex items-center">
                  <span className="text-lg mr-2">✓</span>
                  <div>
                    <p className="font-medium">Archivos principales cargados</p>
                    <p className="text-sm">
                      CSV de encuestas y lista de docentes están listos.
                      <span className="font-medium"> Opcional:</span> Carga el
                      plan de estudios para análisis jerárquico por períodos.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {archivoSubido && !listaDocentesCargada && planEstudios && (
              <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
                <div className="flex items-center">
                  <span className="text-lg mr-2">⍻</span>
                  <div>
                    <p className="font-medium">¡Análisis académico listo!</p>
                    <p className="text-sm">
                      CSV de encuestas y plan de estudios cargados.
                      <span className="font-medium"> Opcional:</span> Carga la
                      lista de docentes para seguimiento de cobertura.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {archivoSubido && !listaDocentesCargada && !planEstudios && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                <div className="flex items-center">
                  <span className="text-lg mr-2">⍻</span>
                  <div>
                    <p className="font-medium">¡Análisis básico disponible!</p>
                    <p className="text-sm">
                      CSV de encuestas cargado. Puedes ver el resumen global de
                      software.
                      <span className="font-medium"> Recomendado:</span> Carga
                      los archivos adicionales para análisis completos.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!archivoSubido && (listaDocentesCargada || planEstudios) && (
              <div className="bg-orange-100 border border-orange-400 text-orange-700 px-4 py-3 rounded">
                <div className="flex items-center">
                  <span className="text-lg mr-2">⍻</span>
                  <div>
                    <p className="font-medium">Archivos auxiliares cargados</p>
                    <p className="text-sm">
                      <span className="font-medium">Requerido:</span> Carga el
                      CSV de encuestas para comenzar el análisis.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {archivoSubido ? (
        <>
          {/* Panel de filtros */}
          <div className="bg-gray-50 p-4 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-3">Filtros</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Filtro por semestre */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Semestre:
                </label>
                <select
                  name="semestre"
                  value={filtros.semestre}
                  onChange={handleFilterChange}
                  className="w-full border rounded p-2"
                >
                  <option value="">Todos los semestres</option>
                  {semestres.map((semestre, index) => (
                    <option key={index} value={semestre}>
                      {semestre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por asignatura */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Asignatura:
                </label>
                <select
                  name="asignatura"
                  value={filtros.asignatura}
                  onChange={handleFilterChange}
                  className="w-full border rounded p-2"
                >
                  <option value="">Todas las asignaturas</option>
                  {asignaturasFiltradas.map((asignatura, index) => (
                    <option key={index} value={asignatura}>
                      {asignatura}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por docente */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Docente:
                </label>
                <select
                  name="docente"
                  value={filtros.docente}
                  onChange={handleFilterChange}
                  className="w-full border rounded p-2"
                >
                  <option value="">Todos los docentes</option>
                  {docentesFiltrados.map((docente, index) => (
                    <option key={index} value={docente}>
                      {docente}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botón para limpiar filtros */}
            <div className="mt-4">
              <button
                onClick={limpiarFiltros}
                className="bg-teal-200 hover:bg-teal-300 px-4 py-2 rounded"
              >
                Limpiar filtros
              </button>
            </div>
          </div>

          {/* Resumen de resultados */}
          <div className="mb-4 flex justify-between items-center">
            <p className="text-gray-700">
              Mostrando {datosFiltrados.length} de {encuestas.length} registros
            </p>
            <div className="flex space-x-3">
              {/* Botón para abrir el modal de resumen de software */}
              <button
                onClick={() => setShowSoftwareModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                Ver resumen de software
              </button>

              {/* Botón para abrir el modal de seguimiento de docentes */}
              <button
                onClick={() => setShowSeguimientoModal(true)}
                className={`${
                  listaDocentesCargada
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-gray-400 cursor-not-allowed"
                } text-white px-4 py-2 rounded flex items-center`}
                disabled={!listaDocentesCargada}
                title={
                  !listaDocentesCargada
                    ? "Carga primero la lista de docentes"
                    : ""
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Seguimiento docentes
                {!listaDocentesCargada && (
                  <span className="ml-2 text-xs">(Requiere lista)</span>
                )}
              </button>

              {/*Exportar como PDF */}
              <button
                onClick={() => setShowExportModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center"
                disabled={!archivoSubido}
                title={
                  !archivoSubido ? "Carga primero el CSV de encuestas" : ""
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
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
                Exportar PDF
              </button>
            </div>
          </div>

          {/* Tabla de resultados */}
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 shadow-md rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left font-semibold border-b">
                    Docente
                  </th>
                  <th className="py-3 px-4 text-left font-semibold border-b">
                    Asignatura
                  </th>
                  <th className="py-3 px-4 text-left font-semibold border-b">
                    Semestre
                  </th>
                  <th className="py-3 px-4 text-left font-semibold border-b">
                    Software Windows
                  </th>
                  <th className="py-3 px-4 text-left font-semibold border-b">
                    Software Ubuntu
                  </th>
                  <th className="py-3 px-4 text-left font-semibold border-b">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {datosFiltrados.length > 0 ? (
                  datosFiltrados.map((entrada, index) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                    >
                      <td className="py-2 px-4 border-b">
                        {entrada.nombre_docente}
                      </td>
                      <td className="py-2 px-4 border-b">
                        {entrada.asignatura}
                      </td>
                      <td className="py-2 px-4 border-b">{entrada.semestre}</td>
                      <td className="py-2 px-4 border-b truncate max-w-xs">
                        {entrada.software_windows !== "Ninguno"
                          ? entrada.software_windows
                          : "✗"}
                      </td>
                      <td className="py-2 px-4 border-b truncate max-w-xs">
                        {entrada.software_ubuntu !== "Ninguno"
                          ? entrada.software_ubuntu
                          : "✗"}
                      </td>
                      <td className="py-2 px-4 border-b">
                        <button
                          onClick={() => verDetalles(entrada)}
                          className="bg-teal-500 hover:bg-teal-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Ver detalles
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-gray-500">
                      No se encontraron resultados para los filtros
                      seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        // Mensaje cuando no hay archivo cargado
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-3xl mb-4 text-gray-400">📁</div>
          <h2 className="text-xl font-semibold mb-2">
            No hay datos para mostrar
          </h2>
          <p className="text-gray-600 mb-4">
            Carga un archivo CSV para visualizar las encuestas de los docentes.
          </p>
          <p className="text-sm text-gray-500">
            El archivo debe contener los campos requeridos con el formato
            correcto.
          </p>
        </div>
      )}

      {/* Modal de detalles */}
      {entradaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Detalles de la encuesta</h2>
              <button
                onClick={cerrarDetalles}
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

            <div className="grid grid-cols-1 gap-4">
              <div className="bg-blue-50 p-3 rounded">
                <h3 className="font-semibold">Información general</h3>
                <p>
                  <span className="font-medium">Docente:</span>{" "}
                  {entradaSeleccionada.nombre_docente}
                </p>
                <p>
                  <span className="font-medium">Asignatura:</span>{" "}
                  {entradaSeleccionada.asignatura}
                </p>
                <p>
                  <span className="font-medium">Semestre:</span>{" "}
                  {entradaSeleccionada.semestre}
                </p>
                <p>
                  <span className="font-medium">Hora de inicio:</span>{" "}
                  {formatearFecha(entradaSeleccionada.hora_inicio)}
                </p>
                <p>
                  <span className="font-medium">Hora de finalización:</span>{" "}
                  {formatearFecha(entradaSeleccionada.hora_fin)}
                </p>
              </div>

              <div className="bg-green-50 p-3 rounded">
                <h3 className="font-semibold">Software utilizado</h3>
                <p>
                  <span className="font-medium">Windows:</span>{" "}
                  {entradaSeleccionada.software_windows !== "Ninguno"
                    ? entradaSeleccionada.software_windows
                    : "✗"}
                </p>
                <p>
                  <span className="font-medium">Ubuntu:</span>{" "}
                  {entradaSeleccionada.software_ubuntu !== "Ninguno"
                    ? entradaSeleccionada.software_ubuntu
                    : "✗"}
                </p>
                <p>
                  <span className="font-medium">Software recomendado:</span>{" "}
                  {entradaSeleccionada.software_recomendado !== "Ninguno"
                    ? entradaSeleccionada.software_recomendado
                    : "✗"}
                </p>
              </div>

              <div className="bg-yellow-50 p-3 rounded">
                <h3 className="font-semibold">
                  Equipamiento y recomendaciones
                </h3>
                <p>
                  <span className="font-medium">Dispositivos adicionales:</span>{" "}
                  {entradaSeleccionada.dispositivos_adicionales !== "Ninguno"
                    ? entradaSeleccionada.dispositivos_adicionales
                    : "✗"}
                </p>
                <p>
                  <span className="font-medium">Recomendaciones:</span>{" "}
                  {entradaSeleccionada.recomendaciones !== "Ninguna"
                    ? entradaSeleccionada.recomendaciones
                    : "✗"}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={cerrarDetalles}
                className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de resumen de software */}
      <ResumenSoftware
        encuestas={encuestas}
        planEstudios={planEstudios}
        isOpen={showSoftwareModal}
        onClose={() => setShowSoftwareModal(false)}
      />

      {/* Modal de seguimiento de docentes */}
      <SeguimientoDocentes
        encuestas={encuestas}
        listaCompleta={listaCompletaDocentes}
        isOpen={showSeguimientoModal}
        onClose={() => setShowSeguimientoModal(false)}
      />

      <ExportadorPDF
        encuestas={encuestas}
        listaDocentes={listaCompletaDocentes}
        planEstudios={planEstudios}
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </div>
  );
}
export default VisualizadorEncuestasPage;
