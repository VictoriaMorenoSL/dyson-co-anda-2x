# Dyson Air Studio

Proyecto académico de Maquetación Web sobre Dyson Airwrap Co-anda2x™. La landing combina una experiencia editorial, un modelo 3D con accesorios intercambiables y transiciones vinculadas al scroll.

- [Landing de Dyson Air Studio](https://victoriamorenosl.github.io/dyson-co-anda-2x/)
- [Guía visual del sistema de diseño](https://victoriamorenosl.github.io/dyson-co-anda-2x/guia-visual.html)
- [Visor de pruebas 3D](https://victoriamorenosl.github.io/dyson-co-anda-2x/viewer.html)

## Tecnologías

- **HTML, CSS y JavaScript** para la interfaz y sus interacciones.
- **Vite** para el desarrollo local y la compilación de las tres páginas.
- **Three.js** para la escena 3D, el Airwrap y sus accesorios.
- **GSAP y ScrollTrigger** para las transiciones y animaciones.
- **Web Audio API** para los efectos de sonido, que se activan desde el encabezado.
- **GitHub Actions y GitHub Pages** para la publicación.

## Ejecutar el proyecto

Usa Node.js 22, la versión configurada en GitHub Actions. Desde la raíz del repositorio, ejecuta:

```sh
npm ci
npm run dev
```

En la dirección que muestra Vite, abre `/` para la landing, `/guia-visual.html` para la guía o `/viewer.html` para el visor.

## Compilar y previsualizar

```sh
npm run build
npm run preview
```

GitHub Actions compila con la base `/dyson-co-anda-2x/` y publica el contenido de `dist/`. Para probar esa configuración en local, ejecuta el siguiente comando en una terminal compatible con Bash o Zsh:

```sh
GITHUB_ACTIONS=true npm run build
GITHUB_ACTIONS=true npm run preview
```

## Estructura

```text
├── index.html                   Landing
├── guia-visual.html             Guía visual e impresión
├── viewer.html                  Visor de pruebas del modelo y los accesorios
├── src/
│   ├── landing/                 Secciones, animaciones e interacciones
│   ├── scene/                   Escena, cámara e iluminación
│   ├── models/                  Airwrap, materiales y accesorios
│   ├── config/                  Parámetros del producto y de la cámara
│   ├── main.js / viewer.js      Entradas de la landing y el visor
│   └── *.css                    Estilos de las páginas y tipografía
├── assets/
│   ├── logo.svg
│   ├── images/
│   │   ├── style-cards/         Tarjetas de estilos
│   │   ├── editorial-carousel/  Carrusel editorial
│   │   └── product-gallery/     Galería de producto
│   ├── videos/                  Tecnología y tráileres
│   ├── audio/                   Efectos activos
│   ├── fonts/                   Fuentes locales de la interfaz
│   └── originals/               Recursos originales conservados para revisión
├── vite.config.js               Configuración de las tres entradas
└── .github/workflows/           Compilación y despliegue en GitHub Pages
```

Los directorios de imágenes agrupan sus variantes en `desktop/` y `mobile/`. El visor y la landing reutilizan el mismo código de escena y modelos.
