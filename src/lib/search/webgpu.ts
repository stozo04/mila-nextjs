// Indexing needs WebGPU: every quantized build of the model uses GatherBlockQuantized, which
// ONNX Runtime implements for WebGPU but not in its WebAssembly build. Shared by the page
// and the indexer worker, so it must not import the model library.
export const NO_WEBGPU = 'This browser can’t build the index. Use Chrome on your computer.';

/** Works in a page or a worker: both expose navigator.gpu where WebGPU is available. */
export async function hasWebGpu() {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  return !!gpu && !!await gpu.requestAdapter().catch(() => null);
}
