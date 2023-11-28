import { ToolSpec, ToolboxAPI } from "@iter-ai/toolbox-macos-integration";

import { Shortcut } from "./base.ts";
import { ApplicationBundle, WorkflowKit } from "./framework.ts";
import { VariableTemplate } from "./template.ts";

export type ShortcutToolMetadata = {
  parameterIdToTemplatePath: Record<string, VariableTemplate.VariableReferencePath>;
  template: Shortcut.Action;
};

export type ShortcutToolSpec = ToolSpec<ShortcutToolMetadata>;

const workflowKitActions = WorkflowKit.getActionDefinitions();
const appIntentActions = ApplicationBundle.getActionDefinitions();

export const specFromAction = (action: Shortcut.Action): ShortcutToolSpec => {
  const { WFWorkflowActionIdentifier: actionId, WFWorkflowActionParameters: actionParams } = action;

  // get the definition for the action and parameters from WorkflowKit
  const workflowKitActionDefinition = workflowKitActions.get(actionId);
  const workflowKitActionParamDefinition = Object.fromEntries(
    (workflowKitActionDefinition?.Parameters ?? []).map((paramDef) => [paramDef.Key, paramDef]),
  );
  const outputDefinition = workflowKitActionDefinition?.Output;

  // get the definition for the action from the app intent
  let appIntentActionDefinition: ApplicationBundle.AppIntentActionDefinition | undefined;
  if (actionParams?.AppIntentDescriptor) {
    const appIntentDefinition = appIntentActions.get(actionParams.AppIntentDescriptor.BundleIdentifier);
    if (appIntentDefinition) {
      appIntentActionDefinition = appIntentDefinition.actions[actionParams.AppIntentDescriptor.AppIntentIdentifier];
    }
  }
  const appIntentActionParamDefinition = Object.fromEntries(
    (appIntentActionDefinition?.parameters ?? []).map((paramDef) => [paramDef.name, paramDef]),
  );

  // get list of parameters from the action
  const apiParams: Record<string, ToolboxAPI.Parameter> = {};
  const parameterIdToTemplatePath: Record<string, VariableTemplate.VariableReferencePath> = {};

  for (const [paramId, param] of Object.entries(actionParams ?? {})) {
    // build endpoint metadata
    const workflowKitParamDef = workflowKitActionParamDefinition[paramId];
    const appIntentParamDef = appIntentActionParamDefinition[paramId];

    const paramDescription =
      (workflowKitParamDef?.Class ? ` (${workflowKitParamDef.Class}) ` : "") +
      (workflowKitParamDef?.Description ?? workflowKitParamDef?.Label ?? appIntentParamDef?.title.key ?? paramId);
    const paramRequired = appIntentParamDef ? !appIntentParamDef.isOptional : !workflowKitParamDef?.DefaultValue; // assume all parameters are required, unless we can find a default value in the definition

    // map each api parameter to a variable reference
    const variableReferences = VariableTemplate.getVariableReferences(param);
    if (variableReferences.length === 0) {
      // parameter does not reference any variables
      continue;
    }

    // skip common path prefix and suffix in the variable names
    const commonPathPrefix: VariableTemplate.VariableReferencePath = [];
    const commonPathSuffix: VariableTemplate.VariableReferencePath = [];

    const minLength = Math.min(...variableReferences.map((path) => path.length));

    // find common path prefix
    for (let i = 0; i < minLength && variableReferences.every((path) => path[i] === variableReferences[0][i]); i++) {
      commonPathPrefix.push(variableReferences[0][i]);
    }

    // find common path suffix
    for (
      let i = 0;
      i < minLength &&
      variableReferences.every(
        (path) => path[path.length - 1 - i] === variableReferences[0][variableReferences[0].length - 1 - i],
      );
      i++
    ) {
      commonPathSuffix.unshift(variableReferences[0][variableReferences[0].length - 1 - i]);
    }

    for (const path of variableReferences) {
      let variableName = paramId;
      if (variableReferences.length > 1) {
        // remove common path prefix and suffix
        variableName = path.slice(commonPathPrefix.length, path.length - commonPathSuffix.length).join(".");
      }

      // add parameter to the spec
      apiParams[variableName] = {
        required: paramRequired,
        description: paramDescription,
        type: "string", // TODO: fix this
      };

      // map the api parameter to the variable reference
      parameterIdToTemplatePath[variableName] = [paramId, ...path];
    }
  }

  // add action to the spec
  const actionDescription =
    // workflowkit description
    workflowKitActionDefinition?.Description?.DescriptionSummary ||
    workflowKitActionDefinition?.Description?.DescriptionNote ||
    // app intent description
    appIntentActionDefinition?.descriptionMetadata?.description ||
    appIntentActionDefinition?.title.key ||
    // fallback to action id
    actionId;

  const endpointDescription =
    actionDescription +
    (outputDefinition ? `\nReturns ${outputDefinition.OutputName} (${outputDefinition.Types?.join(", ")})` : "");

  return {
    definition: {
      name: actionId,
      description: endpointDescription,
      parameters: apiParams,
      responseType: "string", // TODO: fix this
    },
    metadata: {
      template: action,
      parameterIdToTemplatePath,
    },
  };
};
