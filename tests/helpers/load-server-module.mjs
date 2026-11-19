import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Explicit dependency injection keeps tests away from .env, databases and paid APIs.
export function loadTs(file, dependencies = {}, globals = {}) {
  const source = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const compiledModule = { exports: {} };
  runInNewContext(outputText, {
    module: compiledModule, exports: compiledModule.exports, AbortSignal, URL,
    require(id) {
      if (id === "server-only") return {};
      if (id in dependencies) return dependencies[id];
      throw new Error(`Unexpected dependency: ${id}`);
    },
    ...globals,
  }, { filename: file });
  return compiledModule.exports;
}
