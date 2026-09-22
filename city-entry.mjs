/** Keep the editor usable on devices where the browser cannot create a WebGL 2 context. */
export function supportsWebGL2(makeCanvas = () => document.createElement('canvas')) {
  let context;
  try {
    context = makeCanvas().getContext('webgl2', {failIfMajorPerformanceCaveat: false});
    return !!context;
  } catch {
    return false;
  } finally {
    try { context?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* Capability detection must not prevent 2D startup. */ }
  }
}

if (typeof document !== 'undefined') {
  const flat = new URLSearchParams(location.search).get('renderer') === '2d';
  if (!flat && supportsWebGL2()) {
    await import('./city-app.mjs');
  } else {
    await import('./city-fallback.mjs');
  }
}
