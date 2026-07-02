import { test, expect, _electron as electron } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

test("desktop shell starts its local core and loads Demo", async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "argus-development-smoke-"));
  const app = await electron.launch({
    args: [".", `--user-data-dir=${userData}`],
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: "http://127.0.0.1:5173",
      ARGUS_PYTHON: path.resolve(".venv/bin/python")
    }
  });

  try {
    const window = await app.firstWindow();
    await expect(window.getByText("ARGUS Studio").first()).toBeVisible();
    const loadButton = window.getByRole("button", { name: "加载内置 Demo" });
    await window.locator(".welcome, .pipeline-card").first().waitFor({ state: "visible" });
    if (await loadButton.isVisible()) await loadButton.click();
    await expect(window.getByText("视觉数据管线")).toBeVisible({ timeout: 30_000 });
    await expect(window.getByText("ARGUS 安全装备识别 Demo").first()).toBeVisible();
    fs.mkdirSync("docs/screenshots", { recursive: true });
    await window.screenshot({ path: "docs/screenshots/dashboard.png", fullPage: true });

    await window.getByRole("link", { name: /数据审计/ }).click();
    await expect(window.getByRole("heading", { name: "数据集审计" })).toBeVisible();
    await window.getByRole("button", { name: "运行审计" }).click();
    await expect(window.getByText("风险明细")).toBeVisible({ timeout: 30_000 });

    await window.getByRole("link", { name: /训练实验/ }).click();
    const demoExperiments = window.locator(".page-actions").getByRole("button", { name: "导入 Demo 实验" });
    await expect(demoExperiments).toBeVisible();
    await demoExperiments.click();
    await expect(window.getByText("yolo11n_baseline")).toBeVisible({ timeout: 30_000 });
    await window.screenshot({ path: "docs/screenshots/experiments.png", fullPage: true });

    await window.getByRole("link", { name: /标签复核/ }).click();
    await expect(window.getByText("样本信息")).toBeVisible({ timeout: 30_000 });
    await window.screenshot({ path: "docs/screenshots/label-inspector.png", fullPage: true });
  } finally {
    await app.close();
    fs.rmSync(userData, { recursive: true, force: true });
  }
});
