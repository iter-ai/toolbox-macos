import { OpenAPIRegistry, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import * as crypto from "crypto";
import express from "express";
import { z } from "zod";

export const port = 20020;

export const server = express();
server.use(express.json());

export const registry = new OpenAPIRegistry();
extendZodWithOpenApi(z);

export const auth = {
  accessCode: crypto.randomInt(Math.pow(36, 6)).toString(36).padStart(6, "0").toUpperCase(),
  authToken: crypto.randomBytes(32).toString("hex"),
};

export type Request = {
  uuid: string;
  operationId: string;
  query: Record<string, any>;
  status: "SUCCESS" | "PENDING" | "ERROR";
  body: any;
  timestamp: Date;
};
export type OnRequestHandler = (request: Request) => void;

let onRequest: OnRequestHandler | undefined;
export const setOnRequest = (handler: OnRequestHandler) => {
  onRequest = handler;
};

export const registerEndpoint = <
  RequestQuery extends z.AnyZodObject,
  RequestBody extends z.ZodTypeAny,
  Response extends z.ZodTypeAny,
  ErrorCode extends number,
>(
  endpoint: {
    method: "get" | "post";
    path: string;
    operationId: string;
    summary: string;
    request: {
      query?: RequestQuery;
      body?: {
        description?: string;
        content: {
          "application/json": {
            schema: RequestBody;
          };
        };
      };
    };
    responses: {
      200: {
        description: string;
        content: {
          "application/json": {
            schema: Response;
          };
        };
      };
    } & Record<
      ErrorCode, // TODO: type the error code
      {
        description: string;
        content?: any;
      }
    >;
  },
  handler: ({
    query,
    body,
  }: {
    query: z.infer<RequestQuery>;
    body: z.infer<RequestBody>;
  }) => Promise<{ errorCode: ErrorCode } | { result: z.infer<Response> }>,
) => {
  // add operation to openapi spec
  registry.registerPath({
    ...endpoint,
    "x-openai-isConsequential": false,
    parameters: [
      {
        name: "authToken",
        in: "query",
        schema: { type: "string", enum: [auth.authToken] },
        required: true,
      },
    ],
  });

  // attach express handler for operation
  const expressHandler: express.RequestHandler = async (req, res, next) => {
    const requestId = crypto.randomUUID();
    onRequest &&
      onRequest({
        uuid: requestId,
        status: "PENDING",
        operationId: endpoint.operationId,
        query: req.query,
        body: req.body,
        timestamp: new Date(),
      });

    if (req.query.authToken !== auth.authToken) {
      res.sendStatus(401);
      onRequest &&
        onRequest({
          uuid: requestId,
          status: "ERROR",
          operationId: endpoint.operationId,
          query: req.query,
          body: req.body,
          timestamp: new Date(),
        });
      return;
    }

    const responseContent = await handler({
      query: req.query,
      body: req.body,
    });

    if ("errorCode" in responseContent) {
      res.sendStatus(responseContent.errorCode);

      onRequest &&
        onRequest({
          uuid: requestId,
          status: "ERROR",
          operationId: endpoint.operationId,
          query: req.query,
          body: req.body,
          timestamp: new Date(),
        });

      return;
    }

    // send successful response
    res.status(200).json(responseContent.result);

    onRequest &&
      onRequest({
        uuid: requestId,
        status: "SUCCESS",
        operationId: endpoint.operationId,
        query: req.query,
        body: responseContent.result,
        timestamp: new Date(),
      });
  };

  switch (endpoint.method) {
    case "get":
      server.get(endpoint.path, expressHandler);
      break;
    case "post":
      server.post(endpoint.path, expressHandler);
      break;
  }
};
