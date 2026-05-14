import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as esbuild from "esbuild";

const LOADERS = new Map([
  [".ts", "ts"],
  [".tsx", "tsx"],
]);
const EMPTY_MODULE_EXTENSIONS = new Set([".css", ".scss"]);
const packageRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const srcRoot = join(packageRoot, "src");

export async function resolve(specifier, context, defaultResolve) {
  if (specifier.startsWith("@/")) {
    const path = resolveSourcePath(join(srcRoot, specifier.slice(2)));
    if (path) {
      return {
        shortCircuit: true,
        url: pathToFileURL(path).href,
      };
    }
  }

  if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    const parentDirectory = dirname(fileURLToPath(context.parentURL));
    const path = resolveSourcePath(join(parentDirectory, specifier));
    if (path) {
      return {
        shortCircuit: true,
        url: pathToFileURL(path).href,
      };
    }
  }

  return defaultResolve(specifier, context, defaultResolve);
}

export async function load(url, context, defaultLoad) {
  if (isEmptyModuleUrl(url)) {
    return {
      format: "module",
      shortCircuit: true,
      source: "export default \"\";",
    };
  }

  const loader = loaderForUrl(url);
  if (!loader) {
    return defaultLoad(url, context, defaultLoad);
  }

  const source = await readFile(fileURLToPath(url), "utf8");
  const result = await esbuild.transform(source, {
    format: "esm",
    jsx: "automatic",
    loader,
    sourcemap: "inline",
    target: "es2022",
  });

  return {
    format: "module",
    shortCircuit: true,
    source: result.code,
  };
}

function loaderForUrl(url) {
  for (const [extension, loader] of LOADERS.entries()) {
    if (url.endsWith(extension)) return loader;
  }

  return null;
}

function isEmptyModuleUrl(url) {
  if (!url.startsWith("file:")) return false;
  return EMPTY_MODULE_EXTENSIONS.has(extname(fileURLToPath(url)));
}

function resolveSourcePath(basePath) {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    join(basePath, "index.ts"),
    join(basePath, "index.tsx"),
    join(basePath, "index.js"),
    join(basePath, "index.jsx"),
  ];

  return candidates.find((candidate) => {
    if (!existsSync(candidate)) return false;
    return statSync(candidate).isFile();
  }) ?? null;
}
