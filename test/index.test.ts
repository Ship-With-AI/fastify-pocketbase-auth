import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { authPlugin } from "../index.ts";

interface User {
  id: string;
  email: string;
  password: string;
}

vi.mock("pocketbase", () => {
  class MockRecordService {
    private records: Record<string, User>;
    constructor() {
      this.records = {
        "user-1": { id: "user-1", email: "a@b.com", password: "pass" },
      };
    }
    async getOne(id: string) {
      return this.records[id] || null;
    }
    async authWithPassword(email: string, password: string) {
      const record = Object.values(this.records).find(
        (r: User) => r.email === email && r.password === password,
      );
      return { record };
    }
    clear() {}
  }
  class MockPocketBase {
    authStore = { clear: vi.fn() };
    collection(_name: string) {
      return new MockRecordService();
    }
    autoCancellation() {}
    async authWithPassword(_email: string, _password: string) {
      return { token: "super-token" };
    }
  }
  return { default: MockPocketBase };
});

describe("authPlugin", () => {
  it("should decorate fastify instance with authCollection and authenticate", async () => {
    const testFastify = Fastify();
    testFastify.decorateRequest("getUserId", () => "user-1");

    await testFastify.register(authPlugin, {
      pocketbaseUrl: "http://mock",
      superuserEmail: "super@user.com",
      superuserPassword: "superpass",
    });

    expect(testFastify.authCollection).toBeDefined();
    expect(testFastify.authenticate).toBeDefined();
  });

  it("authenticate should return user ID for correct credentials", async () => {
    const testFastify = Fastify();
    testFastify.decorateRequest("getUserId", () => "user-1");

    await testFastify.register(authPlugin, {
      pocketbaseUrl: "http://mock",
      superuserEmail: "super@user.com",
      superuserPassword: "superpass",
    });

    const userId = await testFastify.authenticate({
      email: "a@b.com",
      password: "pass",
    });
    expect(userId).toBe("user-1");
  });

  it("should reject unauthenticated users", async () => {
    const testFastify = Fastify();
    testFastify.decorateRequest("getUserId", () => "non-existing");

    await testFastify.register(authPlugin, {
      pocketbaseUrl: "http://mock",
      superuserEmail: "super@user.com",
      superuserPassword: "superpass",
    });

    testFastify.get(
      "/protected",
      {
        config: {
          checkAuthentication: true,
        },
      },
      async () => {
        return { message: "Protected content" };
      },
    );

    const response = await testFastify.inject({
      method: "GET",
      url: "/protected",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "Unauthorized",
      message: "Unauthenticated",
      statusCode: 401,
    });
  });
});
