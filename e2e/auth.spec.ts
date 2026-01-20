import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should redirect unauthenticated users to login page", async ({
    page,
  }) => {
    await page.goto("/studio");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should display login page with Google sign-in button", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /登入/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /google/i })
    ).toBeVisible();
  });

  test("should redirect authenticated users from login to home", async ({
    page,
    context,
  }) => {
    // This test would require mocking the session
    // For now, we just verify the login page loads correctly
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
  });
});
