# El arte de manifestar · de adentro hacia afuera

Sitio estático del programa de 11 sesiones. Funciona en GitHub Pages sin instalar nada.

## Qué hay en esta carpeta

| Archivo o carpeta | Qué es |
|---|---|
| `index.html` | Bienvenida (la primera página del sitio) |
| `introduccion.html` | Introducción en audio y preparación |
| `registro.html` | "Antes de comenzar": nombre, correo y autorización |
| `recorrido.html` | Lista de las 11 sesiones con el avance de cada persona |
| `sesion-1.html` … `sesion-11.html` | Una página por sesión |
| `cierre.html` | Gracias y mensaje final |
| `audios/` | Los 12 audios (introducción y 11 sesiones), en .m4a |
| `fotos/` | Fotografías y texturas |
| `sitio.js` | Reproductor, registro, avance del recorrido y mensaje final |
| `sitio.css` | Ajustes para que el diseño se vea bien en celular y computador |

## Publicarlo en GitHub Pages

1. Entra a github.com y crea un repositorio nuevo, por ejemplo `el-arte-de-manifestar`. Puede ser público.
2. En el repositorio, elige **Add file → Upload files** y arrastra **todo el contenido** de esta carpeta (los archivos y las carpetas `audios` y `fotos`, no la carpeta que los contiene). Si el navegador no deja subir todo de una vez, sube primero los archivos sueltos y `fotos`, y después `audios`.
3. Pulsa **Commit changes**.
4. Ve a **Settings → Pages**. En "Branch" elige `main` y la carpeta `/ (root)`, y guarda.
5. En uno o dos minutos aparece el enlace del sitio, con la forma `https://TU-USUARIO.github.io/el-arte-de-manifestar/`.

Para usar un dominio propio (por ejemplo `manifestar.travelsoultosoul.com`), en **Settings → Pages → Custom domain** escribe el dominio y crea en tu proveedor de dominio un registro CNAME que apunte a `TU-USUARIO.github.io`.

## Recibir los registros y los mensajes en una hoja de Google

Mientras no hagas este paso, el sitio funciona igual, pero los nombres, correos y mensajes no llegan a ningún lado.

1. Crea una hoja de cálculo nueva en Google Drive. En la primera fila escribe: `fecha | tipo | nombre | correo | autoriza | mensaje`.
2. En la hoja, ve a **Extensiones → Apps Script**, borra lo que haya y pega esto:

```javascript
function doPost(e) {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var p = e.parameter;
  hoja.appendRow([p.fecha, p.tipo, p.nombre, p.correo, p.autoriza || '', p.mensaje || '']);
  return ContentService.createTextOutput('ok');
}
```

3. Pulsa **Implementar → Nueva implementación**, tipo **Aplicación web**. En "Quién tiene acceso" elige **Cualquier persona**. Autoriza los permisos que pida.
4. Copia la URL que te da (termina en `/exec`).
5. Abre `sitio.js` y pega esa URL entre las comillas de `var FORM_ENDPOINT = '';`. Guarda y vuelve a subir `sitio.js` al repositorio.

Cada registro llega como una fila con tipo `registro`, y cada mensaje del cierre como una fila con tipo `mensaje-final`.

## Pendientes antes de compartir

- **Política de tratamiento de datos.** El enlace de la casilla de autorización en `registro.html` todavía apunta a `#`. Hay que crear esa página (o enlazar la de travelsoultosoul.com) y cambiar el `href`.
- **Duración de la sesión 11 en el recorrido.** En `recorrido.html` dice "Meditación larga · sin escritura". El audio dura 16 minutos, por si quieres ponerlo.

## Cómo funciona el avance

- El avance de cada persona se guarda en su propio navegador. Una sesión queda marcada como recorrida cuando escucha más del 90 % del audio.
- Si la persona cambia de celular o borra los datos del navegador, el avance vuelve a empezar y se le pide de nuevo el registro.
- El registro se pide una sola vez por navegador.
