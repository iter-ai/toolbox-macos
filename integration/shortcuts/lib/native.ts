import { ExecSyncOptionsWithBufferEncoding, execSync } from "child_process";
import fs from "fs";
import path from "node:path";
import url from "url";
import { z } from "zod";

export namespace Shell {
  const options: ExecSyncOptionsWithBufferEncoding = {
    maxBuffer: 1024 * 1024 * 1024, // 1GB, instead of the default 200KB
  };

  export const signShortcut = ({ path, generatedPath }: { path: string; generatedPath: string }) =>
    execSync(`shortcuts sign --input "${path}" --output "${generatedPath}"`, options).toString();

  const inputSchema = z.object({
    tool: z.string(),
    params: z.record(z.string(), z.any()),
  });

  export type RunInput = z.infer<typeof inputSchema>;

  export const runShortcut = (
    input: RunInput,
  ):
    | {
        ok: false;
        error: string;
      }
    | {
        ok: true;
        std: string;
        output: string | Record<string, string> | null;
      } => {
    const tempDir = execSync("mktemp -d").toString().trim();

    const tempInputPath = tempDir + "/input.json";
    fs.writeFileSync(tempInputPath, JSON.stringify(input, null, 2));

    const tempOutputPath = tempDir + "/output";

    // execute shortcut
    let stdBuffer: Buffer;
    try {
      stdBuffer = execSync(
        `shortcuts run "${Path.toolboxShortcutName}" --input-path "${tempInputPath}" --output-path "${tempOutputPath}"`,
        options,
      );
    } catch (error: unknown) {
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = "An unknown error occurred";
      }

      return {
        ok: false,
        error: errorMessage,
      };
    }

    if (fs.existsSync(tempOutputPath)) {
      const tempOutputPathStat = fs.statSync(tempOutputPath);
      if (tempOutputPathStat.isDirectory()) {
        // read all files in directory
        return {
          ok: true,
          std: stdBuffer.toString(),
          output: Object.fromEntries(
            fs
              .readdirSync(tempOutputPath)
              .map((fileName) => [
                fileName,
                Buffer.from(fs.readFileSync(tempOutputPath + "/" + fileName).toString(), "base64").toString(),
              ]),
          ),
        };
      }

      if (tempOutputPathStat.isFile()) {
        // read single file
        return {
          ok: true,
          std: stdBuffer.toString(),
          output: Buffer.from(fs.readFileSync(tempOutputPath).toString(), "base64").toString(),
        };
      }
    }

    // no output
    return {
      ok: true,
      std: stdBuffer.toString(),
      output: null,
    };
  };

  export const listShortcuts = (): string[] => execSync(`shortcuts list`).toString().trim().split("\n");

  export const openFile = (path: string) => execSync(`open "${path}"`, options);

  export const convertPlistToXml = (path: string) =>
    execSync(
      // convert from binary plist to xml plist
      `plutil -convert xml1 "${path}" -o -`,
      options,
    ).toString();

  export const convertPlistToJson = (path: string) =>
    execSync(
      // convert from binary plist to xml plist
      `plutil -convert json "${path}" -o -`,
      options,
    ).toString();

  export const listPlugins = () => {
    /*
    NAME
      pluginkit – plugin plug-in extension pluginkit

    DESCRIPTION
      pluginkit manages the PlugInKit subsystem for the current user. It can query the plug-in database and make limited interventions for debugging and
      development.

      A list of flags and their descriptions:
      ...
      -m --match
               Requests pluginkit to scan all registered plug-ins for those matching the given search criteria (see DISCOVERY MATCHING below).
      ...
      --raw    Present replies from the management daemon (pkd) in raw XML form. This is primarily useful for debugging and for reporting full state in
               bug reports.
      ...
    */

    const xpcWrappedSwift = execSync(`pluginkit --match --raw`, options).toString();

    /*
                      The PluginKit response is a plist file in Swift flavor, but it has some additional debug symbols on top:

                      <OS_xpc_dictionary: <dictionary: 0x000000000000> { count = 1, transaction: 0, voucher = 0x0, contents =
                        "matches" => <dictionary: 0x000000000000> { count = 1, transaction: 0, voucher = 0x0, contents =
                          "00000000-0000-0000-0000-000000000000" => <data: 0x000000000000>: { length = 0000000 bytes, contents = 0x... }
                        }
                      }>
                        (
                           [Swift code]
                        )
                    */

    // Strip the content in the <> brackets and use `plutil` to parse the plist
    const innerContent = xpcWrappedSwift.match(/\([\s\S]*\)/g)?.[0];

    if (!innerContent) {
      throw new Error("Could not find inner content of PluginKit response");
    }

    return innerContent;
  };

  export const listApplicationBundleResource = (name: string) =>
    execSync(`find /Applications /System/Applications -type d -name '${name}' -path '*/Contents/Resources/*'`, options)
      .toString()
      .trim()
      .split("\n");
}

export namespace Path {
  const packageBase = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "/../");
  export const templateBase = path.join(packageBase, "/template/");
  export const generatedBase = path.join(packageBase, "/data/");
  if (!fs.existsSync(generatedBase)) {
    fs.mkdirSync(generatedBase);
  }
  export const shortcutSignedBase = generatedBase + "signed/";
  if (!fs.existsSync(shortcutSignedBase)) {
    fs.mkdirSync(shortcutSignedBase);
  }
  export const toolboxShortcutName = "iter toolbox";
  export const toolboxShortcutFile = `${generatedBase}/${toolboxShortcutName}.shortcut`;
  export const toolboxSpec = packageBase + "spec.toolbox.yaml";
  export const shortcutDebugJson = generatedBase + "toolbox.shortcut.json";
  export const pluginKitDebugXPCPath = generatedBase + "pluginkit.swift";
}
