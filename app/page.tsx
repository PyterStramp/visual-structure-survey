'use client';
import React from "react";
import VisualizadorEncuestas from "./components/VisualizadorEncuestas";

export default function Home() {
  return (
    <div className="min-h-screen p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-center">
          Análisis de Software y Hardware para Cursos
        </h1>
        <p className="text-center text-gray-600 mt-2">
          Herramienta para visualizar y analizar las encuestas de docentes sobre
          tecnologías en laboratorios
        </p>
      </header>

      <main>
        <VisualizadorEncuestas />
      </main>

      <footer className="mt-12 pt-6 border-t border-gray-200 text-center text-gray-500 text-sm">
        <p>
          Sistematización de datos - Resultados de Encuestas ©{" "}
          {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
