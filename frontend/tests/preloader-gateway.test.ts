import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Preloader Gateway Single-Load Verification", () => {
  const rootDir = path.resolve(process.cwd());
  const rootRoutePath = path.join(rootDir, "frontend/src/routes/__root.tsx");
  const preloaderPath = path.join(rootDir, "frontend/src/components/common/AppPreloader.tsx");
  const indexRoutePath = path.join(rootDir, "frontend/src/routes/index.tsx");

  it("__root.tsx renders AppPreloader without redundant navigate({ to: '/select' }) callback", () => {
    const content = fs.readFileSync(rootRoutePath, "utf-8");
    // Verify no navigate to /select upon preloader completion
    assert.doesNotMatch(content, /navigate\(\{\s*to:\s*["']\/select["']\s*\}\)/);
    // Verify AppPreloader is rendered cleanly
    assert.match(content, /<AppPreloader\s*\/>/);
  });

  it("AppPreloader uses stable ref for onComplete and avoids dependency array re-triggers", () => {
    const content = fs.readFileSync(preloaderPath, "utf-8");
    assert.match(content, /const onCompleteRef = useRef\(onComplete\);/);
    assert.match(content, /onCompleteRef\.current\s*=\s*onComplete;/);
    assert.match(content, /onCompleteRef\.current\?\.\(\);/);
    assert.doesNotMatch(content, /\[isVisible,\s*shouldReduceMotion,\s*onComplete\]/);
  });

  it("index.tsx binds root route '/' to ProductSelection (Gateway)", () => {
    const content = fs.readFileSync(indexRoutePath, "utf-8");
    assert.match(content, /createFileRoute\(["']\/["']\)/);
    assert.match(content, /component:\s*ProductSelection/);
  });
});
