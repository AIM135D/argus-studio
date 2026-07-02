import { test, expect, _electron as electron } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const executablePath = process.env.ARGUS_PACKAGED_EXECUTABLE;

test("packaged application starts its bundled core", async () => {
  test.skip(!executablePath, "ARGUS_PACKAGED_EXECUTABLE is not set");

  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "argus-packaged-smoke-"));
  const app = await electron.launch({
    executablePath,
    args: [`--user-data-dir=${userData}`]
  });

  try {
    const window = await app.firstWindow();
    await expect(window).toHaveTitle("ARGUS Studio");
    await expect(window.getByText("CORE 0.1.0")).toBeVisible();

    const loadButton = window.getByRole("button", { name: "加载内置 Demo" });
    if (await loadButton.isVisible()) await loadButton.click();

    await expect(window.getByText("视觉数据管线")).toBeVisible({ timeout: 30_000 });
    await expect(window.getByText("ARGUS 安全装备识别 Demo").first()).toBeVisible();
  } finally {
    await app.close();
    fs.rmSync(userData, { recursive: true, force: true });
  }
});
