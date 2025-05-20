// components/ResumenSoftware.tsx

'use client';

import React, { useEffect, useState } from 'react';

interface Software {
  nombre: string;
  windowsCount: number;
  ubuntuCount: number;
  recomendadoCount: number;
}

interface ResumenSoftwareProps {
  encuestas: any[]; // Usar el tipo correcto de tus encuestas
  isOpen: boolean;
  onClose: () => void;
}

export function ResumenSoftware({ encuestas, isOpen, onClose }: ResumenSoftwareProps) {
  const [softwareList, setSoftwareList] = useState<Software[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc'); // Por defecto, ordenar de mayor a menor

  useEffect(() => {
    if (!encuestas || encuestas.length === 0) {
      setSoftwareList([]);
      setLoading(false);
      return;
    }

    // Sanitizar y extraer software
    const softwareMap = new Map<string, Software>();

    // Procesar cada encuesta
    encuestas.forEach(encuesta => {
      // Procesar software Windows
      procesarSoftware(
        encuesta.software_windows || encuesta.softwareWindows, 
        softwareMap, 
        'windows'
      );
      
      // Procesar software Ubuntu
      procesarSoftware(
        encuesta.software_ubuntu || encuesta.softwareUbuntu, 
        softwareMap, 
        'ubuntu'
      );
      
      // Procesar software recomendado
      procesarSoftware(
        encuesta.software_recomendado || encuesta.softwareRecomendado, 
        softwareMap, 
        'recomendado'
      );
    });

    // Convertir Map a array para renderizado
    const softwareArray = Array.from(softwareMap.values());
    
    // Ordenar por menciones totales (descendente por defecto)
    sortSoftwareList(softwareArray, sortDirection);
    
    setSoftwareList(softwareArray);
    setLoading(false);
  }, [encuestas]);

  // Función para procesar y sanitizar software
  const procesarSoftware = (
    softwareStr: string, 
    softwareMap: Map<string, Software>, 
    tipo: 'windows' | 'ubuntu' | 'recomendado'
  ) => {
    if (!softwareStr || softwareStr === 'Ninguno' || softwareStr === 'Ninguna') {
      return;
    }

    // Dividir por comas y procesar cada elemento
    const softwares = softwareStr.split(',').map(s => s.trim());
    
    softwares.forEach(software => {
      if (!software) return;
      
      // Sanitizar: convertir a minúsculas y eliminar caracteres especiales
      const sanitizedName = software.toLowerCase().trim();
      
      if (!softwareMap.has(sanitizedName)) {
        softwareMap.set(sanitizedName, {
          nombre: software.trim(), // Mantener la primera versión del nombre con mayúsculas originales
          windowsCount: 0,
          ubuntuCount: 0,
          recomendadoCount: 0
        });
      }
      
      const softwareEntry = softwareMap.get(sanitizedName)!;
      
      // Incrementar el contador correspondiente
      if (tipo === 'windows') {
        softwareEntry.windowsCount++;
      } else if (tipo === 'ubuntu') {
        softwareEntry.ubuntuCount++;
      } else if (tipo === 'recomendado') {
        softwareEntry.recomendadoCount++;
      }
    });
  };

  // Función para ordenar la lista de software
  const sortSoftwareList = (list: Software[], direction: 'asc' | 'desc') => {
    list.sort((a, b) => {
      const totalA = a.windowsCount + a.ubuntuCount + a.recomendadoCount;
      const totalB = b.windowsCount + b.ubuntuCount + b.recomendadoCount;
      
      if (direction === 'desc') {
        return totalB - totalA; // Ordenar de mayor a menor
      } else {
        return totalA - totalB; // Ordenar de menor a mayor
      }
    });
  };

  // Función para cambiar la dirección de ordenamiento
  const toggleSortDirection = () => {
    const newDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    setSortDirection(newDirection);
    
    // Aplicar el nuevo ordenamiento
    const newList = [...softwareList];
    sortSoftwareList(newList, newDirection);
    setSoftwareList(newList);
  };

  // Si el modal no está abierto, no renderizar nada
  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full">
          <div className="text-center py-4">
            <p>Cargando resumen de software...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Resumen de Software</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {softwareList.length === 0 ? (
          <div className="text-center py-4">
            <p>No hay datos de software disponibles.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 text-left font-semibold border-b">Software</th>
                  <th className="py-2 px-4 text-center font-semibold border-b">Windows</th>
                  <th className="py-2 px-4 text-center font-semibold border-b">Ubuntu</th>
                  <th className="py-2 px-4 text-center font-semibold border-b">Recomendado</th>
                  <th className="py-2 px-4 text-center font-semibold border-b">
                    <div className="flex items-center justify-center cursor-pointer" onClick={toggleSortDirection}>
                      <span>Total Menciones</span>
                      <button className="ml-1 focus:outline-none">
                        {sortDirection === 'desc' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {softwareList.map((software, index) => {
                  const totalMenciones = software.windowsCount + software.ubuntuCount + software.recomendadoCount;
                  return (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="py-2 px-4 border-b">{software.nombre}</td>
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