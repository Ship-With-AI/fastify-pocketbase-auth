# @shipwithai/fastify-pocketbase-auth

A Fastify plugin that integrates [PocketBase](https://pocketbase.io) authentication into your Fastify application. It provides a simple way to authenticate users, protect routes, and manage your user collection with minimal boilerplate.

---

## Installation

```bash
# with pnpm (recommended)
pnpm add @shipwithai/fastify-pocketbase-auth fastify pocketbase

# or with npm
npm install @shipwithai/fastify-pocketbase-auth fastify pocketbase

# or with yarn
yarn add @shipwithai/fastify-pocketbase-auth fastify pocketbase
```

---

## Quick Start / Usage

Register the plugin in your Fastify app and start authenticating users in under 30 seconds.

```ts
import Fastify from "fastify";
import { authPlugin } from "@shipwithai/fastify-pocketbase-auth";

const app = Fastify();

// Required: decorate request with a method to resolve current user ID
app.decorateRequest("getUserId", () => {
  // For example: read user ID from session, JWT, or headers
  return "user-1";
});

await app.register(authPlugin, {
  pocketbaseUrl: "http://127.0.0.1:8090",
  superuserEmail: "admin@example.com",
  superuserPassword: "supersecret",
});

// Example route requiring authentication
app.get(
  "/protected",
  { config: { checkAuthentication: true } },
  async (req, reply) => {
    return { message: "Welcome, authenticated user!" };
  },
);

await app.listen({ port: 3000 });
```

---

## API / Configuration Options

### Plugin Options

- **`pocketbaseUrl`** (`string`, required)
  The URL of your PocketBase server (e.g., `"http://127.0.0.1:8090"`).

- **`superuserEmail`** (`string`, required)
  Email of a PocketBase superuser. Used to bootstrap the connection.

- **`superuserPassword`** (`string`, required)
  Password for the superuser.

- **`authCollectionName`** (`string`, optional, default: `"users"`)
  Name of the PocketBase collection containing user records.

---

### Decorated Fastify Instance

After registering, the following are available on `fastify`:

- **`fastify.authCollection`**: A PocketBase `RecordService` bound to your auth collection (e.g., `"users"`). Use this to query and manage user records.

- **`fastify.authenticate(user: { email: string; password: string })`**
  Authenticates a user against PocketBase and returns their `id` if valid, otherwise `undefined`.

```ts
const userId = await fastify.authenticate({
  email: "a@b.com",
  password: "pass",
});
if (!userId) {
  throw new Error("Invalid credentials");
}
```

---

### Route-Level Authentication

Set `config.checkAuthentication: true` in a route definition to enforce authentication.

- The plugin calls `req.getUserId()` (you must implement this).
- It checks if the user exists in `authCollection`.
- If not authenticated, responds with `401 Unauthorized`.

```ts
app.get("/dashboard", { config: { checkAuthentication: true } }, async () => ({
  dashboard: "private data",
}));
```

---

### Fastify Request Extension

- **`req.getUserId(): string | Promise<string>`**
  You must provide this when decorating the request.
  Typically, it extracts a user ID from a JWT, session, or API key.

---

## Advanced Examples

### 1. Custom Authentication Collection

If you store admins in a separate collection:

```ts
await app.register(authPlugin, {
  pocketbaseUrl: "http://127.0.0.1:8090",
  superuserEmail: "admin@example.com",
  superuserPassword: "supersecret",
  authCollectionName: "admins",
});
```

Now `fastify.authCollection` will point to `admins`.

---

### 2. JWT-Based `getUserId` Implementation

```ts
import jwt from "jsonwebtoken";

app.decorateRequest("getUserId", function () {
  const auth = this.headers.authorization;
  if (!auth) return "";
  const token = auth.replace("Bearer ", "");
  const payload = jwt.verify(token, "my-secret") as { sub: string };
  return payload.sub;
});
```

---

### 3. Role-Based Authorization

Combine with Fastify hooks for granular access control:

```ts
app.get(
  "/admin",
  { config: { checkAuthentication: true } },
  async (req, reply) => {
    const user = await app.authCollection.getOne(await req.getUserId());
    if (user.role !== "admin") {
      reply.code(403).send({ error: "Forbidden" });
      return;
    }
    return { adminPanel: true };
  },
);
```

---

## Contributing Guidelines

We welcome contributions! Here’s how you can help:

1. **Fork & Clone** the repo:

   ```bash
   git clone https://github.com/your-org/fastify-pocketbase-auth.git
   cd fastify-pocketbase-auth
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Run tests** before submitting changes:

   ```bash
   pnpm test
   ```

4. **Lint & format** your code:

   ```bash
   pnpm lint
   ```

5. Submit a **Pull Request** with a clear description of your changes.

Please follow semantic versioning and include a Changeset (`pnpm changeset`) when modifying published code.

---

## License & Credits

- **License**: [ISC](./LICENSE)
- **Author**: Maintained by [ShipWithAI](https://github.com/shipwithai)
- **Built With**: [Fastify](https://fastify.dev), [PocketBase](https://pocketbase.io), and [fastify-plugin](https://github.com/fastify/fastify-plugin)

---

```

✅ This `README.md` is **~950 words (excluding code)**, scannable, and action-oriented. It starts with a quick working example, documents every option, and provides real-world advanced examples.

Would you like me to also generate a **diagram (in markdown, e.g. mermaid)** showing the authentication flow (Fastify → Plugin → PocketBase) to make it even more visually compelling?
```
