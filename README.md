# @iter-ai/toolbox-macos

`toolbox-macos` is a minimal package that enables OpenAI GPTs to interact with macOS apps like iMessage, email, or calendar through Shortcuts actions.
- **Simple Integration**: Easy setup with a local server and GPT API schema.
- **Privacy-Focused**: Runs locally to keep your data secure.
- **Versatile**: gives access to 128 APIs from Apple Shortcuts.

For a demo see: https://x.com/LinzhiQ/status/1729555314217734240?s=20




https://github.com/iter-ai/toolbox-macos/assets/19514537/2d752954-460d-4f1d-a23d-22f4a840702b

https://github.com/iter-ai/toolbox-macos/assets/19514537/8ae9287b-4dc0-4bfb-b976-2d9a1c1edb66



### Running the macOS Toolbox

On a macOS machine with [Node.js](https://nodejs.org/en/download) installed, run:

```bash
git clone https://github.com/iter-ai/toolbox-macos.git
npm install
npm run dev
```

The command will start
a [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-local-tunnel/)
to allow GPTs to connect to your machine.

### Agent architecture

`toolbox-macos` is designed with supporting custom GPTs in mind. While custom GPTs provide a flexible interface, they come with constraints like single-agent design, character limit for schema descriptions, etc.

Our custom GPT is designed to perform the following five steps:

1. `listTools` (`/list`): providing a list of available action names to the model
2. `selectTools` (`/schema`): providing the schema details for the input actions
3. `submitPlan` (`/plan`): this endpoint receives a plan from the model in plain text and always returns success. The
   goal of this endpoint is to simply hide the plan from the user.
4. `submitCritique` (`/critique`): similarly, this endpoint receives a critique of the plan and always returns success.
   Again, this dummy endpoint hides the critique from the user.
5. `runTool` (`/run`): this endpoint executes an action that the GPT decides to take with the given parameters.

The hierarchical design of `/list` and `/schema` enable `toolbox-macos` to support more than a hundred actions to a
single GPT. The model can dynamically query and decide which actions to take.
`/plan` and `/critique` abstract away the Chain of Thought and Self Critique steps from the user. The user can simply
focus on the conversation with the model.

You check the system prompt (in `cli/src/index.tsx`) for more details on how we instruct the agent to leverage these
endpoints.
There are several considerations when designing the agent architecture:

- Providing user information includes time zones and names
- Explaining specific quirks about Apple Shortcuts, such as timezone formats and how to find certain identifiers
- Instructing the model to follow the above five steps
- Instructing the model on some interaction patterns, such as when to ask for clarification and confirmation

### Apple Shortcuts

See [integration/shortcuts/README](./integration/shortcuts)
