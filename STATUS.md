# Warehouse City renewal — in progress

2026-09-17. Not ready to publish. No production changes made.

Base main: ab3857a34f631ba855da23a3fbf515e1526b5440, confirmed via connected GitHub API. Initial workspace empty. Git CLI anonymous access returned 404/authentication failure. Retrieved exact source via authorized connector; all blob hashes, tree and signed commit hash verified; local repository is shallow at this commit. Branch: feat/warehouse-renewal-20260917.

Baseline: 23 unit tests pass. Actual Edge screenshots and layout in qa-evidence/before. Public URL currently shows a not-found page; local exact-main baseline is explicitly distinguished. Blender 4.5.9 LTS downloaded from official distribution to D:/Codex/tools (not committed).

Resume: `npm ci`; run a local static HTTP server on port 4173; `npm test`; `node tests/browser.mjs`. Blender: `D:/Codex/tools/blender-4.5.9/blender-4.5.9-windows-x64/blender.exe --background --python scripts/build-assets.py`.

Remaining: Blender asset production and inspection, modular asset runtime, small demo quality gate, editor and deterministic logistics model, camera/collision improvements, storage compatibility, performance and visual browser evidence, PR/merge and deployed verification. No background development is implied by this document.
