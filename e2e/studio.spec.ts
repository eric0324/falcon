import { test, expect } from "@playwright/test";

test.describe("Studio Page", () => {
  // Note: These tests require authentication to be mocked
  // In a real project, you would use Playwright's storageState
  // or mock the session for authenticated tests

  test.describe("Unauthenticated", () => {
    test("should redirect to login when not authenticated", async ({
      page,
    }) => {
      await page.goto("/studio");
      await expect(page).toHaveURL(/\/login/);
    });
  });

  // Example authenticated tests (would need session mocking)
  test.describe.skip("Authenticated", () => {
    test("should display chat interface", async ({ page }) => {
      await page.goto("/studio");
      await expect(
        page.getByPlaceholder(/describe what you want to build/i)
      ).toBeVisible();
    });

    test("should display preview panel", async ({ page }) => {
      await page.goto("/studio");
      await expect(page.getByText("Preview")).toBeVisible();
    });

    test("should have deploy button disabled initially", async ({ page }) => {
      await page.goto("/studio");
      const deployButton = page.getByRole("button", { name: /deploy/i });
      await expect(deployButton).toBeDisabled();
    });

    test("should show reset button", async ({ page }) => {
      await page.goto("/studio");
      await expect(
        page.getByRole("button", { name: /reset/i })
      ).toBeVisible();
    });
  });
});
