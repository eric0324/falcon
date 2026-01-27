import { vi } from "vitest";

// Session fixtures
export const mockSession = {
  user: {
    id: "user-1",
    name: "Test User",
    email: "test@company.com",
    image: null,
    department: "engineering",
  },
  expires: "2099-01-01T00:00:00.000Z",
};

export const mockSessionNoDepartment = {
  user: {
    id: "user-1",
    name: "Test User",
    email: "test@company.com",
    image: null,
    department: null,
  },
  expires: "2099-01-01T00:00:00.000Z",
};
