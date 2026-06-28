import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import * as esbuild from "esbuild";

const SHOULD_ZIP = process.argv.includes("--zip");
const SHOULD_WATCH = process.argv.includes("--watch");

const ENTRY_POINTS = ["src/background.ts", "src/content.ts", "src/options.ts"];

async function copyDirectory(source: string, destination: string): Promise<void> {
  await fs.mkdir(destination, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, destinationPath);
    } else {
      await fs.copyFile(sourcePath, destinationPath);
    }
  }
}

async function copyAssets(): Promise<void> {
  await fs.mkdir("dist/assets", { recursive: true });
  await fs.copyFile("src/options.html", "dist/options.html");
  await copyDirectory("assets", "dist/assets");
}

async function writeManifest(): Promise<void> {
  const packageJson = JSON.parse(await fs.readFile("package.json", "utf8")) as { version: string };
  const manifest = JSON.parse(await fs.readFile("manifest.chrome.json", "utf8")) as {
    version: string;
  };
  manifest.version = packageJson.version;
  await fs.writeFile("dist/manifest.json", JSON.stringify(manifest, null, 2));
}

async function zipPackage(): Promise<void> {
  const packageJson = JSON.parse(await fs.readFile("package.json", "utf8")) as { version: string };
  const zipName = `tora-chrome-v${packageJson.version}.zip`;
  const zipResult = spawnSync("zip", ["-r", zipName, "dist"], { stdio: "inherit" });
  if (zipResult.status !== 0) {
    process.exit(zipResult.status ?? 1);
  }
}

async function build(): Promise<void> {
  await fs.rm("dist", { recursive: true, force: true });

  const commonOptions: esbuild.BuildOptions = {
    entryPoints: ENTRY_POINTS,
    bundle: true,
    outdir: "dist",
    format: "iife",
    target: "esnext",
    loader: {
      ".svg": "text",
    },
  };

  if (SHOULD_WATCH) {
    const ctx = await esbuild.context({
      ...commonOptions,
      sourcemap: true,
    });
    await ctx.watch();
    console.log("Watching for changes...");
  } else {
    await esbuild.build(commonOptions);
    await copyAssets();
    await writeManifest();

    if (SHOULD_ZIP) {
      await zipPackage();
    }

    console.log("Build complete.");
  }
}

void build();
