import { z } from "zod";

import { Shortcut } from "./base.ts";
import { specFromAction } from "./metadata.js";

/* Templates for building workflows */
export namespace ActionTemplate {
  /* Comment */
  export const commentSchema = z.object({
    WFWorkflowActionIdentifier: z.literal("is.workflow.actions.comment"),
    WFWorkflowActionParameters: z.object({
      WFCommentActionText: z.string(),
    }),
  });
  export type Comment = z.infer<typeof commentSchema>;
  export const generateComment = ({ text }: { text: string }): Comment => ({
    WFWorkflowActionIdentifier: "is.workflow.actions.comment",
    WFWorkflowActionParameters: {
      WFCommentActionText: text,
    },
  });

  /* Dictionary from input */
  export const dictionaryInputSchema = z.object({
    WFWorkflowActionIdentifier: z.literal("is.workflow.actions.detect.dictionary"),
    WFWorkflowActionParameters: z.object({
      WFInput: z.object({
        Value: z.object({
          Type: z.literal("ExtensionInput"),
        }),
        WFSerializationType: z.literal("WFTextTokenAttachment"),
      }),
      UUID: z.string(),
    }),
  });
  export type DictionaryInput = z.infer<typeof dictionaryInputSchema>;
  export const generateDictionaryInput = (): DictionaryInput => ({
    WFWorkflowActionIdentifier: "is.workflow.actions.detect.dictionary",
    WFWorkflowActionParameters: {
      WFInput: {
        Value: {
          Type: "ExtensionInput",
        },
        WFSerializationType: "WFTextTokenAttachment",
      },
      UUID: Shortcut.getUUID(),
    },
  });

  /* Dictionary value extraction */
  export const dictionaryValueSchema = z.object({
    WFWorkflowActionIdentifier: z.literal("is.workflow.actions.getvalueforkey"),
    WFWorkflowActionParameters: z.object({
      WFInput: z.object({
        Value: z.object({
          OutputUUID: z.string(),
          Type: z.literal("ActionOutput"),
          Aggrandizements: z
            .array(
              z.object({
                DictionaryKey: z.string(),
                Type: z.literal("WFDictionaryValueVariableAggrandizement"),
              }),
            )
            .optional(),
        }),
        WFSerializationType: z.literal("WFTextTokenAttachment"),
      }),
      UUID: z.string(),
      WFDictionaryKey: z.string(),
    }),
  });
  export type DictionaryValue = z.infer<typeof dictionaryValueSchema>;
  export const generateDictionaryValue = ({
    dictionaryId,
    dictionaryKey,
    key,
  }: {
    dictionaryId: Shortcut.UUID;
    dictionaryKey?: string;
    key: string;
  }): DictionaryValue => ({
    WFWorkflowActionIdentifier: "is.workflow.actions.getvalueforkey",
    WFWorkflowActionParameters: {
      WFInput: {
        Value: dictionaryKey
          ? {
              OutputUUID: dictionaryId,
              Type: "ActionOutput",
              Aggrandizements: [
                {
                  DictionaryKey: dictionaryKey,
                  Type: "WFDictionaryValueVariableAggrandizement",
                },
              ],
            }
          : {
              OutputUUID: dictionaryId,
              Type: "ActionOutput",
            },
        WFSerializationType: "WFTextTokenAttachment",
      },
      UUID: Shortcut.getUUID(),
      WFDictionaryKey: key,
    },
  });

  /* Branch off based on condition */
  export const ifActionOutputEqualsSchema = z.object({
    WFWorkflowActionIdentifier: z.literal("is.workflow.actions.conditional"),
    WFWorkflowActionParameters: z.object({
      WFInput: z.object({
        Type: z.literal("Variable"),
        Variable: z.object({
          Value: z.object({
            Type: z.literal("ActionOutput"),
            OutputUUID: z.string(),
            Aggrandizements: z.array(
              z.object({
                Type: z.literal("WFCoercionVariableAggrandizement"),
                CoercionItemClass: z.literal("WFStringContentItem"),
              }),
            ),
          }),
          WFSerializationType: z.literal("WFTextTokenAttachment"),
        }),
      }),
      WFControlFlowMode: z.literal(0),
      WFConditionalActionString: z.string(),
      GroupingIdentifier: z.string(),
      WFCondition: z.literal(4),
    }),
  });
  export type IfActionOutputEquals = z.infer<typeof ifActionOutputEqualsSchema>;
  export const generateIfActionOutputEquals = ({
    actionId,
    value,
  }: {
    actionId: Shortcut.UUID;
    value: string;
  }): IfActionOutputEquals => ({
    WFWorkflowActionIdentifier: "is.workflow.actions.conditional",
    WFWorkflowActionParameters: {
      WFInput: {
        Type: "Variable",
        Variable: {
          Value: {
            Type: "ActionOutput",
            OutputUUID: actionId,
            Aggrandizements: [
              {
                Type: "WFCoercionVariableAggrandizement",
                CoercionItemClass: "WFStringContentItem",
              },
            ],
          },
          WFSerializationType: "WFTextTokenAttachment",
        },
      },
      WFControlFlowMode: 0,
      WFConditionalActionString: value,
      GroupingIdentifier: Shortcut.getUUID(),
      WFCondition: 4,
    },
  });

  /* Set variable */
  export const setVariableSchema = z.object({
    WFWorkflowActionIdentifier: z.literal("is.workflow.actions.setvariable"),
    WFWorkflowActionParameters: z.object({
      WFInput: z.object({
        Value: z.object({
          OutputUUID: z.string(),
          Type: z.literal("ActionOutput"),
        }),
        WFSerializationType: z.literal("WFTextTokenAttachment"),
      }),
      WFVariableName: z.string(),
    }),
  });
  export type SetVariable = z.infer<typeof setVariableSchema>;
  export const generateSetVariable = ({
    outputId,
    variableName,
  }: {
    outputId: Shortcut.UUID;
    variableName: string;
  }): SetVariable => ({
    WFWorkflowActionIdentifier: "is.workflow.actions.setvariable",
    WFWorkflowActionParameters: {
      WFInput: {
        Value: {
          OutputUUID: outputId,
          Type: "ActionOutput",
        },
        WFSerializationType: "WFTextTokenAttachment",
      },
      WFVariableName: variableName,
    },
  });

  /* Save output as file(s) */
  export const fileSaveSchema = z.object({
    WFWorkflowActionIdentifier: z.literal("is.workflow.actions.documentpicker.save"),
    WFWorkflowActionParameters: z.object({
      WFInput: z.object({
        Value: z.object({
          OutputUUID: z.string(),
          Type: z.literal("ActionOutput"),
        }),
      }),
      WFSaveFileOverwrite: z.literal(true),
      WFAskWhereToSave: z.literal(false),
      WFFileDestinationPath: z.string(),
    }),
  });
  export type FileSaveSchema = z.infer<typeof fileSaveSchema>;
  export const generateFileSave = ({ outputId, filePath }: { outputId: string; filePath: string }): FileSaveSchema => ({
    WFWorkflowActionIdentifier: "is.workflow.actions.documentpicker.save",
    WFWorkflowActionParameters: {
      WFInput: {
        Value: {
          OutputUUID: outputId,
          Type: "ActionOutput",
        },
      },
      WFSaveFileOverwrite: true,
      WFAskWhereToSave: false,
      WFFileDestinationPath: filePath,
    },
  });

  /* Encode input as base64 */
  export const encodeBase64Schema = z.object({
    WFWorkflowActionIdentifier: z.literal("is.workflow.actions.base64encode"),
    WFWorkflowActionParameters: z.object({
      UUID: z.string(),
      WFInput: z.object({
        Value: z.object({
          OutputUUID: z.string(),
          Type: z.literal("ActionOutput"),
        }),
        WFSerializationType: z.literal("WFTextTokenAttachment"),
      }),
    }),
  });
  export type EncodeBase64 = z.infer<typeof encodeBase64Schema>;
  export const generateEncodeBase64 = ({ outputId }: { outputId: string }): EncodeBase64 => ({
    WFWorkflowActionIdentifier: "is.workflow.actions.base64encode",
    WFWorkflowActionParameters: {
      UUID: Shortcut.getUUID(),
      WFInput: {
        Value: {
          OutputUUID: outputId,
          Type: "ActionOutput",
        },
        WFSerializationType: "WFTextTokenAttachment",
      },
    },
  });

  /* End shortcut run */
  export const exitSchema = z.object({
    WFWorkflowActionIdentifier: z.literal("is.workflow.actions.exit"),
    WFWorkflowActionParameters: z.object({}),
  });
  export type Exit = z.infer<typeof exitSchema>;
  export const generateExit = (): Exit => ({
    WFWorkflowActionIdentifier: "is.workflow.actions.exit",
    WFWorkflowActionParameters: {},
  });

  /* Output variable and end program */
  export const outputAndExitSchema = z.object({
    WFWorkflowActionIdentifier: z.literal("is.workflow.actions.output"),
    WFWorkflowActionParameters: z.object({
      WFOutput: z.object({
        Value: z.object({
          attachmentsByRange: z.record(
            z.string(),
            z.object({
              Type: z.literal("ActionOutput"),
              OutputUUID: z.string(),
            }),
          ),
          string: z.string(),
        }),
        WFSerializationType: z.literal("WFTextTokenString"),
      }),
    }),
  });
  export type OutputAndExit = z.infer<typeof outputAndExitSchema>;
  export const generateOutputAndExit = ({ outputId }: { outputId: string }): OutputAndExit => ({
    WFWorkflowActionIdentifier: "is.workflow.actions.output",
    WFWorkflowActionParameters: {
      WFOutput: {
        Value: {
          attachmentsByRange: {
            "{0, 1}": {
              Type: "ActionOutput",
              OutputUUID: outputId,
            },
          },
          string: `￼`,
        },
        WFSerializationType: "WFTextTokenString",
      },
    },
  });

  /* End conditional branch */
  export const endIfSchema = z.object({
    WFWorkflowActionIdentifier: z.literal("is.workflow.actions.conditional"),
    WFWorkflowActionParameters: z.object({
      UUID: z.string(),
      GroupingIdentifier: z.string(),
      WFControlFlowMode: z.literal(2),
    }),
  });
  export type EndIf = z.infer<typeof endIfSchema>;
  export const generateEndIf = ({ groupingIdentifier }: { groupingIdentifier: string }): EndIf => ({
    WFWorkflowActionIdentifier: "is.workflow.actions.conditional",
    WFWorkflowActionParameters: {
      UUID: Shortcut.getUUID(),
      GroupingIdentifier: groupingIdentifier,
      WFControlFlowMode: 2,
    },
  });

  /* Dictionary with constant values */
  export const dictionarySchema = z.object({
    WFWorkflowActionIdentifier: z.literal("is.workflow.actions.dictionary"),
    WFWorkflowActionParameters: z.object({
      WFItems: z.object({
        // strings values with up to one level of nesting
        Value: z.object({
          WFDictionaryFieldValueItems: z.array(
            z.discriminatedUnion("WFItemType", [
              z.object({
                // value is a string
                WFItemType: z.literal(0),
                WFKey: z.object({
                  Value: z.object({
                    string: z.string(),
                  }),
                  WFSerializationType: z.literal("WFTextTokenString"),
                }),
                WFValue: z.object({
                  Value: z.object({
                    string: z.string(),
                  }),
                  WFSerializationType: z.literal("WFTextTokenString"),
                }),
              }),
              z.object({
                // value is another dictionary
                WFItemType: z.literal(1),
                WFKey: z.object({
                  Value: z.object({
                    string: z.string(),
                  }),
                  WFSerializationType: z.literal("WFTextTokenString"),
                }),
                WFValue: z.object({
                  Value: z.object({
                    WFDictionaryFieldValueItems: z.array(
                      z.object({
                        WFItemType: z.literal(0),
                        WFKey: z.object({
                          Value: z.object({
                            string: z.string(),
                          }),
                          WFSerializationType: z.literal("WFTextTokenString"),
                        }),
                        WFValue: z.object({
                          Value: z.object({
                            string: z.string(),
                          }),
                          WFSerializationType: z.literal("WFTextTokenString"),
                        }),
                      }),
                    ),
                  }),
                  WFSerializationType: z.literal("WFDictionaryFieldValue"),
                }),
              }),
            ]),
          ),
        }),
        WFSerializationType: z.literal("WFDictionaryFieldValue"),
      }),
    }),
  });
  export type Dictionary = z.infer<typeof dictionarySchema>;
  export type DictionaryData = Record<string, string | Record<string, string>>;
  export const generateDictionary = (data: DictionaryData): Dictionary => ({
    WFWorkflowActionIdentifier: "is.workflow.actions.dictionary",
    WFWorkflowActionParameters: {
      WFItems: {
        Value: {
          WFDictionaryFieldValueItems: Object.entries(data).map(([key, value]) =>
            typeof value === "string"
              ? {
                  WFItemType: 0,
                  WFKey: {
                    Value: {
                      string: key,
                    },
                    WFSerializationType: "WFTextTokenString",
                  },
                  WFValue: {
                    Value: {
                      string: value,
                    },
                    WFSerializationType: "WFTextTokenString",
                  },
                }
              : {
                  WFItemType: 1,
                  WFKey: {
                    Value: {
                      string: key,
                    },
                    WFSerializationType: "WFTextTokenString",
                  },
                  WFValue: {
                    Value: {
                      WFDictionaryFieldValueItems: Object.entries(value).map(([key, value]) => ({
                        WFItemType: 0,
                        WFKey: {
                          Value: {
                            string: key,
                          },
                          WFSerializationType: "WFTextTokenString",
                        },
                        WFValue: {
                          Value: {
                            string: value,
                          },
                          WFSerializationType: "WFTextTokenString",
                        },
                      })),
                    },
                    WFSerializationType: "WFDictionaryFieldValue",
                  },
                },
          ),
        },
        WFSerializationType: "WFDictionaryFieldValue",
      },
    },
  });

  export const getValueOfDictionary = (
    dictionaryContent: Dictionary["WFWorkflowActionParameters"]["WFItems"]["Value"],
  ): DictionaryData =>
    Object.fromEntries(
      dictionaryContent.WFDictionaryFieldValueItems.map((item) => {
        const wrappedValue = item.WFValue.Value as any;
        return [item.WFKey.Value.string, wrappedValue.string ?? getValueOfDictionary(wrappedValue)];
      }),
    );

  /* Union of all logical action templates */
  const knownLogicalActionsIdentifiers = z.union([
    commentSchema.shape.WFWorkflowActionIdentifier,
    dictionaryInputSchema.shape.WFWorkflowActionIdentifier,
    dictionaryValueSchema.shape.WFWorkflowActionIdentifier,
    ifActionOutputEqualsSchema.shape.WFWorkflowActionIdentifier,
    setVariableSchema.shape.WFWorkflowActionIdentifier,
    fileSaveSchema.shape.WFWorkflowActionIdentifier,
    encodeBase64Schema.shape.WFWorkflowActionIdentifier,
    exitSchema.shape.WFWorkflowActionIdentifier,
    outputAndExitSchema.shape.WFWorkflowActionIdentifier,
    endIfSchema.shape.WFWorkflowActionIdentifier,
    dictionarySchema.shape.WFWorkflowActionIdentifier,
  ] as const);

  // note: only checks the action identifier
  export const isKnownLogicalActionType = (action: Shortcut.Action): boolean =>
    knownLogicalActionsIdentifiers.safeParse(action.WFWorkflowActionIdentifier).success;
}

/* Templates for manipulating Shortcut workflows */
export namespace VariableTemplate {
  /* Placeholder variable when manually editing workflow templates */
  export const placeholderVariableName = "var";

  export const parameterScalarSchema = z.union([z.string(), z.number(), z.boolean()]);
  export type ParameterScalar = z.infer<typeof parameterScalarSchema>;

  /* References to variable inside the workflow  */
  const variableReferenceSchema = z.object({
    Type: z.literal("Variable"),
    VariableName: z.string().transform(() => placeholderVariableName),
  });

  export type VariableReferencePath = (number | string)[];

  export const getVariableReferences = (object: unknown, path: VariableReferencePath = []): (number | string)[][] => {
    if (object === null || typeof object !== "object") {
      // not an object
      return [];
    }

    if (variableReferenceSchema.safeParse(object).success) {
      // return the current path
      return [path];
    }

    let paths: VariableReferencePath[] = [];
    for (const [key, value] of Object.entries(object)) {
      paths = paths.concat(getVariableReferences(value, path.concat(key)));
    }

    return paths;
  };

  export const applyVariableReferenceToPath = <T extends object | any[]>({
    object,
    path,
    variableId,
  }: {
    object: T;
    path: VariableReferencePath;
    variableId: string;
  }): T => {
    if (path.length === 0) {
      if (Array.isArray(object)) {
        return [...object, variableId] as T;
      }
      return {
        ...object,
        VariableName: variableId,
      };
    }

    const [key, ...rest] = path;
    if (!(key in object)) {
      throw new Error(`Invalid path: ${path}`);
    }

    if (Array.isArray(object)) {
      const index = Number(key);
      if (isNaN(index)) {
        throw new Error(`Invalid array index: ${key}`);
      }
      return [
        ...object.slice(0, index),
        applyVariableReferenceToPath({
          object: object[index],
          path: rest,
          variableId,
        }),
        ...object.slice(index + 1),
      ] as T;
    } else {
      return {
        ...object,
        [key]: applyVariableReferenceToPath({
          object: (object as any)[key],
          path: rest,
          variableId,
        }),
      };
    }
  };
}
