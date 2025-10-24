A tiny, fully-typed message layer between a VS Code extension host and a Webview.  
Designed for small extensions that want strongly-typed calls with a minimal runtime and an optional React Query adapter.

Quickstart — 5 minutes

1) Install packages
```sh
Host (extension): npm i @webview-rpc/host zod  
Client (webview): npm i @webview-rpc/client 
React Query (optional): npm i @webview-rpc/react-query
```

2) Host: define a router
Create a small router on the extension side. Procedures can validate inputs (Zod) and return values.

```ts
import { initWRPC } from "@webview-rpc/host";
import z from "zod";

const { router, procedure } = initWRPC.create();

export const appRouter = router({
  greet: procedure
    .input(z.object({ name: z.string().optional() }))
    .resolve(({ input }) => `Hello, ${input?.name ?? "host"}!`),
});
```

3) Host: attach the router when opening the webview
Attach the router to your WebviewPanel (example shows usage inside a registered command):

```ts
import * as path from "node:path";
import * as vscode from "vscode";
import { attachRouterToPanel } from "@webview-rpc/host";
import { appRouter } from "./router";

export function activate(context: vscode.ExtensionContext) {
  let currentPanel: vscode.WebviewPanel | undefined;

  const openCmd = vscode.commands.registerCommand("ext.open", async () => {

    currentPanel = vscode.window.createWebviewPanel(
      "example",
      "Example",
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    // set your html, resources, etc...
    // currentPanel.webview.html = ...

    // wire the router to the panel so host handles incoming requests
    attachRouterToPanel(appRouter, currentPanel, context);

    currentPanel.onDidDispose(() => (currentPanel = undefined), null, context.subscriptions);
  });

  context.subscriptions.push(openCmd);
}
```

4) Webview: create a client and call the host

```ts
import { createWrpcClient } from "@webview-rpc/client";
import type { AppRouter } from "./router";

const client = createWrpcClient<AppRouter>();

async function hello() {
  const msg = await client.call("greet", { name: "Webview" });
  console.log(msg); // "Hello, Webview!"
}
```

5) Optional: React Query integration
Wrap the client to get typed React Query hooks.

```ts
import { createWrpcClient } from "@webview-rpc/client";
import { withReactQuery } from "@webview-rpc/react-query";
import type { AppRouter } from "./router";

export const wrpc = withReactQuery<AppRouter>(createWrpcClient<AppRouter>());

// In React:
// const { data } = wrpc.useQuery("greet", { name: "UI" });
```

Core concepts

- Router (host): define named procedures. Procedures may declare Zod schemas and run resolvers.
- Client (webview): posts messages to the host via acquireVsCodeApi().postMessage and waits for responses.

Notes & gotchas

- Packages must be installed separately in your project (see install steps above). The monorepo contains all packages, but consumers should install the runtime packages they need.
- `@webview-rpc/shared` contains internal types/helpers consumed by the packages — it is used internally and normally does not need to be installed or imported directly.
- Zod is used on the host side for input validation and should be installed as a peer dependency if you use schema validation.
- The client throws if acquireVsCodeApi is not available — make sure client code runs inside a VS Code webview.

Development

- Build the repo from the monorepo root:
```sh
yarn
yarn build
```

License
This project is licensed under the MIT License