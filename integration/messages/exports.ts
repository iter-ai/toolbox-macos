import * as fs from "fs";

import { ToolSpec, ToolboxAPI } from "@iter-ai/toolbox-macos-integration";

import { chatDB, executeSQL, listChats, listMessages } from "./handlers.ts";

const handlers = [listChats, listMessages, executeSQL];
export const resolver: ToolboxAPI.Module = {
  isReady: (): boolean => {
    try {
      fs.accessSync(chatDB, fs.constants.R_OK);
    } catch (e) {
      return false;
    }

    return true;
  },
  list: (): ToolSpec[] => handlers.map((handler) => ({ definition: handler.endpointDefinition, metadata: {} })),
  run: async (toolId: string, params: Record<string, any>): Promise<any> => {
    for (const handler of handlers) {
      if (handler.endpointDefinition.name === toolId) {
        return await handler.handler(params);
      }
    }
    throw new Error(`Tool not found: ${toolId}`);
  },
};
