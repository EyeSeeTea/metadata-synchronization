# Plan de acciones según informe Snyk (36 vulnerabilidades)

**Informe:** 9 feb 2026 · 36 vulnerabilidades · 75 rutas afectadas  
**Origen:** `yarn.lock` (yarn)

---

## Resumen por severidad

| Severidad | Cantidad | Acción principal |
|-----------|----------|-------------------|
| **Critical** | 1 | form-data (transitiva) → resolution |
| **High** | 6 | validator, qs, mocha, i18next, axios → upgrades + resolutions |
| **Medium** | 26 | Varios; la mayoría con upgrade o resolution |
| **Low** | 2 | vite, sirv → upgrade de vite / vitest |

---

## 1. Cambios directos en `package.json`

Paquetes que puedes actualizar en dependencias/devDependencies:

| Paquete | Actual | Objetivo | Notas |
|---------|--------|----------|--------|
| **lodash** | 4.17.21 | **4.17.23** | Prototype Pollution (Medium). Cambio menor. |
| **qs** | ^6.12.1 | **6.14.1** (o `^6.14.1`) | Allocation of Resources (High). Fijar mínima segura. |
| **vite** | ^4.0.0 | **5.4.21** o **6.4.1** | Directory Traversal (Medium), Relative Path Traversal (Low). Revisar [guía de migración Vite 4→5](https://vitejs.dev/guide/migration.html). |
| **eslint** | ^8.37.0 | **9.26.0** | Uncontrolled Recursion (Medium). ESLint 9 tiene breaking changes; planificar migración. |
| **mocha** | 9.1.3 | **10.1.0** | ReDoS (High). También arrastra validator, serialize-javascript, nanoid, minimatch, diff. |
| **cypress** | 8.6.0 | **Última 13.x** (si aplica) | Reduce form-data, tmp, @cypress/request. Comprobar compatibilidad con tests E2E. |

**Recomendación inmediata (bajo riesgo):**

- `lodash`: 4.17.21 → 4.17.23  
- `qs`: ^6.12.1 → 6.14.1 (o `"qs": "6.14.1"`)

**Recomendación con pruebas:**

- `mocha`: 9.1.3 → 10.1.0 (ejecutar `yarn test` y cualquier script que use mocha/mochawesome).
- `vite`: ^4.0.0 → 5.4.21 (ejecutar build y dev, revisar cambios de configuración).

**Recomendación planificada:**

- `eslint`: 8 → 9 (cambios de config y posiblemente de reglas).

---

## 2. Resolutions (Yarn) para dependencias transitivas

Añadir en `package.json` una sección `"resolutions"` (o ampliar la actual) para forzar versiones seguras de paquetes que vienen por otras dependencias:

```json
"resolutions": {
  "@types/react": "17.0.30",
  "@types/react-dom": "17.0.9",
  "form-data": "4.0.4",
  "validator": "13.15.22",
  "qs": "6.14.1",
  "mocha": "10.1.0",
  "i18next": "19.8.5",
  "axios": "1.12.0",
  "tmp": "0.2.4",
  "serialize-javascript": "6.0.2",
  "node-fetch": "2.6.7",
  "nanoid": "5.0.9",
  "minimatch": "3.0.5",
  "lodash": "4.17.23",
  "js-yaml": "4.1.1",
  "glob-parent": "5.1.2",
  "eslint": "9.26.0",
  "diff": "5.2.2",
  "vite": "5.4.21",
  "sirv": "3.0.2"
}
```

**Importante:**

- Tras añadir o modificar `resolutions`, ejecutar `yarn install` y luego **tests + build**.
- Si alguna resolución rompe compatibilidad (p. ej. con @dhis2/d2-i18n o @eyeseetea/d2-api), se puede quitar esa línea y dejar solo las que no den problemas.
- `axios` ya está en 1.12.0 como dependencia directa; la resolution asegura que todas las ramas del árbol usen esa versión.

---

## 3. Vulnerabilidades sin versión corregida

| Paquete | Severidad | Introducido por | Acción sugerida |
|---------|-----------|------------------|------------------|
| **node-gettext** | Medium (Prototype Pollution) | @dhis2/d2-i18n-extract | Seguir actualizaciones de @dhis2/d2-i18n-extract; valorar issue/PR al mantenedor. |
| **inflight** | Medium (Missing Release of Resource) | rimraf@3.0.2 y otros | Valorar migrar a `rimraf@5` o a `del`/`fs-extra`; o aceptar riesgo en dev. |
| **elliptic** | Medium (Crypto Risky Implementation) | vite-plugin-node-polyfills | Revisar si el plugin es imprescindible; si hay alternativa sin elliptic; o aceptar riesgo. |

No hay upgrade directo que las resuelva; solo mitigación (cambiar de dependencia donde sea posible) o aceptación de riesgo documentada.

---

## 4. Orden de ejecución sugerido

1. **Fase 1 – Sin riesgo alto**  
   - Actualizar en `package.json`: `lodash` → 4.17.23, `qs` → 6.14.1.  
   - Añadir solo las `resolutions` que no toquen núcleo (por ejemplo: `form-data`, `validator`, `tmp`, `serialize-javascript`, `nanoid`, `minimatch`, `lodash`, `glob-parent`, `sirv`).  
   - `yarn install` → `yarn test` → `yarn build` (o equivalente).

2. **Fase 2 – Dependencias de desarrollo**  
   - Subir **mocha** a 10.1.0 y **eslint** a 9.26.0 (con migración de config si hace falta).  
   - Añadir resolutions para **mocha**, **eslint**, **diff**, **js-yaml**.  
   - Volver a ejecutar tests y lint.

3. **Fase 3 – Build y runtime**  
   - Subir **vite** a 5.4.21 (o 6.4.1) y ajustar configuración si es necesario.  
   - Añadir resolutions para **vite**, **i18next**, **axios**, **node-fetch**, **qs** (si no se ha fijado ya en Fase 1).  
   - Probar `yarn start:run`, `yarn build`, y flujos críticos de la app.

4. **Fase 4 – Cypress y E2E**  
   - Actualizar **cypress** a la última 13.x compatible con vuestros tests.  
   - Comprobar que form-data, tmp y @cypress/request queden en versiones seguras (o documentar si no es posible).

5. **Re-ejecutar Snyk**  
   - `snyk test` (o el comando que uséis) y comparar con el informe actual.  
   - Documentar las que queden abiertas (p. ej. node-gettext, inflight, elliptic) y la decisión (mitigar / aceptar riesgo).

---

## 5. Checklist rápido

- [ ] lodash 4.17.23 en dependencies  
- [ ] qs 6.14.1 en dependencies  
- [ ] resolutions añadidas/actualizadas en package.json  
- [ ] yarn install  
- [ ] yarn test  
- [ ] yarn build / build:variant  
- [ ] mocha 10.1.0 (y migración si hace falta)  
- [ ] vite 5.4.21 o 6.4.1 (y migración de config)  
- [ ] eslint 9.26.0 (y migración de config)  
- [ ] cypress actualizado  
- [ ] snyk test final y documento de excepciones (sin fix)

Si quieres, el siguiente paso puede ser aplicar solo la Fase 1 (cambios en `lodash`, `qs` y un primer bloque de `resolutions`) en el repo y dejar listo un PR o commit con el plan en este doc.
