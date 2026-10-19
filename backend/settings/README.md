# Django settings

The project uses separate settings modules:

- `backend.settings.development` is the default for `python manage.py` commands.
- `backend.settings.production` is for deployed environments and requires environment variables.

For production, set `DJANGO_SETTINGS_MODULE=backend.settings.production` and provide:

- `DJANGO_SECRET_KEY`
- `DJANGO_ALLOWED_HOSTS` (comma-separated host names, without a scheme)
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and `DB_HOST`
- `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` when the deployed frontend needs cross-origin access (comma-separated origins including `https://`)
- `DB_PORT` if PostgreSQL does not use port `5432`

In PowerShell, for example:

```powershell
$env:DJANGO_SETTINGS_MODULE = "backend.settings.production"
$env:DJANGO_SECRET_KEY = "<a-long-random-secret>"
$env:DJANGO_ALLOWED_HOSTS = "api.example.com"
$env:DB_NAME = "colectivos_db"
$env:DB_USER = "app_user"
$env:DB_PASSWORD = "<database-password>"
$env:DB_HOST = "db.example.com"
python manage.py check
```

Keep production values in the hosting platform's secret/environment configuration, not in source control. Configure HTTPS at the application server or reverse proxy before serving production traffic.
