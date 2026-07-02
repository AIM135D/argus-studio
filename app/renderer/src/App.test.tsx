import { render, screen } from "@testing-library/react";
import { HashRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const emptyDashboard = {
  workspace: null,
  stats: { assets: 0, images: 0, videos: 0, labels: 0, datasets: 0, classes: 0, risks: 0, experiments: 0 },
  pipeline: [],
  tasks: [],
  reports: [],
  exports: []
};

describe("ARGUS Studio shell", () => {
  beforeEach(() => {
    window.location.hash = "#/dashboard";
    window.argus = {
      api: vi.fn(async (path: string) => {
        if (path === "/api/dashboard") return emptyDashboard;
        return [];
      }) as any,
      pick: vi.fn(async () => []),
      save: vi.fn(async () => null),
      reveal: vi.fn(async () => true),
      openPath: vi.fn(async () => ""),
      onCoreStatus: vi.fn(),
      platform: "darwin"
    };
  });

  it("renders the desktop navigation and actionable empty workspace", async () => {
    render(<HashRouter><App /></HashRouter>);
    expect(await screen.findByRole("button", { name: "加载内置 Demo" })).toBeEnabled();
    expect(screen.getByRole("heading", { name: /把视觉工程的/ })).toBeInTheDocument();
    expect(screen.getByText("数据集构建")).toBeInTheDocument();
    expect(screen.getByText("边缘交付")).toBeInTheDocument();
  });
});
