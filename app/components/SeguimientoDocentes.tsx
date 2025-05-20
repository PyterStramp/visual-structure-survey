// components/SeguimientoDocentes.tsx

'use client';

import React, { useState, useEffect } from 'react';

interface DocenteEstado {
  nombre: string;
  encuestado: boolean;
  asignaturas: string[];
}

interface SeguimientoDocentesProps {
  encuestas: any[]; // Usar el tipo correcto de tus encuestas
  listaCompleta: string[]; // Lista completa de docentes que deberían ser encuestados
  isOpen: boolean;
  onClose: () => void;
}

export function SeguimientoDocentes({ 
  encuestas, 
  listaCompleta, 
  isOpen, 
  onClose 
}: SeguimientoDocentesProps) {
  const [docentes, setDocentes] = useState<DocenteEstado[]>([]);
  const [filtroActual, setFiltroActual] = useState<'todos' | 'encuestados' | 'pendientes'>('todos');
  const [docentesFiltrados, setDocentesFiltrados] = useState<DocenteEstado[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busqueda, setBusqueda] = useState<string>('');

  // Función para sanitizar nombres (remover acentos y convertir a minúsculas)
  const sanitizarNombre = (nombre: string): string => {
    return nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
      .trim();
  };

  useEffect(() => {
    if (!isOpen) return;
    
    setLoading(true);
    
    // Extraer docentes ya encuestados
    const docentesEncuestados = new Map<string, string[]>();
    
    encuestas.forEach(encuesta => {
      const nombreDocente = encuesta.nombre_docente || encuesta.nombreDocente;
      if (!nombreDocente) return;
      
      const nombreSanitizado = sanitizarNombre(nombreDocente);
      
      if (!docentesEncuestados.has(nombreSanitizado)) {
        docentesEncuestados.set(nombreSanitizado, []);
      }
      
      // Añadir asignatura si no está ya incluida
      const asignatura = encuesta.asignatura;
      const asignaturas = docentesEncuestados.get(nombreSanitizado)!;
      
      if (asignatura && !asignaturas.includes(asignatura)) {
        asignaturas.push(asignatura);
      }
    });
    
    // Crear lista completa de docentes con su estado
    const listaDocentes: DocenteEstado[] = listaCompleta.map(nombre => {
      const nombreSanitizado = sanitizarNombre(nombre);
      return {
        nombre: nombre, // Mantener el nombre original con formato
        encuestado: docentesEncuestados.has(nombreSanitizado),
        asignaturas: docentesEncuestados.get(nombreSanitizado) || []
      };
    });
    
    // Añadir docentes que aparecen en las encuestas pero no están en la lista completa
    docentesEncuestados.forEach((asignaturas, nombreSanitizado) => {
      const yaExiste = listaDocentes.some(
        docente => sanitizarNombre(docente.nombre) === nombreSanitizado
      );
      
      if (!yaExiste) {
        // Buscar el nombre original en las encuestas
        const encuesta = encuestas.find(
          e => sanitizarNombre(e.nombre_docente || e.nombreDocente) === nombreSanitizado
        );
        
        const nombreOriginal = encuesta 
          ? (encuesta.nombre_docente || encuesta.nombreDocente) 
          : nombreSanitizado;
        
        listaDocentes.push({
          nombre: nombreOriginal,
          encuestado: true,
          asignaturas
        });
      }
    });
    
    // Ordenar alfabéticamente
    listaDocentes.sort((a, b) => a.nombre.localeCompare(b.nombre));
    
    setDocentes(listaDocentes);
    setDocentesFiltrados(listaDocentes);
    setLoading(false);
  }, [encuestas, listaCompleta, isOpen]);

  // Aplicar filtros cuando cambian
  useEffect(() => {
    if (!docentes.length) return;
    
    let resultado = [...docentes];
    
    // Aplicar filtro de estado
    if (filtroActual === 'encuestados') {
      resultado = resultado.filter(docente => docente.encuestado);
    } else if (filtroActual === 'pendientes') {
      resultado = resultado.filter(docente => !docente.encuestado);
    }
    
    // Aplicar búsqueda
    if (busqueda.trim()) {
      const terminoBusqueda = sanitizarNombre(busqueda);
      resultado = resultado.filter(docente => 
        sanitizarNombre(docente.nombre).includes(terminoBusqueda)
      );
    }
    
    setDocentesFiltrados(resultado);
  }, [docentes, filtroActual, busqueda]);

  // Si el modal no está abierto, no renderizar nada
  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full">
          <div className="text-center py-4">
            <p>Analizando el estado de los docentes...</p>
          </div>
        </div>
      </div>
    );
  }

  // Calcular estadísticas
  const totalDocentes = docentes.length;
  const encuestados = docentes.filter(d => d.encuestado).length;
  const pendientes = totalDocentes - encuestados;
  const porcentajeCompletado = totalDocentes > 0 
    ? Math.round((encuestados / totalDocentes) * 100) 
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Seguimiento de Encuestas a Docentes</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Resumen de progreso */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Progreso de encuestas</h3>
          <div className="flex items-center mb-2">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-teal-600 h-4 rounded-full"
                style={{ width: `${porcentajeCompletado}%` }}
              ></div>
            </div>
            <span className="ml-3 font-medium">{porcentajeCompletado}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
              <span>Encuestados: {encuestados}</span>
            </div>
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
              <span>Pendientes: {pendientes}</span>
            </div>
            <div>
              <span>Total: {totalDocentes}</span>
            </div>
          </div>
        </div>
        
        {/* Filtros y búsqueda */}
        <div className="mb-4 flex flex-col md:flex-row gap-4">
          <div className="flex">
            <button 
              onClick={() => setFiltroActual('todos')} 
              className={`px-4 py-2 rounded-l-md ${
                filtroActual === 'todos' 
                  ? 'bg-teal-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Todos
            </button>
            <button 
              onClick={() => setFiltroActual('encuestados')} 
              className={`px-4 py-2 ${
                filtroActual === 'encuestados' 
                  ? 'bg-teal-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Encuestados
            </button>
            <button 
              onClick={() => setFiltroActual('pendientes')} 
              className={`px-4 py-2 rounded-r-md ${
                filtroActual === 'pendientes' 
                  ? 'bg-teal-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Pendientes
            </button>
          </div>
          
          <div className="flex-grow">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar docente..."
                className="w-full p-2 border rounded-md pl-10"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        {/* Lista de docentes */}
        {docentesFiltrados.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No se encontraron docentes con los filtros actuales.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {docentesFiltrados.map((docente, index) => (
              <div 
                key={index} 
                className={`border p-3 rounded-md ${
                  docente.encuestado ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    docente.encuestado ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <h3 className="font-medium">{docente.nombre}</h3>
                </div>
                
                {docente.encuestado && docente.asignaturas.length > 0 && (
                  <div className="mt-2 pl-6">
                    <p className="text-sm text-gray-600 mb-1">Asignaturas:</p>
                    <div className="flex flex-wrap gap-1">
                      {docente.asignaturas.map((asignatura, i) => (
                        <span 
                          key={i} 
                          className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                          {asignatura}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {!docente.encuestado && (
                  <p className="mt-2 pl-6 text-sm text-red-600">Pendiente de encuesta</p>
                )}
              </div>
            ))}
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