import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(rootDir, "src", relPath), "utf-8");
}

function readPublic(relPath: string): Buffer {
  return fs.readFileSync(path.join(rootDir, "public", relPath));
}

describe("paYent Custom Cursor System (Desktop Pointer Fine Only)", () => {
  it("public directory contains all optimized cursor assets with valid PNG headers", () => {
    const assets = [
      { name: "payent-cursor.png", expectedWidth: 16, expectedHeight: 16 },
      { name: "payent-cursor-dark.png", expectedWidth: 16, expectedHeight: 16 },
      { name: "payent-cursor-pure.png", expectedWidth: 16, expectedHeight: 16 },
      { name: "payent-cursor@2x.png", expectedWidth: 32, expectedHeight: 32 },
      { name: "payent-cursor-dark@2x.png", expectedWidth: 32, expectedHeight: 32 },
    ];

    for (const { name, expectedWidth, expectedHeight } of assets) {
      const filePath = path.join(rootDir, "public", name);
      assert.ok(fs.existsSync(filePath), `Asset ${name} must exist in public/`);
      const buf = readPublic(name);
      assert.ok(buf.length > 200, `Asset ${name} must have non-trivial file size`);

      // Verify PNG magic bytes
      const isPng =
        buf[0] === 0x89 &&
        buf[1] === 0x50 &&
        buf[2] === 0x4e &&
        buf[3] === 0x47 &&
        buf[4] === 0x0d &&
        buf[5] === 0x0a &&
        buf[6] === 0x1a &&
        buf[7] === 0x0a;
      assert.ok(isPng, `Asset ${name} must be a valid PNG`);

      // Read dimensions from IHDR chunk (bytes 16..24)
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      assert.equal(width, expectedWidth, `${name} width must be ${expectedWidth}`);
      assert.equal(height, expectedHeight, `${name} height must be ${expectedHeight}`);
    }
  });

  it("styles.css enforces global cursor rules, responsive media query, and accurate hotspot", () => {
    const css = readSrc("styles.css");

    // 1. Desktop & laptop fine pointer media query (mobile untouched)
    assert.match(
      css,
      /@media\s*\(\s*hover:\s*hover\s*\)\s*and\s*\(\s*pointer:\s*fine\s*\)/,
      "Cursor rules must be scoped under @media (hover: hover) and (pointer: fine)"
    );

    // 2. CSS variables for default and pointer states with exact 50% hotspot (3 1)
    assert.match(
      css,
      /--payent-cursor-default:\s*url\(["']?\/payent-cursor\.png["']?\)\s+3\s+1,\s*auto/,
      "Root must define --payent-cursor-default with hotspot 3 1"
    );
    assert.match(
      css,
      /--payent-cursor-pointer:\s*url\(["']?\/payent-cursor\.png["']?\)\s+3\s+1,\s*pointer/,
      "Root must define --payent-cursor-pointer with hotspot 3 1"
    );

    // 3. Dark theme surface support with white cursor
    assert.match(
      css,
      /\.dark\s*\{[\s\S]*--payent-cursor-default:\s*url\(["']?\/payent-cursor-dark\.png["']?\)\s+3\s+1/,
      "Dark theme must define white cursor variant with hotspot 3 1"
    );

    // 4. Global application to html and body
    assert.match(
      css,
      /html,\s*body\s*\{[\s\S]*cursor:\s*var\(--payent-cursor-default\)/,
      "html, body must receive var(--payent-cursor-default)"
    );

    // 5. Interactive controls receive custom pointer cursor
    assert.match(
      css,
      /a,\s*button,[\s\S]*\.cursor-pointer\s*\{[\s\S]*cursor:\s*var\(--payent-cursor-pointer\)/,
      "Interactive buttons, links, and .cursor-pointer elements must receive custom pointer cursor"
    );

    // 6. Text inputs preserve native text I-beam
    assert.match(
      css,
      /input\[type=["']text["']\],[\s\S]*textarea,[\s\S]*\.cursor-text\s*\{[\s\S]*cursor:\s*text;/,
      "Text inputs and textareas must retain native cursor: text"
    );

    // 7. Disabled controls preserve not-allowed with !important
    assert.match(
      css,
      /:disabled,[\s\S]*\.cursor-not-allowed\s*\{[\s\S]*cursor:\s*not-allowed\s*!important;/,
      "Disabled controls must preserve cursor: not-allowed !important"
    );

    // 8. Draggable controls preserve grab / grabbing
    assert.match(css, /\.cursor-grab\s*\{[\s\S]*cursor:\s*grab;/, ".cursor-grab must preserve grab");
    assert.match(
      css,
      /\.cursor-grabbing\s*\{[\s\S]*cursor:\s*grabbing;/,
      ".cursor-grabbing must preserve grabbing"
    );
  });
});
