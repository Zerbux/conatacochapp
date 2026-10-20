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
