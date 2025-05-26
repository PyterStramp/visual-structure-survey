// components/CargadorListaDocentes.tsx

'use client';

import React, { useState } from 'react';

interface CargadorListaDocentesProps {
  onCargarLista: (docentes: string[]) => void;
  className?: string;
}

export function CargadorListaDocentes({ onCargarLista, className = '' }: CargadorListaDocentesProps) {
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<boolean>(false);
  const [nombreArchivo, setNombreArchivo] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const manejarCambioArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    
    if (!e.target.files || e.target.files.length === 0) {
      setArchivoSeleccionado(false);
      setNombreArchivo('');
      return;
    }
    
    const archivo = e.target.files[0];
    setArchivoSeleccionado(true);
    setNombreArchivo(archivo.name);
    
    // Verificar que sea un archivo de texto
    if (archivo.type !== 'text/plain' && !archivo.name.endsWith('.txt')) {
      setError('El archivo debe ser de texto (.txt)');
      return;
    }
    
    const lector = new FileReader();
    
    lector.onload = (evento: ProgressEvent<FileReader>) => {
      try {
        if (!evento.target || !evento.target.result) {
          throw new Error('Error al leer el archivo');
        }
        
        const contenido = evento.target.result.toString();
        
        // Procesamos la lista de docentes (separados por comas)
        const docentes = contenido
          .split(',')
          .map(nombre => nombre.trim())
          .filter(nombre => nombre.length > 0); // Filtrar nombres vacíos
        
        if (docentes.length === 0) {
          setError('El archivo no contiene nombres de docentes válidos');
          return;
        }
        
        // Llamamos al callback con la lista de docentes
        onCargarLista(docentes);
        
      } catch (err: any) {
        setError(`Error al procesar el archivo: ${err.message}`);
      }
    };
    
    lector.onerror = () => {
      setError('Error al leer el archivo');
    };
    
    lector.readAsText(archivo);
  };

  return (
    <div className={`${className}`}>
      <div className="flex items-center">
        <label className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded cursor-pointer border">
          <input 
            type="file" 
            accept=".txt" 
            className="hidden" 
            onChange={manejarCambioArchivo}
          />
          {archivoSeleccionado ? "Lista cargada ✓" : "Seleccionar lista de docentes"}
        </label>
      </div>
      
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
      
      <p className="mt-2 text-xs text-gray-500">
        Archivo .txt con nombres separados por comas (ej: CARLOS SANTANA,MIGUEL MEJIA,LUIS SILVA...)
      </p>
    </div>
  );
}