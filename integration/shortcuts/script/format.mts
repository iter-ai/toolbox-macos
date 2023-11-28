#!/usr/bin/env node --loader tsx
import fs from "fs";
import plist from "plist";
import yaml from "yaml";

import { ToolRepository } from "@iter-ai/toolbox-macos-integration";

import { Shortcut } from "../lib/base.ts";
import { ShortcutToolMetadata, specFromAction } from "../lib/metadata.ts";
import { Path, Shell } from "../lib/native.ts";
import { ActionTemplate, VariableTemplate } from "../lib/template.ts";

const actionTemplates = new ToolRepository<Shortcut.Action, ShortcutToolMetadata>("shortcuts", specFromAction);

// load all existing spec overrides
try {
  const existingSpecs = yaml.parse(fs.readFileSync(Path.toolboxSpec, "utf-8"));
  for (const spec of existingSpecs) {
    if (spec.type !== "shortcuts" || !spec.override) {
      continue;
    }

    actionTemplates.addOverride(spec.metadata, spec.override);
  }
} catch (_error) {
  // ignore
}

// load all shortcut templates
const sources = fs
  .readdirSync(Path.templateBase)
  .filter((filename) => filename.endsWith(".shortcut"))
  .map((filename) => ({
    path: Path.templateBase + filename,
    content: plist.parse(fs.readFileSync(Path.templateBase + filename, "utf-8")),
  }));

for (const { path, content } of sources) {
  console.log("Parsing workflow: ", path);
  const parsedWorkflow = Shortcut.workflowSchema.safeParse(content);

  if (!parsedWorkflow.success) {
    console.warn("Invalid workflow. Skipping...");
    continue;
  }

  const actions: Shortcut.Action[] = [];

  // add actions to the repository
  for (const action of parsedWorkflow.data.WFWorkflowActions) {
    if (ActionTemplate.isKnownLogicalActionType(action)) {
      // skip logical actions
      continue;
    }

    actions.push(action);
    if (!actionTemplates.add(action)) {
      console.log("Duplicate action: ", action);
    }
  }

  // overwrite the original shortcut
  fs.writeFileSync(
    path,
    plist.build(
      Shortcut.createWorkflow([
        ActionTemplate.generateComment({
          text: "Shortcut template for @iter-ai/toolbox-macos. See integration/shortcuts/README.md for how to make changes",
        }),
        ActionTemplate.generateSetVariable({
          variableName: VariableTemplate.placeholderVariableName,
          outputId: "", // placeholder value
        }),
        ...actions,
      ]),
      { pretty: true },
    ),
  );

  // generate a signed shortcut
  Shell.signShortcut({
    path,
    generatedPath: Path.shortcutSignedBase + path.split("/").pop(),
  });
}

// generate the tool spec
fs.writeFileSync(Path.toolboxSpec, yaml.stringify(actionTemplates.getSpecs(), null, 2));

export { actionTemplates };
