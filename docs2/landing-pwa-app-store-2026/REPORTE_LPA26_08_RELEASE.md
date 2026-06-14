# LPA26-08 - Release stores y go-live

## Resultado

La fase LPA26-08 deja runbook go-live, checklist web/PWA, checklist Android/iOS, monitoreo y rollback. No se genero build store real porque depende de EAS vinculado, Play Console y Apple Developer.

## Entregables

- `RUNBOOK_LPA26_GO_LIVE.md`
- `GUIA_LPA26_ANDROID_IOS.md`
- `METADATA_STORES_NOMINA_EC.md`
- `REPORTE_LPA26_07_QA.md`
- AuditLock final LPA26.

## Validaciones heredadas

- `npm.cmd run smoke:pwa`: PASS en LPA26-07.
- `npm.cmd run check:stores`: PASS en LPA26-07.
- `npx.cmd expo-doctor`: PASS 21/21 en LPA26-07.
- QA DOM desktop/mobile: PASS en LPA26-07.

## Bloqueos externos finales

- Google Play Console.
- Apple Developer / App Store Connect.
- EAS `projectId` real.
- `appleTeamId`, `ascAppId`, certificados y perfiles.
- URLs productivas reales.
- Revision legal LOPDP profesional.
