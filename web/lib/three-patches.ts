/**
 * Three.js patches for browser compatibility
 *
 * This module disables ImageBitmapLoader to prevent GLTFLoader texture loading errors.
 * The error "THREE.GLTFLoader: Couldn't load texture blob:..." occurs because
 * ImageBitmapLoader has issues with blob URLs in certain environments.
 *
 * By setting createImageBitmap to undefined, we force GLTFLoader to use the
 * regular TextureLoader which handles blob URLs correctly.
 *
 * @see https://discourse.threejs.org/t/error-with-the-gltfloader-unable-to-load-texture-blob/32465
 * @see https://github.com/mrdoob/three.js/issues/20055
 */

// Only run in browser environment
if (typeof window !== 'undefined' && typeof window.createImageBitmap !== 'undefined') {
  // Store original for potential restoration
  const originalCreateImageBitmap = window.createImageBitmap

  // Disable to force GLTFLoader to use TextureLoader instead of ImageBitmapLoader
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).createImageBitmap = undefined

  // Export for debugging/restoration if needed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__originalCreateImageBitmap = originalCreateImageBitmap
}

export {}
