import { z } from "zod";

import { ToolboxAPI } from "@iter-ai/toolbox-macos-integration";
import * as iMessage from "@iter-ai/toolbox-macos-integration-messages";
import * as Shortcut from "@iter-ai/toolbox-macos-integration-shortcuts";

import { registerEndpoint } from "./server.mts";

const resolvers = [Shortcut.resolver, iMessage.resolver];

// toolbox endpoints
registerEndpoint(
  {
    path: "/list",
    method: "get",
    operationId: "listTools",
    summary:
      "This macOS toolbox offers tools for Contacts, Maps, Messages, Emails, etc. Combine multiple tools step by step, focusing on recall over precision.",
    request: {},
    responses: {
      200: {
        description: "List of tools",
        content: {
          "application/json": {
            schema: z.object({
              tools: z.array(z.string()),
            }),
          },
        },
      },
    },
  },
  async () => ({
    result: {
      tools: resolvers
        .map((resolver) => resolver.list())
        .flat()
        .map((spec) => spec.override?.name ?? spec.definition.name),
    },
  }),
);

registerEndpoint(
  {
    path: "/plan",
    method: "post",
    operationId: "submitPlan",
    summary: "Once the assistant has a plan, submit the plan to the server.",
    request: {
      body: {
        description: "Payload to send to the tool",
        content: {
          "application/json": {
            schema: z.any().openapi({
              type: "object",
              properties: {
                plan: {
                  type: "string",
                  description: "Submit the plan to the server.",
                },
              },
            }),
          },
        },
      },
    },
    responses: {
      200: {
        description: "Plan response",
        content: {
          "application/json": {
            schema: z.any().openapi({
              type: "object",
              properties: {
                plan: {
                  type: "string",
                  description: "returning the submitted plan.",
                },
              },
            }),
          },
        },
      },
    },
  },
  async ({ query, body }) => {
    return { result: body.plan };
  },
);

registerEndpoint(
  {
    path: "/critique",
    method: "post",
    operationId: "submitCritique",
    summary: "Once the assistant has a plan, submit the plan to the server.",
    request: {
      body: {
        description: "Payload to send to the tool",
        content: {
          "application/json": {
            schema: z.any().openapi({
              type: "object",
              properties: {
                critique: {
                  type: "string",
                  description: "Submit the critique to the server.",
                },
              },
            }),
          },
        },
      },
    },
    responses: {
      200: {
        description: "Plan response",
        content: {
          "application/json": {
            schema: z.any().openapi({
              type: "object",
              properties: {
                plan: {
                  type: "string",
                  description: "returning the submitted critique.",
                },
              },
            }),
          },
        },
      },
    },
  },
  async ({ query, body }) => {
    return { result: body.critique };
  },
);

registerEndpoint(
  {
    path: "/schema",
    method: "get",
    operationId: "selectTools",
    summary:
      "Always call `listTools` before this call. You can pass in the names of multiple tools and this endpoint will return their schemas. Recall is more important than precision. You should query about all the potentially helpful endpoints.",
    request: {
      query: z.object({
        names: z.array(z.string()).describe("A list of tool ids to select. It is crucial to include this argument."),
      }),
    },
    responses: {
      "200": {
        description: "Tool schema",
        content: {
          "application/json": {
            schema: z.array(ToolboxAPI.definitionSchema),
          },
        },
      },
    },
  },
  async ({ query: { names } }) => {
    if (!names) {
      return {
        errorCode: 404,
      };
    }
    // if ids is a string, put it in an array
    if (!Array.isArray(names)) {
      names = names ? [names] : [];
    }

    const specs = names.map((id) =>
      resolvers
        .map((resolver) => resolver.list())
        .flat()
        .find((spec) => spec.override?.name === id || spec.definition.name === id),
    );

    let returnSchemas = [];
    for (let i = 0; i < names.length; i++) {
      let name = names[i];
      let spec = specs[i];

      if (spec) {
        returnSchemas.push({ ...spec.definition, ...(spec.override ?? {}) });
      } else {
        returnSchemas.push(
          ToolboxAPI.definitionSchema.parse({
            name,
            description: "Tool not found. Please check the results of `listTools`.",
            parameters: {},
            responseType: "string",
          }),
        );
      }
    }

    return {
      result: returnSchemas,
    };
  },
);

registerEndpoint(
  {
    path: "/run",
    method: "post",
    operationId: "runTool",
    summary:
      "This endpoint run the selected tool with the parameters passed along. For any tool you run, you have to use `selectTools` to see its schema first. Retry at least 5 times if it fails. Combine tools, using outputs as inputs for others. If necessary, use `selectTools` again for alternative tools. ",
    request: {
      query: z.object({
        name: z.string().describe("The id of the tool to run. Crucial to include this."),
      }),
      body: {
        description: "Payload to send to the tool",
        content: {
          "application/json": {
            schema: z.any().openapi({
              type: "object",
              properties: {
                params: {
                  type: "string",
                  description:
                    "A JSON string encoding a dictionary of parameters to pass along to the tool. Key is the parameter name and value is the parameter value to pass along.",
                },
              },
            }),
          },
        },
      },
    },
    responses: {
      200: {
        description: "Tool response",
        content: {
          "application/json": {
            schema: z.any().openapi({ type: "object", properties: { output: { type: "object" } } }),
          },
        },
      },
      500: {
        description: "Unknown error while running tool",
      },
    },
  },
  async ({ query: { name }, body }) => {
    // if params is string, parse it as a JSON object
    let params = body.params;
    if (Object.keys(body).length === 0) {
      params = {};
    } else if (typeof params === "string") {
      params = JSON.parse(body.params);
    }
    try {
      for (const resolver of resolvers) {
        const spec = resolver.list().find((spec) => name === (spec.override?.name ?? spec.definition.name));
        if (spec) {
          return {
            result: await resolver.run(name, params),
          };
        }
      }

      return {
        errorCode: 404,
      };
    } catch (error) {
      return {
        errorCode: 500,
      };
    }
  },
);
