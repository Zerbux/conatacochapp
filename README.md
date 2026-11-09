# CONATACOCH

## Conexión local con la API

1. El frontend usa `http://10.0.2.2:8000` por defecto en el emulador Android y `http://127.0.0.1:8000` en web o simuladores locales. Para un teléfono físico, copia `frontend/.env.example` a `frontend/.env` y cambia `EXPO_PUBLIC_API_URL` por la IP LAN del equipo donde se ejecuta Django; ambos deben estar en la misma red. Reinicia Expo después de modificar `.env`.
2. Inicia Django escuchando conexiones de la red local:

   ```powershell
   python manage.py runserver 0.0.0.0:8000
   ```

3. Desde `frontend`, inicia Expo (`npm start`). La autenticación usa tokens y las operaciones normales consultan la API; el modo local de demostración solo se activa si `EXPO_PUBLIC_DEMO_MODE=true`.

## Preparar datos locales de demostración

Aplica primero las migraciones y luego ejecuta el comando idempotente:

```powershell
python manage.py migrate
python manage.py seed_demo_data
```

El comando crea cuentas y relaciones ficticias solo si no existen, genera contraseñas al azar para las cuentas nuevas y las muestra una sola vez. No crea solicitudes ni ubicaciones con coordenadas inventadas.

## Catálogo regional de rutas

El Excel se importa de forma controlada desde el backend. Primero revisa el resultado sin escribir:

```powershell
python manage.py migrate
python manage.py importar_rutas_regionales
```

Para aplicar las rutas que pasan las validaciones:

```powershell
python manage.py importar_rutas_regionales --aplicar
```

El importador usa región, folio, nombre de itinerario, tipo de trazado, sentido, orden y calle. No consulta geocodificadores ni inventa coordenadas. Los puntos nuevos quedan sin GPS hasta que administración registre coordenadas verificadas. Las rutas incompletas y coincidencias con rutas históricas sin región se reportan y se omiten. Usa `--actualizar-existentes` solo después de revisar las diferencias; esa opción actualiza metadatos y calles, pero conserva las coordenadas existentes.

La API `POST /api/rutas/planificar/` requiere coordenadas de origen y destino. Usa los trazados institucionales como base para elegir una ruta y, cuando está disponible, obtiene una geometría real con el motor OSRM (`https://router.project-osrm.org`) usando el recorrido institucional como waypoints. Los resultados se cachean y la ruta guarda `geometry` para no recalcular en cada apertura del mapa. Si el motor no responde, el sistema usa el fallback original con proyección sobre el trazado, pero nunca dibuja una línea recta como reemplazo de la red vial.


Inicio pide el permiso de ubicación, muestra el GPS del pasajero y no consulta rutas hasta que se busca un destino. Si se deniega el permiso, se puede elegir un origen y un destino tocando el mapa. La planificación dibuja por separado las caminatas punteadas, el colectivo con el color guardado y los puntos de subida y bajada. La pestaña Rutas funciona como catálogo desplegable.

Las imágenes administrables se guardan en MEDIA_ROOT/route_images (por defecto, media/route_images) y el API las sirve desde /media/ en desarrollo. En producción se debe configurar almacenamiento persistente y la publicación de MEDIA_URL.
