// create cloudflared tunnel
import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import React from "react";

import { createTunnel } from "./cloudflared.mts";
import { auth, port, registry, server } from "./server.mts";

type StateDispatch<T> = React.Dispatch<React.SetStateAction<T | undefined>>;

type AppDispatch = {
  setUrl: StateDispatch<string>;
};

export const startApp = async ({ setUrl }: AppDispatch) => {
  const { url } = await createTunnel(port, console.error);
  const toolboxJsonPath = "/iter/toolbox.json";

  // serve openapi spec
  server.get(toolboxJsonPath, (req, res) => {
    if (auth.accessCode !== req.query.code) {
      res.status(401).send("Unauthorized");
      return;
    }

    const generator = new OpenApiGeneratorV3(registry.definitions);
    const document = generator.generateDocument({
      openapi: "3.0.0",
      info: {
        title: "iter toolbox",
        version: "1.0.0",
        description: "iter toolbox api",
      },
      servers: [{ url }],
    });

    res.json(document);
  });

  // start server
  server.listen(port, () => {
    setUrl(url + toolboxJsonPath + "?code=" + auth.accessCode);
  });
};
