# Assets and dependencies

Original assets in assets/source and assets/models were created for Warehouse City with scripts/build-assets.py using Blender 4.5.9 LTS. They are offered under CC0-1.0. No competitor model, logo, screenshot or code is included in the application. Per-asset provenance, units, axes and dimensions are in assets/manifest.json.

Three.js 0.185.0 (including GLTFLoader, SkeletonUtils, BufferGeometryUtils and RoomEnvironment): Three.js authors, MIT, https://github.com/mrdoob/three.js/tree/r185. License: licenses/THREE-LICENSE.txt. Existing engine is byte-identical to this release. Addons copied without source modification. Classic uses the unchanged existing vendor files.

Blender 4.5.9 LTS: https://download.blender.org/release/Blender4.5/. Blender executable is not distributed in this repository. Blend sources are editable; GLB files are exported with mesh material and animation data.

Playwright 1.55.0 is a development-only dependency, Apache-2.0, Microsoft, https://github.com/microsoft/playwright. Not shipped in the site.

@tarikjabiri/dxf 2.8.9: Tarik Jabiri and contributors, MIT, https://github.com/dxfjs/writer. Browser ESM build copied to vendor/dxf.mjs without modifications; license in licenses/dxf-MIT.txt. Used for genuine DXF entities, not DWG conversion. ezdxf 1.4.3 (MIT, Manfred Moitzi) is validation tooling only, not shipped in the web app.
