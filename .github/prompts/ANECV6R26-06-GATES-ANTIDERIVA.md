# ANECV6R26-06 - GATES Y ANTI-DERIVA

Objetivo:

- dejar un test focalizado que evite perder otra vez el seed de SUPERADMIN en Render;
- correr gates tecnicos minimos.

Gates:

- `npm.cmd test --workspace=backend -- --runTestsByPath __tests__/seedSuperadminScript.test.js`
- `npm.cmd run audit:integral-quality`
- `npm.cmd run lint --workspaces --if-present`
- `git diff --check`
