import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the pg module - use vi.hoisted to make variables available in hoisted vi.mock
const { mockQuery, mockConnect, mockEnd } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockConnect: vi.fn(),
  mockEnd: vi.fn(),
}));

vi.mock("pg", () => ({
  Client: class MockClient {
    connect = mockConnect;
    end = mockEnd;
    query = mockQuery;
    constructor() {}
  },
}));

import { PostgresConnector, executePostgresQuery } from "./postgres";

const testConfig = {
  host: "localhost",
  port: 5432,
  database: "testdb",
  user: "testuser",
  password: "testpass",
};

describe("PostgresConnector", () => {
  let connector: PostgresConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new PostgresConnector(testConfig);
  });

  describe("connect / disconnect", () => {
    it("calls client.connect", async () => {
      await connector.connect();
      expect(mockConnect).toHaveBeenCalledOnce();
    });

    it("calls client.end on disconnect", async () => {
      await connector.disconnect();
      expect(mockEnd).toHaveBeenCalledOnce();
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

    it("rejects UPDATE statements", async () => {
      await connector.connect();
      await expect(
        connector.query("UPDATE users SET name = 'test'")
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
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, name: "Alice" }],
        rowCount: 1,
      });

      await connector.connect();
      const result = await connector.query("SELECT * FROM users", [], {
        allowedTables: ["users"],
      });

      expect(result.rows).toEqual([{ id: 1, name: "Alice" }]);
      expect(result.rowCount).toBe(1);
    });

    it("filters blocked columns from results", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, name: "Alice", salary: 50000 }],
        rowCount: 1,
      });

      await connector.connect();
      const result = await connector.query("SELECT * FROM users", [], {
        allowedTables: ["users"],
        blockedColumns: ["salary"],
      });

      expect(result.rows).toEqual([{ id: 1, name: "Alice" }]);
    });
  });
});

describe("executePostgresQuery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("connects, queries, and disconnects", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1 }],
      rowCount: 1,
    });

    const result = await executePostgresQuery(
      { host: "localhost", port: 5432, database: "db", user: "u", password: "p" },
      "SELECT * FROM users",
      [],
      { allowedTables: ["users"] }
    );

    expect(mockConnect).toHaveBeenCalledOnce();
    expect(result.rows).toEqual([{ id: 1 }]);
    expect(mockEnd).toHaveBeenCalledOnce();
  });

  it("disconnects even when query fails", async () => {
    mockQuery.mockRejectedValueOnce(new Error("query error"));

    await expect(
      executePostgresQuery(
        { host: "localhost", port: 5432, database: "db", user: "u", password: "p" },
        "SELECT * FROM users",
        [],
        { allowedTables: ["users"] }
      )
    ).rejects.toThrow();

    expect(mockEnd).toHaveBeenCalledOnce();
  });
});
