# Dale wacha activá

App para motivarse a hacer actividad física en grupo: sellos semanales, rachas, muro con fotos, prendas (opcionales), estrellas y premios.

- **Frontend:** estos archivos, publicados con GitHub Pages.
- **Backend:** Google Apps Script + una planilla de Google + Drive para las fotos. El código está aparte y **no se sube a este repo**, porque tiene la clave para crear grupos.

## Páginas

| Página | Para qué |
|---|---|
| `crear.html?k=TU_CLAVE` | Crear un grupo y obtener el link personal de cada persona. La clave queda guardada en ese navegador. |
| `?t=TOKEN` | La app de cada persona. El link es su llave: no hace falta login. |

Quien crea el grupo es una más y además admin. Desde **Reglas** puede sumar y quitar personas, compartir o regenerar links, pasar el grupo a modo light (sin prendas, con estrellas y premios) y editar prendas y premios. Todo se guarda solo.

## Instalación

1. **Backend:** planilla nueva > Extensiones > Apps Script. Pegá `Code.gs` y `appsscript.json` (para ver el manifiesto: Configuración del proyecto > Mostrar "appsscript.json").
2. En `CONFIG` completá `CLAVE_CREAR` (una clave larga) y `URL_APP` (la dirección de GitHub Pages, con `/` al final).
3. Ejecutá `setup()` una vez y aceptá los permisos.
4. Implementar > Nueva implementación > App web. Ejecutar como **Yo**; acceso **Cualquier usuario**. Copiá la URL que termina en `/exec`.
5. **Frontend:** pegá esa URL en `config.js`, subí estos archivos a la raíz del repo y activá GitHub Pages (Settings > Pages > Deploy from a branch > `main` / root).
6. Entrá a `https://TUUSUARIO.github.io/dale-wacha/crear.html?k=TU_CLAVE` y armá el primer grupo.

## Actualizar el backend

Siempre desde **Implementar > Administrar implementaciones > ✏️ > Versión: Nueva versión**, así la URL de la API no cambia.
