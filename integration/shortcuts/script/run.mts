#!/usr/bin/env node --loader tsx
import fs from "fs";
import url from "url";
import yaml from "yaml";

import { ToolSpec, ToolboxAPI } from "@iter-ai/toolbox-macos-integration";

import { Path, Shell } from "../lib/native.ts";
import { build } from "./build.mts";

/*
  Run a shortcut from the command line

  Usage:
    ./run.mts <tool> <param1>=<value1> <param2>=<value2> ...
 */

export const resolver: ToolboxAPI.Module = {
  isReady: (): boolean => Shell.listShortcuts().includes(Path.toolboxShortcutName),
  setup: async (): Promise<void> => {
    if (!fs.existsSync(Path.toolboxShortcutFile)) {
      // build the shortcut
      await build();
    }

    Shell.openFile(Path.toolboxShortcutFile);
  },
  list: (): ToolSpec[] => {
    if (fs.existsSync(Path.toolboxSpec)) {
      // read spec from file
      return yaml.parse(fs.readFileSync(Path.toolboxSpec).toString());
    }

    throw new Error("Shortcut spec not found");
  },
  run: (toolId: string, params: Record<string, any>): any => {
    return Shell.runShortcut({ tool: toolId, params });
  },
};

// Run the shortcut if invoked from cli
if (url.fileURLToPath(import.meta.url) === process.argv[1]) {
  const [_, __, tool, ...params] = process.argv;
  const decodedParams = Object.fromEntries(
    params.map((param) => {
      const [key, value] = param.split("=");
      return [key, value];
    }),
  );

  console.log("Running shortcut: ", tool, decodedParams);

  const output = resolver.run(tool, decodedParams);

  console.log(output);
}
