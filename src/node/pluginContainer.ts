import type {
  LoadResult,
  PartialResolvedId,
  SourceDescription,
  PluginContext as RollupPluginContext,
  ResolvedId,
  AcornNode,
  EmitAsset,
  EmitChunk,
  EmitFile,
  GetModuleInfo,
  IsExternal,
  ModuleInfo,
  ModuleOptions,
  PartialNull,
  PluginCache,
  PluginContextMeta,
  RollupError,
  RollupWarning,
} from "rollup";
import { Plugin } from "./plugin";

export interface PluginContainer {
  resolveId(id: string, importer?: string): Promise<PartialResolvedId | null>;
  load(id: string): Promise<LoadResult | null>;
  transform(code: string, id: string): Promise<SourceDescription | null>;
}

// 模拟 Rollup 的插件机制
export const createPluginContainer = (plugins: Plugin[]): PluginContainer => {
  // 插件上下文对象
  class Context implements RollupPluginContext {
    addWatchFile: (id: string) => void;
    cache: PluginCache;
    emitAsset: EmitAsset;
    emitChunk: EmitChunk;
    emitFile: EmitFile;
    error: (err: RollupError | string, pos?: number | { column: number; line: number; }) => never;
    getAssetFileName: (assetReferenceId: string) => string;
    getChunkFileName: (chunkReferenceId: string) => string;
    getFileName: (fileReferenceId: string) => string;
    getModuleIds: () => IterableIterator<string>;
    getModuleInfo: GetModuleInfo;
    getWatchFiles: () => string[];
    isExternal: IsExternal;
    load: (options: { id: string; resolveDependencies?: boolean; } & Partial<PartialNull<ModuleOptions>>) => Promise<ModuleInfo>;
    moduleIds: IterableIterator<string>;
    parse: (input: string, options?: any) => AcornNode;
    resolveId: (source: string, importer?: string) => Promise<string | null>;
    setAssetSource: (assetReferenceId: string, source: string | Uint8Array) => void;
    warn: (warning: RollupWarning | string, pos?: number | { column: number; line: number; }) => void;
    meta: PluginContextMeta;
    async resolve(id: string, importer?: string) {
      let out = await pluginContainer.resolveId(id, importer);
      if (typeof out === "string") out = { id: out };
      return out as ResolvedId | null;
    }
  }
  // 插件容器
  const pluginContainer: PluginContainer = {
    async resolveId(id: string, importer?: string) {
      const ctx = new Context() as any;
      for (const plugin of plugins) {
        if (plugin.resolveId) {
          const newId = await plugin.resolveId.call(ctx as any, id, importer);
          if (newId) {
            id = typeof newId === "string" ? newId : newId.id;
            return { id };
          }
        }
      }
      return null;
    },
    async load(id) {
      const ctx = new Context() as any;
      for (const plugin of plugins) {
        if (plugin.load) {
          const result = await plugin.load.call(ctx, id);
          if (result) {
            return result;
          }
        }
      }
      return null;
    },
    async transform(code, id) {
      const ctx = new Context() as any;
      for (const plugin of plugins) {
        if (plugin.transform) {
          const result = await plugin.transform.call(ctx, code, id);
          if (!result) continue;
          if (typeof result === "string") {
            code = result;
          } else if (result.code) {
            code = result.code;
          }
        }
      }
      return { code };
    },
  };

  return pluginContainer;
};
