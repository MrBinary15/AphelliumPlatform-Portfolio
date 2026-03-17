# Guía de Preparación de Assets — Escena Parallax Inmersiva

## Estructura de capas

La escena está diseñada con **6 capas de profundidad** que se mueven a velocidades distintas
para crear el efecto parallax. Cada capa debe ser una imagen `.webp` con fondo transparente.

```
public/assets/scene/
├── sky.webp          ← Capa 1 (más lenta) – Cielo, nubes, paisaje lejano
├── fields.webp       ← Capa 2 – Campos de flores a media distancia
├── structures.webp   ← Capa 3 – Invernadero, bodega, tractor, paneles solares
├── container.webp    ← Capa 4 – El contenedor Aphellium central
├── flowers.webp      ← Capa 5 – Flores en primer plano (tiene micro-animación de brisa)
└── drones.webp       ← Capa 6 (más rápida) – Drones volando (tiene levitación)
```

## Modo Fallback

Si **no se encuentran** los archivos de capas, el componente usa automáticamente
`/assets/home-ux-hero.jpg` como imagen única con:
- Parallax por mouse/giroscopio
- Efecto de "respiración" (zoom subtle)
- Partículas de polen flotando
- Viñeta cinematográfica + glow de marca

**Para empezar rápido**: solo necesitas colocar la imagen completa como `home-ux-hero.jpg`.
Las capas son una mejora progresiva.

---

## Cómo segmentar la imagen

### Herramientas recomendadas
- **Photoshop**: Selección por rango de profundidad + máscaras
- **GIMP**: Herramienta de selección difusa + máscaras de capa
- **Figma**: Importar y recortar manualmente

### Proceso

1. **Abrir la imagen original** (~1920×1080 o mayor)

2. **Capa Sky** (`sky.webp`):
   - Seleccionar el cielo completo + paisaje lejano (colinas, horizonte)
   - Incluir un margen generoso (el parallax mueve la capa ~12px)
   - Escalar a **120% del viewport** (el `baseScale: 1.18` necesita espacio extra)

3. **Capa Fields** (`fields.webp`):
   - Seleccionar los campos de flores a media distancia
   - Transparente donde estaba el cielo
   - Escalar a **115%** del viewport

4. **Capa Structures** (`structures.webp`):
   - Seleccionar: invernadero, bodega, tractor, paneles solares
   - Todo lo que sea infraestructura/maquinaria estática
   - Escalar a **110%**

5. **Capa Container** (`container.webp`):
   - Solo el contenedor Aphellium central (el cubo plateado)
   - Incluir la tarima de madera debajo
   - Escalar a **108%**

6. **Capa Flowers** (`flowers.webp`):
   - Flores de primer plano (rosas, girasoles, lirios en cajas)
   - Esta capa tiene animación de **balanceo por brisa**
   - Escalar a **108%**

7. **Capa Drones** (`drones.webp`):
   - Solo los drones + sus sombras
   - Esta capa tiene **animación de levitación**
   - NO escalar (baseScale: 1.0) — la levitación da el movimiento

### Tips de exportación

- **Formato**: WebP con compresión lossy al 85%
- **Transparencia**: Alpha channel limpio (sin bordes de halo)
- **Resolución recomendada**: 2560×1440 o 1920×1080 mínimo
- **Feathering**: Aplicar 2-4px de difuminado en los bordes del recorte
  para que las capas se fundan naturalmente
- **Tamaño objetivo por capa**: < 200KB (idealmente 80-150KB)
- **Nombre exacto**: deben coincidir con los nombres en la configuración
  del componente (`LAYERS` en `ImmersiveParallaxScene.tsx`)

---

## Configuración de velocidades

Los valores de parallax se configuran en `components/ImmersiveParallaxScene.tsx`:

| Capa        | depthX | depthY | scrollFactor | Micro-animación |
|-------------|--------|--------|--------------|-----------------|
| sky         | 10     | 6      | 0.05         | —               |
| fields      | 20     | 12     | 0.14         | —               |
| structures  | 32     | 20     | 0.25         | —               |
| container   | 44     | 28     | 0.34         | —               |
| flowers     | 38     | 22     | 0.40         | sway (brisa)    |
| drones      | 55     | 38     | 0.08         | levitate        |

- `depthX/Y`: Amplitud en px del movimiento por mouse (mayor = más movimiento)
- `scrollFactor`: Multiplicador del scroll vertical (mayor = se desplaza más rápido)
- `micro`: Micro-animación adicional por sine waves compuestas

## Partículas

~50-55 partículas de polen/polvo flotan en primer plano:
- 40% dorado cálido (hue 55-65)
- 32% cyan (hue 183-189) — acento de marca
- 28% verde suave (hue 150-162)

Las partículas reaccionan al viento (sinusoidal) y se repelen del cursor.

## Accesibilidad

- `prefers-reduced-motion: reduce` desactiva todas las animaciones
- Partículas se ocultan con `display: none`
- El componente usa `aria-hidden="true"`
- Giroscopio para parallax en dispositivos móviles
