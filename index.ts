import type {
  FastifyReply,
  FastifyRequest,
  onRequestHookHandler,
  RouteGenericInterface,
} from "fastify";
import fastifyPlugin from "fastify-plugin";
import PocketBase, { type RecordService } from "pocketbase";

interface Options {
  pocketbaseUrl: string;
  superuserEmail: string;
  superuserPassword: string;
  authCollectionName?: string;
}

export const authPlugin = fastifyPlugin<Options>(
  async (fastify, opts) => {
    const authCollectionName = opts.authCollectionName ?? "users";
    const pb = new PocketBase(opts.pocketbaseUrl);
    const authCheck = new PocketBase(opts.pocketbaseUrl);

    await pb
      .collection("_superusers")
      .authWithPassword(opts.superuserEmail, opts.superuserPassword, {
        // This will trigger auto refresh or auto reauthentication in case
        // the token has expired or is going to expire in the next 30 minutes.
        autoRefreshThreshold: 30 * 60,
      });
    pb.autoCancellation(false);

    fastify.decorate("authCollection", pb.collection(authCollectionName));
    fastify.decorate(
      "authenticate",
      async ({ email, password }: { email: string; password: string }) => {
        const { record } = await authCheck
          .collection(authCollectionName)
          .authWithPassword(email, password);
        authCheck.authStore.clear();
        return record?.id;
      },
    );

    fastify.addHook<RouteGenericInterface, { checkAuthentication?: boolean }>(
      "onRoute",
      async (routeOptions) => {
        if (!routeOptions.config?.checkAuthentication) {
          return;
        }

        async function onRequest(req: FastifyRequest, reply: FastifyReply) {
          const userId = await req.getUserId();
          const user = await fastify.authCollection.getOne(userId);
          if (!user) {
            reply.statusCode = 401;
            throw new Error("Unauthenticated");
          }
        }

        routeOptions.onRequest = [
          ...((routeOptions.onRequest as onRequestHookHandler[] | undefined) ||
            []),
          onRequest,
        ];
      },
    );
  },
  {
    decorators: { request: ["getUserId"] },
    name: "pocketbase-auth",
  },
);

declare module "fastify" {
  interface FastifyInstance {
    authCollection: RecordService<{
      id: string;
      email: string;
      password: string;
    }>;
    authenticate: (user: {
      email: string;
      password: string;
    }) => Promise<string | undefined>;
  }
  interface FastifyRequest {
    getUserId: () => string | Promise<string>;
  }
}
