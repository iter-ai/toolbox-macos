import crypto from "crypto";
import { z } from "zod";

/*
  Type definitions and templating for manipulating the .shortcut file format used to defined Shortcuts
 */
export namespace Shortcut {
  export type UUID = string;
  export const getUUID = (): UUID => crypto.randomUUID();

  /* Action */
  export const actionParameterSchema = z.record(z.string(), z.any()).optional();
  export type ActionParameter = z.infer<typeof actionParameterSchema>;

  export type ActionID = string;

  export const actionSchema = z.object({
    WFWorkflowActionIdentifier: z.string(),
    WFWorkflowActionParameters: actionParameterSchema.optional(),
  });
  export type Action = z.infer<typeof actionSchema>;

  /* Workflow */
  const workflowDefaults = {
    // versions
    WFWorkflowClientVersion: "2038.0.2.4",
    WFWorkflowMinimumClientVersion: 900,
    // metadata
    WFWorkflowIcon: {
      WFWorkflowIconStartColor: -2873601,
      WFWorkflowIconGlyphNumber: 61440,
    },
    WFQuickActionSurfaces: [""],
    WFWorkflowImportQuestions: [],
    // input / output
    WFWorkflowInputContentItemClasses: ["WFAppContentItem", "WFStringContentItem"],
    WFWorkflowOutputContentItemClasses: ["WFAppContentItem", "WFStringContentItem"],
    WFWorkflowHasOutputFallback: false,
    // actions
    WFWorkflowActions: [],
  } as const;

  export const workflowSchema = z.object({
    // versions
    WFWorkflowClientVersion: z.string().transform(() => workflowDefaults.WFWorkflowClientVersion),
    WFWorkflowMinimumClientVersion: z.number().transform(() => workflowDefaults.WFWorkflowMinimumClientVersion),

    // metadata
    WFWorkflowIcon: z.object({
      WFWorkflowIconStartColor: z.number().transform(() => workflowDefaults.WFWorkflowIcon.WFWorkflowIconStartColor),
      WFWorkflowIconGlyphNumber: z.number().transform(() => workflowDefaults.WFWorkflowIcon.WFWorkflowIconGlyphNumber),
    }),
    WFQuickActionSurfaces: z.array(z.string()).transform(() => workflowDefaults.WFQuickActionSurfaces),
    WFWorkflowImportQuestions: z.array(z.string()).transform(() => workflowDefaults.WFWorkflowImportQuestions),

    // input / output
    WFWorkflowInputContentItemClasses: z
      .array(z.string())
      .transform(() => workflowDefaults.WFWorkflowInputContentItemClasses),
    WFWorkflowOutputContentItemClasses: z
      .array(z.string())
      .transform(() => workflowDefaults.WFWorkflowOutputContentItemClasses),
    WFWorkflowHasOutputFallback: z.boolean().transform(() => workflowDefaults.WFWorkflowHasOutputFallback),

    // actions
    WFWorkflowActions: z.array(actionSchema),
  });
  export type Workflow = z.infer<typeof workflowSchema>;

  export const createWorkflow = (actions: Action[]): Workflow => ({
    ...workflowDefaults,
    WFWorkflowActions: actions,
  });
}
