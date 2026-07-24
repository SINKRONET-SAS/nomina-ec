# HDG26-00 - Gobierno y baseline

Lee `RULES.md`, el plan HDG26 y `.github/CODEX_CONTEXT.md`. Preserva cambios locales previos del usuario.

1. Verifica rama, estado, pruebas existentes y lock HCF26 cerrado.
2. Registra la cadena HDG26 con el hash SHA256 del `AuditLock.json` anterior.
3. Despliega plan, contexto y prompts en UTF-8 sin BOM.
4. No cambies runtime en esta fase.
5. Valida JSON, UTF-8 y firma AuditLock con `phaseCompleted: HDG26-00`.

Gate: continuar solo con baseline y gobierno encadenados.
