/**
 * Minimal WebGPU typings so the desk builds without @webgpu/types.
 * Browsers that lack WebGPU simply skip tryCreateOilRendererWebGPU.
 */
interface GPU {
  requestAdapter(options?: { powerPreference?: string }): Promise<GPUAdapter | null>;
  getPreferredCanvasFormat(): GPUTextureFormat;
}

interface GPUAdapter {
  requestDevice(): Promise<GPUDevice>;
}

type GPUTextureFormat = string;

interface GPUDevice {
  createShaderModule(desc: { code: string }): GPUShaderModule;
  createRenderPipeline(desc: unknown): GPURenderPipeline;
  createBuffer(desc: { size: number; usage: number }): GPUBuffer;
  createBindGroup(desc: unknown): GPUBindGroup;
  createCommandEncoder(): GPUCommandEncoder;
  queue: GPUQueue;
  destroy(): void;
}

interface GPUShaderModule {}
interface GPURenderPipeline {
  getBindGroupLayout(index: number): GPUBindGroupLayout;
}
interface GPUBindGroupLayout {}
interface GPUBindGroup {}
interface GPUBuffer {
  destroy(): void;
}
interface GPUQueue {
  writeBuffer(buffer: GPUBuffer, offset: number, data: Float32Array): void;
  submit(buffers: GPUCommandBuffer[]): void;
}
interface GPUCommandEncoder {
  beginRenderPass(desc: unknown): GPURenderPassEncoder;
  finish(): GPUCommandBuffer;
}
interface GPUCommandBuffer {}
interface GPURenderPassEncoder {
  setPipeline(p: GPURenderPipeline): void;
  setBindGroup(index: number, g: GPUBindGroup): void;
  draw(vertexCount: number): void;
  end(): void;
}
interface GPUCanvasContext {
  configure(desc: unknown): void;
  getCurrentTexture(): { createView(): unknown };
}

declare const GPUBufferUsage: { UNIFORM: number; COPY_DST: number };

interface Navigator {
  gpu?: GPU;
}
