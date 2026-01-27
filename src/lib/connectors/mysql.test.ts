import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock mysql2/promise - use vi.hoisted for variables used in vi.mock factory
const { mockExecute, mockEnd } = vi.hoisted(() => ({
  mockExecute: vi.fn(),
  mockEnd: vi.fn(),
}));

vi.mock("mysql2/promise", () => ({
  default: {
    createConnection: vi.fn().mockResolvedValue({
      execute: mockExecute,
      end: mockEnd,
    }),
  },
}));

import { MySQLConnector, executeMySQLQuery } from "./mysql";

const testConfig = {
  host: "localhost",
  port: 3306,
  database: "testdb",
  user: "testuser",
  password: "testpass",
};

describe("MySQLConnector", () => {
  let connector: MySQLConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new MySQLConnector(testConfig);
  });

  describe("connect / disconnect", () => {
    it("sets connection on connect", async () => {
      await connector.connect();
      // After connect, query should not throw "Not connected"
      mockExecute.mockResolvedValueOnce([[{ id: 1 }]]);
      const result = await connector.query("SELECT 1", [], { allowedTables: [] });
      expect(result.rows).toBeDefined();
    });

    it("disconnect clears connection", async () => {
      await connector.connect();
      await connector.disconnect();
      expect(mockEnd).toHaveBeenCalledOnce();
      // After disconnect, query should throw "Not connected"
      await expect(connector.query("SELECT 1")).rejects.toThrow("Not connected");
    });
  });

  describe("validateTables", () => {
    it("returns valid for allowed tables", () => {
      const result = connector.validateTables(
        "SELECT * FROM users",
        ["users", "orders"]
      );
      expect(result).toEqual({ valid: true, invalidTables: [] });
    });

    it("returns invalid for disallowed tables", () => {
      const result = connector.validateTables(
        "SELECT * FROM users JOIN secrets ON users.id = secrets.user_id",
        ["users"]
      );
      expect(result).toEqual({ valid: false, invalidTables: ["secrets"] });
    });

    it("handles case-insensitive table matching", () => {
      const result = connector.validateTables(
        "SELECT * FROM Users",
        ["users"]
      );
      expect(result).toEqual({ valid: true, invalidTables: [] });
    });
  });

  describe("query", () => {
    it("throws if not connected", async () => {
      await expect(
        connector.query("SELECT * FROM users")
      ).rejects.toThrow("Not connected to database");
    });

    it("rejects non-SELECT statements", async () => {
      await connector.connect();
      await expect(
        connector.query("INSERT INTO users VALUES (1, 'test')")
      ).rejects.toThrow("Only SELECT queries are allowed");
    });

    it("rejects DELETE statements", async () => {
      await connector.connect();
      await expect(
        connector.query("DELETE FROM users WHERE id = 1")
      ).rejects.toThrow("Only SELECT queries are allowed");
    });

    it("validates table access when allowedTables is specified", async () => {
      await connector.connect();
      await expect(
        connector.query("SELECT * FROM secrets", [], {
          allowedTables: ["users"],
        })
      ).rejects.toThrow("Table not allowed: secrets");
    });

    it("executes valid SELECT query", async () => {
      mockExecute.mockResolvedValueOnce([
        [{ id: 1, name: "Alice" }],
      ]);

      await connector.connect();
      const result = await connector.query("SELECT * FROM users", [], {
        allowedTables: ["users"],
      });

      expect(result.rows).toEqual([{ id: 1, name: "Alice" }]);
      expect(result.rowCount).toBe(1);
    });

    it("filters blocked columns from results", async () => {
      mockExecute.mockResolvedValueOnce([
        [{ id: 1, name: "Alice", salary: 50000 }],
      ]);

      await connector.connect();
      const result = await connector.query("SELECT * FROM users", [], {
        allowedTables: ["users"],
        blockedColumns: ["salary"],
      });

      expect(result.rows).toEqual([{ id: 1, name: "Alice" }]);
    });
  });
});

describe("executeMySQLQuery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("connects, queries, and disconnects", async () => {
    mockExecute.mockResolvedValueOnce([
      [{ id: 1 }],
    ]);

    const result = await executeMySQLQuery(
      { host: "localhost", port: 3306, database: "db", user: "u", password: "p" },
      "SELECT * FROM users",
      [],
      { allowedTables: ["users"] }
    );

    expect(result.rows).toEqual([{ id: 1 }]);
    expect(mockEnd).toHaveBeenCalledOnce();
  });

  it("disconnects even when query fails", async () => {
    mockExecute.mockRejectedValueOnce(new Error("query error"));

    await expect(
      executeMySQLQuery(
        { host: "localhost", port: 3306, database: "db", user: "u", password: "p" },
        "SELECT * FROM users",
        [],
        { allowedTables: ["users"] }
      )
    ).rejects.toThrow();

    expect(mockEnd).toHaveBeenCalledOnce();
  });
});
