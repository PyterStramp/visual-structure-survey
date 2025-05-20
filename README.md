This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# Visualizador de Encuestas Docentes

![Status](https://img.shields.io/badge/status-active-success.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.x-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38b2ac)

La presente aplicación es para visualizar y filtrar encuestas de docentes sobre software y hardware utilizados en los laboratorios de informática, en la que permite cargar datos desde archivos CSV, aplicar filtros jerárquicos y ver detalles de cada encuesta.

## ✨ Características

- **Carga de archivos CSV**: Permite cargar y procesar archivos CSV con datos de encuestas.
- **Filtrado jerárquico**: Filtrado dinámico por semestre, asignatura y docente, donde cada nivel condiciona las opciones del siguiente.
- **Vista detallada**: Modal con toda la información de cada encuesta.
- **Diseño responsive**: Se adapta a diferentes tamaños de pantalla.
- **Indicadores visuales**: Marca campos con "Ninguno" o "Ninguna" usando iconos ❌.

## 🛠️ Tecnologías Utilizadas

- **Next.js 15**: Framework React con renderizado del lado del servidor (SSR).
- **TypeScript**: Para el tipado estático y mejor experiencia de desarrollo.
- **Tailwind CSS**: Framework CSS para diseño responsivo.
- **Papaparse**: Biblioteca para procesar archivos CSV.
- **Vercel**: Plataforma para despliegue y hosting.

## 🚀 Instalación y Ejecución

### Requisitos Previos

- Node.js (versión 18.0 o superior)
- npm o yarn

### Pasos de Instalación

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/PyterStramp/visual-structure-survey.git
   cd visual-structure-survey
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   # o
   yarn install
   ```

3. **Ejecutar en modo desarrollo**:
   ```bash
   npm run dev
   # o
   yarn dev
   ```

4. **Abrir en el navegador según el enlace que se genera en consola**

### Estructura de Archivos

```
visualizador-encuestas/
  ├── app/
  │   ├── page.tsx           # Página principal
  │   ├── layout.tsx         # Layout principal
  │   └── globals.css        # Estilos globales
  ├── components/
  │   └── VisualizadorEncuestas.tsx  # Componente principal
  ├── public/                # Archivos estáticos
  └── README.md              # Un README.md
```

## 📊 Estructura del CSV

El componente está diseñado para trabajar con archivos CSV que contengan los siguientes campos, separados por punto y coma (`;`):

```
Id;Hora de inicio;Hora de finalización;Correo electrónico;Nombre;Nombre del docente;Asignatura(s) que imparte;Semestre;¿Qué software utiliza en windows para su asignatura?;¿Qué software utiliza en ubuntu para su asignatura?;¿Qué software adicional recomendaría incorporar para la asignatura(s)?;¿Requiere algún dispositivos y/o elementos además de los computadores (IoT, redes...);¿Tiene alguna recomendación o sugerencia adicional respecto a los equipos de cómputo con los que cuentan actualmente los laboratorios?
```

Los campos `Id`, `Correo electrónico` y `Nombre` no se muestran en la interfaz.

## 🛠️ Personalización

### Cambiar el delimitador CSV

Si tu CSV usa otro delimitador, modifica la opción `delimiter` en la función `Papa.parse`:

```typescript
Papa.parse(contenido, {
  header: true,
  delimiter: ',', // Cambiar a otro delimitador, en este ejemplo es la ,
  skipEmptyLines: true,
  // ...
});
```

### Ajustar los campos del CSV

Si los nombres de los campos en tu CSV son diferentes, modifica la interfaz `EncuestaCSV` y la función `transformarDatosCSV` en el componente.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Para contribuir:

1. Haz un fork del proyecto
2. Crea una rama para tu característica (`git checkout -b feature/amazing-feature`)
3. Realiza tus cambios y haz commit (`git commit -m 'Add some amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## ❓ Solución de Problemas

### Problemas con caracteres especiales

Si los caracteres especiales (como tildes, eñes) aparecen incorrectamente:

```typescript
// Agregar la codificación UTF-8 al leer el archivo
lector.readAsText(archivo, 'UTF-8');
```

### Columnas faltantes o datos incorrectos

Verifica que los nombres de las columnas en tu CSV coincidan exactamente con los esperados por la aplicación.
