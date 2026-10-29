/* El arte de manifestar · comportamiento del sitio
   - Reproductor de audio de cada sesión
   - Registro (nombre y correo) antes de empezar
   - Progreso del recorrido (se guarda en el navegador de cada persona)
   - Mensaje final del cierre
*/
(function () {
  'use strict';

  /* ===== CONFIGURACIÓN =====================================================
     Para recibir los registros y los mensajes del cierre en una hoja de Google,
     pega aquí la URL de tu Google Apps Script (ver README.md). Mientras esté
     vacía, el sitio funciona igual pero los datos no se envían a ningún lado. */
  var FORM_ENDPOINT = '';
  /* ======================================================================= */

  var KEY_HECHAS = 'eam-sesiones-hechas';
  var KEY_REGISTRO = 'eam-registro';
  var TOTAL = 11;

  function leer(clave, porDefecto) {
    try { var v = localStorage.getItem(clave); return v ? JSON.parse(v) : porDefecto; }
    catch (e) { return porDefecto; }
  }
  function guardar(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* navegador sin almacenamiento */ }
  }
  function enviar(tipo, datos) {
    if (!FORM_ENDPOINT) return Promise.resolve();
    var cuerpo = new URLSearchParams();
    cuerpo.append('tipo', tipo);
    cuerpo.append('fecha', new Date().toISOString());
    Object.keys(datos).forEach(function (k) { cuerpo.append(k, datos[k] || ''); });
    return fetch(FORM_ENDPOINT, { method: 'POST', mode: 'no-cors', body: cuerpo })
      .catch(function () { /* si falla la red, la persona igual puede seguir */ });
  }
  function tiempo(t) {
    t = Math.max(0, Math.floor(t || 0));
    var m = Math.floor(t / 60), s = t % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function marcarHecha(n) {
    var hechas = leer(KEY_HECHAS, []);
    if (hechas.indexOf(n) === -1) { hechas.push(n); guardar(KEY_HECHAS, hechas); }
  }

  /* ---------- Reproductores ---------- */
  var sesion = parseInt(document.body.getAttribute('data-sesion') || '0', 10);

  Array.prototype.forEach.call(document.querySelectorAll('audio[data-player]'), function (audio) {
    var caja = audio.closest('.medita') || audio.parentElement;
    var relleno = caja.querySelector('[data-role="fill"]');
    var perilla = caja.querySelector('[data-role="knob"]');
    var transcurrido = caja.querySelector('[data-role="elapsed"]');
    var barra = caja.querySelector('[data-role="bar"]');
    var btnPlay = caja.querySelector('[data-act="toggle"]');
    var icoPlay = btnPlay.querySelector('[data-role="play"]');
    var icoPausa = btnPlay.querySelector('[data-role="pause"]');

    function pintar() {
      var d = audio.duration || 0;
      var p = d ? Math.min(100, (audio.currentTime / d) * 100) : 0;
      relleno.style.width = p + '%';
      perilla.style.left = p + '%';
      transcurrido.textContent = tiempo(audio.currentTime);
      if (sesion && d && audio.currentTime / d > 0.9) marcarHecha(sesion);
    }
    function estado() {
      var sonando = !audio.paused;
      icoPlay.style.display = sonando ? 'none' : 'flex';
      icoPausa.style.display = sonando ? 'flex' : 'none';
      btnPlay.setAttribute('aria-label', sonando ? 'Pausar' : 'Reproducir');
    }
    function mover(seg) {
      var d = audio.duration || 0;
      audio.currentTime = Math.max(0, Math.min(d || Infinity, audio.currentTime + seg));
      pintar();
    }

    audio.addEventListener('timeupdate', pintar);
    audio.addEventListener('loadedmetadata', pintar);
    audio.addEventListener('play', estado);
    audio.addEventListener('pause', estado);
    audio.addEventListener('ended', function () { estado(); if (sesion) marcarHecha(sesion); });

    btnPlay.addEventListener('click', function () {
      if (audio.paused) { var p = audio.play(); if (p && p.catch) p.catch(function () {}); }
      else audio.pause();
    });
    caja.querySelector('[data-act="back"]').addEventListener('click', function () { mover(-15); });
    caja.querySelector('[data-act="fwd"]').addEventListener('click', function () { mover(15); });
    if (barra) {
      barra.addEventListener('click', function (e) {
        var r = barra.getBoundingClientRect();
        if (audio.duration) { audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration; pintar(); }
      });
    }
    if ('mediaSession' in navigator && window.MediaMetadata) {
      audio.addEventListener('play', function () {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : 'El arte de manifestar',
          artist: 'El arte de manifestar'
        });
      });
    }
  });

  /* ---------- Registro ---------- */
  var formRegistro = document.getElementById('registro-form');
  if (formRegistro) {
    if (leer(KEY_REGISTRO, null)) {
      // "Solo te lo pediremos una vez": si ya se registró, pasa directo al recorrido
      location.replace('recorrido.html');
    } else {
      formRegistro.addEventListener('submit', function (e) {
        e.preventDefault();
        var nombre = formRegistro.nombre.value.trim();
        var correo = formRegistro.correo.value.trim();
        var autoriza = formRegistro.autoriza.checked;
        var aviso = formRegistro.querySelector('[data-role="error"]');
        var error = '';
        if (!nombre) error = 'Escribe tu nombre para continuar.';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) error = 'Revisa tu correo, parece que le falta algo.';
        else if (!autoriza) error = 'Marca la autorización para continuar.';
        if (error) { aviso.textContent = error; aviso.hidden = false; return; }
        aviso.hidden = true;
        var boton = formRegistro.querySelector('button[type="submit"]');
        boton.disabled = true;
        guardar(KEY_REGISTRO, { nombre: nombre, correo: correo, fecha: new Date().toISOString() });
        enviar('registro', { nombre: nombre, correo: correo, autoriza: 'si' })
          .then(function () { location.href = 'recorrido.html'; });
      });
    }
  }

  /* ---------- Recorrido ---------- */
  var enlaces = document.querySelectorAll('a[data-n]');
  if (enlaces.length) {
    var hechas = leer(KEY_HECHAS, []);
    var siguiente = 0;
    for (var i = 1; i <= TOTAL; i++) { if (hechas.indexOf(i) === -1) { siguiente = i; break; } }

    var check = '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>';
    var flecha = '<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#4F4557" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"></path></svg>';
    var serif = "font-family: 'Cormorant Garamond', Georgia, serif;";

    Array.prototype.forEach.call(enlaces, function (a) {
      var n = parseInt(a.getAttribute('data-n'), 10);
      var titulo = a.querySelector('span[style*="Cormorant"]').textContent;
      var meta = a.querySelector('span[style*="font-size: 12px"]').textContent;
      if (n === siguiente) {
        a.setAttribute('style', 'display: flex; align-items: center; gap: 14px; margin: 8px -12px; padding: 16px 12px; border-radius: 18px; background: #E3DFE3; color: #3A3530; text-decoration: none;');
        a.innerHTML =
          '<span style="flex: none; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: #6F6377; color: #F7F3EC; font-size: 13px; font-weight: 600;">' + n + '</span>' +
          '<span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px;">' +
          '<span style="font-size: 10px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: #4F4557;">' + (hechas.length ? 'Continúa aquí' : 'Empieza aquí') + '</span>' +
          '<span style="' + serif + ' font-size: 23px; font-weight: 600; line-height: 1.1;">' + titulo + '</span>' +
          '<span style="font-size: 12px; color: #4F4557;">' + meta + '</span></span>' + flecha;
      } else {
        var hecha = hechas.indexOf(n) !== -1;
        a.setAttribute('style', 'display: flex; align-items: center; gap: 14px; min-height: 64px; color: #3A3530; text-decoration: none;');
        var insignia = hecha
          ? '<span aria-label="Completada" style="flex: none; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: #DDE2DC; color: #46523F;">' + check + '</span>'
          : '<span style="flex: none; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; border: 1px solid #CFC5B4; color: #6B6259; font-size: 13px; box-sizing: border-box;">' + n + '</span>';
        a.innerHTML = insignia +
          '<span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;">' +
          '<span style="' + serif + ' font-size: 21px; font-weight: 500;">' + titulo + '</span>' +
          '<span style="font-size: 12px; color: #6B6259;">' + meta + '</span></span>';
      }
    });

    var cantidad = ['', 'una sesión', 'dos sesiones', 'tres sesiones', 'cuatro sesiones', 'cinco sesiones', 'seis sesiones', 'siete sesiones', 'ocho sesiones', 'nueve sesiones', 'diez sesiones', 'once sesiones'];
    var ordinal = ['', 'primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava', 'novena', 'décima', 'undécima'];
    var resumen = document.querySelector('[data-role="resumen"]');
    if (resumen) {
      if (!hechas.length) resumen.textContent = 'Empieza por la primera sesión. Avanzas a tu ritmo y puedes volver a cualquiera cuando lo necesites.';
      else if (!siguiente) resumen.textContent = 'Recorriste las once sesiones. Puedes volver a cualquiera cuando lo necesites.';
      else resumen.textContent = 'Has recorrido ' + cantidad[hechas.length] + '. Puedes seguir con la ' + ordinal[siguiente] + ' o volver a cualquiera de las anteriores.';
    }
    var barraProgreso = document.querySelector('[data-role="barra"]');
    if (barraProgreso) {
      var html = '';
      for (var k = 1; k <= TOTAL; k++) {
        var color = hechas.indexOf(k) !== -1 ? '#7D8A7C' : (k === siguiente ? '#9C92A3' : '#DDD4C4');
        html += '<span style="flex: 1; height: 3px; border-radius: 2px; background: ' + color + ';"></span>';
      }
      barraProgreso.innerHTML = html;
      barraProgreso.setAttribute('aria-label', hechas.length + ' de ' + TOTAL + ' sesiones recorridas');
    }
  }

  /* ---------- Cierre ---------- */
  var formCierre = document.getElementById('cierre-form');
  if (formCierre) {
    var registro = leer(KEY_REGISTRO, null);
    if (registro && registro.nombre) formCierre.nombre.value = registro.nombre;
    formCierre.addEventListener('submit', function (e) {
      e.preventDefault();
      var nombre = formCierre.nombre.value.trim();
      var aviso = formCierre.querySelector('[data-role="error"]');
      if (!nombre) { aviso.hidden = false; return; }
      aviso.hidden = true;
      enviar('mensaje-final', {
        nombre: nombre,
        correo: registro ? registro.correo : '',
        mensaje: formCierre.mensaje.value.trim()
      });
      formCierre.hidden = true;
      var gracias = document.querySelector('[data-role="enviado"]');
      gracias.querySelector('[data-role="nombre"]').textContent = nombre;
      gracias.hidden = false;
    });
  }
})();
