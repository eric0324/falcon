import { describe, it, expect } from "vitest";
import { extractTableNames, filterBlockedColumns } from "./base";

describe("extractTableNames", () => {
  it("extracts table from simple FROM clause", () => {
    expect(extractTableNames("SELECT * FROM users")).toEqual(["users"]);
  });

  it("extracts table from JOIN clause", () => {
    expect(extractTableNames("SELECT * FROM users JOIN orders ON users.id = orders.user_id")).toEqual([
      "users",
      "orders",
    ]);
  });

  it("extracts multiple tables from multiple JOINs", () => {
    const sql = "SELECT * FROM users JOIN orders ON users.id = orders.user_id LEFT JOIN products ON orders.product_id = products.id";
    expect(extractTableNames(sql)).toEqual(["users", "orders", "products"]);
  });

  it("handles case insensitivity", () => {
    expect(extractTableNames("SELECT * FROM Users")).toEqual(["users"]);
    expect(extractTableNames("select * FROM ORDERS")).toEqual(["orders"]);
  });

  it("does not duplicate table names", () => {
    const sql = "SELECT * FROM users JOIN users ON users.id = users.id";
    expect(extractTableNames(sql)).toEqual(["users"]);
  });

  it("handles subqueries with FROM", () => {
    const sql = "SELECT * FROM users WHERE id IN (SELECT user_id FROM orders)";
    expect(extractTableNames(sql)).toEqual(["users", "orders"]);
  });

  it("returns empty array for queries without FROM", () => {
    expect(extractTableNames("SELECT 1")).toEqual([]);
  });

  it("handles extra whitespace", () => {
    expect(extractTableNames("SELECT *   FROM   users")).toEqual(["users"]);
  });
});

describe("filterBlockedColumns", () => {
  const rows = [
    { id: 1, name: "Alice", salary: 50000, email: "alice@test.com" },
    { id: 2, name: "Bob", salary: 60000, email: "bob@test.com" },
  ];

  it("filters out specified blocked columns", () => {
    const result = filterBlockedColumns(rows, ["salary"]);
    expect(result).toEqual([
      { id: 1, name: "Alice", email: "alice@test.com" },
      { id: 2, name: "Bob", email: "bob@test.com" },
    ]);
  });

  it("filters multiple blocked columns", () => {
    const result = filterBlockedColumns(rows, ["salary", "email"]);
    expect(result).toEqual([
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ]);
  });

  it("returns original rows when blockedColumns is empty", () => {
    const result = filterBlockedColumns(rows, []);
    expect(result).toBe(rows);
  });

  it("handles case-insensitive column matching", () => {
    const result = filterBlockedColumns(rows, ["Salary", "EMAIL"]);
    expect(result).toEqual([
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ]);
  });

  it("handles empty rows array", () => {
    const result = filterBlockedColumns([], ["salary"]);
    expect(result).toEqual([]);
  });

  it("handles non-matching blocked columns gracefully", () => {
    const result = filterBlockedColumns(rows, ["nonexistent"]);
    expect(result).toEqual(rows);
  });
});
