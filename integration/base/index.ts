import isEqual from "lodash.isequal";
import { z } from "zod";

/* API */
export namespace ToolboxAPI {
  export const scalarSchema = z.enum(["string", "number", "boolean", "object"]); // only support primitive types for now

  export const parameterSchema = z.object({
    required: z.boolean(),
    description: z.string(),
    type: scalarSchema,
  });
  export type Parameter = z.infer<typeof parameterSchema>;

  export const definitionSchema = z.object({
    name: z.string(),
    description: z.string(),
    parameters: z.record(z.string(), parameterSchema),
    responseType: scalarSchema,
  });
  export type Definition = z.infer<typeof definitionSchema>;

  export type Handler = {
    endpointDefinition: Definition;
    handler: (params: any) => Promise<any>; // TODO: type this
  };

  export type Module = {
    isReady: () => boolean;
    setup?: () => void;
    list: () => ToolSpec[];
    run: (toolId: string, params: Record<string, any>) => Promise<any>;
  };
}

/* Tool */
type ToolMetadata = any;
type ToolType = string;

export type ToolSpec<T extends ToolMetadata = {}> = {
  definition: ToolboxAPI.Definition;
  override?: Partial<ToolboxAPI.Definition>;
  metadata: T;
};

type ToolSpecWithType<T extends ToolMetadata = {}> = ToolSpec<T> & {
  type: ToolType;
};

export class ToolRepository<T, U extends ToolMetadata> {
  private toolToSpec: Map<T, ToolSpec<U>> = new Map();
  private metadataToExistingOverride: Map<U, Partial<ToolboxAPI.Definition>> = new Map();

  public readonly generateSpec: (item: T) => ToolSpec<U>;
  public readonly toolType: ToolType;

  constructor(toolType: ToolType, specGenerator: (item: T) => ToolSpec<U>) {
    this.toolType = toolType;
    this.generateSpec = specGenerator;
  }

  addOverride(metadata: U, override: Partial<ToolboxAPI.Definition>): void {
    // check if there is an existing override
    for (const [existingMetadata, existingOverride] of this.metadataToExistingOverride.entries()) {
      if (isEqual(metadata, existingMetadata)) {
        // merge overrides
        this.metadataToExistingOverride.set(existingMetadata, { ...existingOverride, ...override });
        return;
      }
    }

    // no existing override; add new override
    this.metadataToExistingOverride.set(metadata, override);
  }

  // make sure the item is not already in the repository
  add(item: T): boolean {
    const newSpec = this.generateSpec(item);
    // tool is not already in the repository
    for (const currentItem of this.toolToSpec.keys()) {
      if (isEqual(item, currentItem)) {
        // tool definition is the same; check for metadata
        const currentSpec = this.toolToSpec.get(currentItem)!;

        if (isEqual(currentSpec.metadata, newSpec.metadata)) {
          // tool is already in the repository
          return false;
        }
      }
    }

    // see if there is an existing override
    for (const [existingMetadata, existingOverride] of this.metadataToExistingOverride.entries()) {
      if (isEqual(newSpec.metadata, existingMetadata)) {
        // merge overrides
        newSpec.override = { ...newSpec.override, ...existingOverride };
        break;
      }
    }

    this.toolToSpec.set(item, newSpec);
    return true;
  }

  getTools: () => T[] = () => {
    // copy keys from the map
    return Array.from(this.toolToSpec.keys());
  };

  getSpecs(): ToolSpecWithType<U>[] {
    // copy values from the map
    return Array.from(this.toolToSpec.values()).map((spec) => ({ type: this.toolType, ...spec }));
  }

  getToolsWithSpecs(): [T, ToolSpecWithType<U>][] {
    // copy entries from the map
    return Array.from(this.toolToSpec.entries()).map(([tool, spec]) => [tool, { type: this.toolType, ...spec }]);
  }
}
