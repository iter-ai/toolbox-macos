import fs from "fs";
import plist from "plist";
import { z } from "zod";

import { Shortcut } from "./base.ts";
import { Shell } from "./native.ts";

/*
  Type definitions and parsing utilities for the private WorkflowKit framework, the backend for executing Shortcuts
 */

export namespace WorkflowKit {
  const workflowKitActionsBinPath = fs.realpathSync(
    "/System/Library/PrivateFrameworks/WorkflowKit.framework/Versions/Current/Resources/WFActions.plist",
  ); // resolve symlink

  export const actionDefinitionSchema = z.object({
    ActionClass: z.string(),
    ActionKeywords: z.array(z.string()).optional(),

    Name: z.string().optional(),
    Category: z.string().optional(),
    Categories: z.array(z.string()).optional(),
    Subcategory: z.string().optional(),
    Description: z
      .object({
        DescriptionSummary: z.string().optional(),
        DescriptionNote: z.string().optional(),
        DescriptionInput: z.string().optional(), // input
        DescriptionResult: z.string().optional(), // output
      })
      .optional(),

    Parameters: z
      .array(
        z.object({
          Key: z.string(),
          Class: z.string().optional(),
          Label: z.string().optional(),
          Description: z.string().optional(),
          Placeholder: z.string().optional(),
          DefaultValue: z.any().optional(),
          Items: z.array(z.any()).optional(),
        }),
      )
      .optional(),

    Output: z
      .object({
        OutputName: z.string().optional(),
        Multiple: z.boolean().optional(),
        DisclosureLevel: z.string().optional(),
        Types: z.array(z.string()).optional(), // TODO: enum
      })
      .optional(),
  });
  export type ActionDefinition = z.infer<typeof actionDefinitionSchema>;

  export const getActionDefinitions = (): Map<Shortcut.ActionID, ActionDefinition> => {
    const actionsXml = Shell.convertPlistToXml(workflowKitActionsBinPath);

    return new Map(
      Object.entries(plist.parse(actionsXml)).filter(([_, action]) => actionDefinitionSchema.safeParse(action).success),
    );
  };
}

export namespace ApplicationBundle {
  export const appIntentActionParameterDefinitionSchema = z
    .object({
      name: z.string(),
      title: z.object({
        key: z.string(),
      }),
      isOptional: z.boolean(),
    })
    .passthrough();

  export const appIntentActionDefinitionSchema = z
    .object({
      identifier: z.string(),
      title: z.object({
        key: z.string(),
      }),
      parameters: z.array(appIntentActionParameterDefinitionSchema).optional(),
      descriptionMetadata: z
        .object({
          descriptionText: z.object({
            key: z.string(),
          }),
        })
        .passthrough()
        .optional(),
    })
    .passthrough();
  export type AppIntentActionDefinition = z.infer<typeof appIntentActionDefinitionSchema>;

  export const appIntentDefinitionSchema = z
    .object({
      version: z.number(),
      actions: z.record(z.string(), appIntentActionDefinitionSchema),
    })
    .passthrough();
  export type AppIntentDefinition = z.infer<typeof appIntentDefinitionSchema>;

  export const infoPlistSchema = z
    .object({
      CFBundleIdentifier: z.string(),
    })
    .passthrough();
  export type BundleIdentifier = z.infer<typeof infoPlistSchema>["CFBundleIdentifier"];

  export const getActionDefinitions = (): Map<BundleIdentifier, AppIntentDefinition> =>
    new Map(
      Shell.listApplicationBundleResource("Metadata.appintents")
        .map((path): [string, AppIntentDefinition] | undefined => {
          const extractPath = `${path}/extract.actionsdata`;
          const infoPath = `${path}/../../Info.plist`;

          try {
            Shell.convertPlistToJson(extractPath);

            const parsedAppIntent = appIntentDefinitionSchema.safeParse(
              JSON.parse(Shell.convertPlistToJson(extractPath)),
            );
            const parsedInfoPlist = infoPlistSchema.safeParse(JSON.parse(Shell.convertPlistToJson(infoPath)));

            if (!parsedAppIntent.success || !parsedInfoPlist.success) {
              return undefined;
            }

            return [parsedInfoPlist.data.CFBundleIdentifier, parsedAppIntent.data];
          } catch (_error) {
            console.log(_error);
            return undefined;
          }
        })
        .filter((x): x is [string, AppIntentDefinition] => x !== undefined),
    );
}
