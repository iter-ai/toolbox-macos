import axios from "axios";
import { spawn } from "child_process";
import fs from "fs";

import { Path } from "./path.ts";

const setUpCloudflared = async () => {
  // reset log file
  fs.writeFileSync(Path.cloudflared.log, "");

  if (fs.existsSync(Path.cloudflared.bin)) {
    return Path.cloudflared.bin;
  }

  // get cloudflared binary
  const version = "2023.8.2";
  const distTar = `cloudflared-darwin-amd64.tgz`;
  const distBin = "cloudflared";

  const response = await axios.get(
    `https://github.com/cloudflare/cloudflared/releases/download/${version}/${distTar}`,
    {
      responseType: "stream",
    },
  );

  // write to file
  const tempCloudflareTarPath = `${Path.cloudflared.root}/${distTar}`;
  const streamWriter = fs.createWriteStream(tempCloudflareTarPath);
  response.data.pipe(streamWriter);

  // wait for download to finish
  await new Promise((resolve, reject) => {
    streamWriter.on("finish", resolve);
    streamWriter.on("error", reject);
  });

  // untar
  await new Promise((resolve, reject) => {
    const untar = spawn("tar", ["-xvf", tempCloudflareTarPath, "-C", Path.cloudflared.root]);
    untar.on("close", resolve);
    untar.on("error", reject);
  });
  fs.unlinkSync(tempCloudflareTarPath);

  // make it executable
  fs.renameSync(`${Path.cloudflared.root}/${distBin}`, Path.cloudflared.bin);
  fs.chmodSync(Path.cloudflared.bin, 0o755);

  return Path.cloudflared.bin;
};

type TunnelLog = {
  level: "info" | "error" | "warn";
  time: string;
  message: string;
};
const readTunnelLogs = (afterTs?: string): { newLogs: TunnelLog[]; lastTs?: string } => {
  const logFile = fs.readFileSync(Path.cloudflared.log, "utf-8");
  const logs = logFile
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line)); // TODO: only read new lines

  return {
    newLogs: afterTs ? logs.filter((log) => log.time > afterTs) : logs,
    lastTs: logs[logs.length - 1]?.time,
  };
};

type TunnelStatus = {
  url: string;
};

export const createTunnel = (port: number, onError: (message: string) => void) =>
  new Promise<TunnelStatus>(async (resolve) => {
    const binPath = await setUpCloudflared();

    // start watching log file for changes
    let timestamp: string | undefined;
    fs.watch(Path.cloudflared.log, { encoding: "utf-8" }, (event) => {
      if (event === "change") {
        const { newLogs, lastTs } = readTunnelLogs(timestamp);
        timestamp = lastTs;
        for (const log of newLogs) {
          if (log.level === "error") {
            onError(log.message);
          } else if (log.message?.includes("https://")) {
            // match if there is a https link with domain trycloudflare.com
            const match = log.message.match(/https:\/\/[\w-]+\.trycloudflare\.com/);
            if (match) {
              resolve({ url: match[0] });
            }
          }
        }
      }
    });

    // start cloudflared
    spawn(binPath, [
      "tunnel",
      "--url",
      `localhost:${port}`,
      "--logfile",
      Path.cloudflared.log,
      ...(process.env.TUNNEL_ID ? ["run", process.env.TUNNEL_ID] : []),
    ]);

    if (process.env.TUNNEL_URL) {
      resolve({ url: process.env.TUNNEL_URL });
    }
  });
