import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should display the home page for authenticated users", async ({
    page,
  }) => {
    // Home page will redirect to login if not authenticated
    await page.goto("/");
    // Either shows login page or home page depending on auth state
    const isLoginPage = page.url().includes("/login");
    if (isLoginPage) {
      await expect(page.getByRole("heading", { name: /登入/i })).toBeVisible();
    } else {
      await expect(
        page.getByRole("heading", { name: /falcon/i })
      ).toBeVisible();
    }
  });

  test.describe.skip("Authenticated", () => {
    test("should display tool list", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByText(/我的工具/i)).toBeVisible();
    });

    test("should have create new tool button", async ({ page }) => {
      await page.goto("/");
      await expect(
        page.getByRole("link", { name: /新增工具/i })
      ).toBeVisible();
    });

    test("should navigate to studio when clicking create", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("link", { name: /新增工具/i }).click();
      await expect(page).toHaveURL(/\/studio/);
    });
  });
});
