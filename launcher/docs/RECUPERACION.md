# Recuperacion y reversion

El launcher de Google (`com.google.android.tvlauncher`) **nunca se desactiva**, asi que siempre hay otro HOME disponible.

## Antes de instalar

- Revisa el APK (nombre y SHA-256 impresos en el log de GitHub Actions).
- La instalacion y el cambio de HOME requieren tu aprobacion expresa. Son pasos separados.

## Volver al launcher original

1. **Desde el propio launcher:** boton "Launcher original" (pie de pantalla).
2. **Si lo fijaste como HOME por ADB:**
   `./adb shell cmd package set-home-activity com.google.android.tvlauncher`
   (usar solo el nombre del paquete; la ayuda de `set-home-activity` en este firmware lo recomienda).
3. **Si el TV no responde bien:** abre Ajustes > Apps y desinstala "Inicio TV"; el HOME vuelve al del sistema.

## Desinstalar

- Por ADB: `./adb shell pm uninstall app.tvhome.launcher`
- O desde Ajustes > Apps > Inicio TV > Desinstalar.
- Su unico dato propio es el orden de apps (`SharedPreferences`); se borra al desinstalar.

## No se hace nunca

Root, restablecimiento de fabrica, modificar particiones del sistema, desactivar el launcher de Google, PatchWall o servicios criticos de Xiaomi.
