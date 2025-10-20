# VS Code Webview RPC (wrpc)

A tiny, type‑safe RPC layer to connect your **VS Code extension backend** (Extension Host) to a **Webview frontend**.

This library gives you:
- **Type‑safe calls** from the webview to the extension using dotted `router` paths.
- **Input validation** with [`zod`](https://github.com/colinhacks/zod).
- **Simple wiring**: one function on the host, one on the client.
- **Small API surface** you can learn in minutes.

---

## Installation

```bash
npm i webview-rpc zod
# or
yarn add webview-rpc zod
```

> `zod` is a peer dependency for schema validation.

---

## Core ideas

- You define a **router** on the extension side. Each endpoint is a `procedure` with an optional `input` schema and a `resolver`.
- On the webview side you call `rpc(path, input)` where `path` is a **dotted** string like `"files.readText"`.
- Requests and responses travel via VS Code's `postMessage` channel with a tiny protocol:
  - `rpc/request`, `rpc/success`, `rpc/error`.

---

## Quickstart

### 1) Define your router (Extension Host)

Create a module that both sides can **share for types** (e.g. `src/shared/router.ts`):

```ts
// src/shared/router.ts
import * as vscode from "vscode";
import z from "zod";
import { initWRPC } from "your-package-name";

const { router, procedure } = initWRPC.create();

export const appRouter = router({
  greet: procedure
    .input(z.object({ name: z.string().min(1) }))
    .resolve(({ input }) => `Hello, ${input.name}!`),
});

// Export the **type** for the webview to import
export type AppRouter = typeof appRouter;
```

Wire it to your `WebviewPanel` when you create it (e.g. in `extension.ts`):

```ts
// src/extension.ts
import * as vscode from "vscode";
import { attachRouterToPanel } from "webview-rpc";
import { appRouter } from "./shared/router";

export function activate(ctx: vscode.ExtensionContext) {
  ctx.subscriptions.push(
    vscode.commands.registerCommand("example.start", () => {
      const panel = vscode.window.createWebviewPanel(
        "exampleWebview",
        "Example",
        vscode.ViewColumn.One,
        { enableScripts: true }
      );

      // Serve your webview HTML/JS here...
      panel.webview.html = getHtml(panel.webview);

      // 👇 This connects the router to the panel
      attachRouterToPanel(panel, appRouter, ctx);
    })
  );
}
```

> `attachRouterToPanel(panel, router)` subscribes to `panel.webview.onDidReceiveMessage`, routes incoming `rpc/request`s to the matching procedure, validates `input` with its `zod` schema, and replies with `rpc/success` or `rpc/error`. It automatically disposes when the panel closes.

---

### 2) Call procedures from the webview

In your webview bundle (e.g. `webview/main.ts`):

```ts
// webview/main.ts
import type { AppRouter } from "../shared/router";
import { createRpcClient } from "your-package-name";

const wrpc = createRpcClient<AppRouter>();
async function run() {
  const greeting = await wrpc("greet", { name: "VS Code" });
  console.log(greeting); // -> "Hello, VS Code!"
}

run().catch(console.error);
```

> `createRpcClient<AppRouter>()` sets up a listener for `window.message` events and uses VS Code's `acquireVsCodeApi().postMessage(...)` under the hood.  
> Each call generates a `crypto.randomUUID()` request id, so your environment must support `crypto.randomUUID()` (VS Code webviews do).

---

## API Reference

### Host (Extension side)

#### `attachRouterToPanel(panel: vscode.WebviewPanel, router: RouterDef): void`
Connects your router to the webview. Handles:
- Listening for `rpc/request`.
- Looking up the matching procedure by **dotted path** (e.g. `"files.readText"`).
- Validating `input` with `zod`.
- Calling the `resolver(input, ctx)`.
- Posting back `rpc/success` or `rpc/error`.

**Resolver context**

Resolvers receive a `ctx` object (type: `ResolverOpts`) which includes at least:
- `panel: vscode.WebviewPanel` – the panel handling the request.

> Add whatever you need around this in your extension code (e.g., use `vscode` APIs inside resolvers).

---

#### Router & Procedures

```ts
import { initWRPC, createRouter } from "your-package-name";
import z from "zod";

const { router, procedure } = initWRPC.create();

const r = router({
  example: procedure
    .input(z.object({ id: z.string() }))
    .resolve(async ({ id }, ctx) => {
      // do work, use ctx.panel, vscode APIs, etc.
      return { ok: true, id };
    }),
});
```

- `procedure.input(schema)` → declare and validate inputs.
- `procedure.resolve((input, ctx) => result)` → implement the endpoint.
- `createRouter({ ... })` groups nested routers. Leaf properties must be `procedure`s; nested objects form path segments.

---

### Client (Webview side)

#### `createRpcClient<R extends RouterDef>(): (path, input) => Promise<output>`
Creates a client function:
```ts
const rpc = createRpcClient<AppRouter>();

// typed by the router definition:
const value = await rpc("segment.leaf", /* input */);
```

Types are inferred from the router definition:
- `path`: `PathKeys<R>`
- `input`: `InputAtPath<R, path>`
- return: `Promise<OutputAtPath<R, path>>`

---

## Error Handling

If a resolver throws or validation fails, the host sends:
```ts
{ kind: "rpc/error", id, error: { message: string } }
```
The client rejects the promise with an `Error(message)`. Use `try/catch` in the webview:

```ts
try {
  await rpc("files.readText", { uri: "bad://uri" });
} catch (e) {
  console.error("RPC failed:", (e as Error).message);
}
```

---

## Protocol

The library uses a minimal message protocol (see `rpcProtocol.ts`):
- `RpcRequest` – `{ kind: "rpc/request", id, path, input }`
- `RpcSuccess` – `{ kind: "rpc/success", id, result }`
- `RpcError` – `{ kind: "rpc/error", id, error: { message } }`

A small type guard `isRpcMessage(msg)` checks for `kind` starting with `"rpc/"`.

---

## Project structure suggestion

```
src/
  extension.ts            # create panel, attach router
  shared/router.ts        # router + type export used by both sides
  webview/main.ts         # calls createRpcClient<AppRouter>()
```

> Ensure your bundler includes `webview/main.ts` in the webview HTML and that `enableScripts: true` is set when creating the panel.

---

## License

MIT
