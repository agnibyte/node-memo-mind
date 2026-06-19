#!/usr/bin/env node
/**
 * html-to-react.js
 *
 * Reads  : input.html
 * Writes : output.jsx          — clean Next.js React component
 *          output.data.js      — all static data extracted into one object
 * region: commond
 * 
 * 
 * 
 *                       node html-to-react.js SelectPrescription
 * 
 * 
 * 
 * 
 * What's new (data extraction):
 *  ✅ All visible text nodes          → data.text.*
 *  ✅ All <img> src / alt             → data.images[n].src / .alt
 *  ✅ All <a> href + link text        → data.links[n].href / .label
 *  ✅ Heading text (h1–h6)            → data.headings.*
 *  ✅ <button> / <input> labels       → data.buttons.*
 *  ✅ <meta> description/keywords     → data.meta.*
 *  ✅ Inline style background URLs    → data.images[n].src
 *  ✅ Component imports data and uses data.* instead of hardcoded strings
 *  ✅ Collision-safe key naming       → label, label2, label3 …
 *  ✅ Keys are camelCase slugs of the content
 *
 * All original features preserved:
 *  ✅ class → className, for → htmlFor, tabindex → tabIndex, etc.
 *  ✅ <img> → Next.js <Image>
 *  ✅ style="" → style={{ camelCase }}
 *  ✅ HTML entities decoded
 *  ✅ onclick/on* → React camelCase handlers
 *  ✅ SVG attributes handled
 *  ✅ Void elements self-closed
 *  ✅ <textarea> defaultValue, <select> defaultValue
 *  ✅ Price text (₹) → prop
 * 
 *  ✅ <script>/<style> stripped with comment
 */
//#endregion


"use strict";

const fs = require("fs");
const path = require("path");
const { parse } = require("node-html-parser");

// ─── Paths ────────────────────────────────────────────────────────────────────
const DIR = path.resolve(__dirname);
const INPUT = path.join(DIR, "input.html");
const OUTPUT_JSX = path.join(DIR, "output.jsx");
const OUTPUT_DATA = path.join(DIR, "output.data.js");

// ─── Constants ────────────────────────────────────────────────────────────────

const ATTR_MAP = {
  class: "className", for: "htmlFor", tabindex: "tabIndex",
  colspan: "colSpan", rowspan: "rowSpan", cellpadding: "cellPadding",
  cellspacing: "cellSpacing", maxlength: "maxLength", minlength: "minLength",
  readonly: "readOnly", autocomplete: "autoComplete", autofocus: "autoFocus",
  autoplay: "autoPlay", enctype: "encType", usemap: "useMap",
  accesskey: "accessKey", contenteditable: "contentEditable",
  crossorigin: "crossOrigin", novalidate: "noValidate",
  allowfullscreen: "allowFullScreen", frameborder: "frameBorder",
  "http-equiv": "httpEquiv",
  // SVG
  viewbox: "viewBox", "stroke-width": "strokeWidth",
  "stroke-linecap": "strokeLinecap", "stroke-linejoin": "strokeLinejoin",
  "fill-rule": "fillRule", "clip-rule": "clipRule", "clip-path": "clipPath",
  "font-size": "fontSize", "font-weight": "fontWeight",
  "text-anchor": "textAnchor", "dominant-baseline": "dominantBaseline",
  "pointer-events": "pointerEvents", "stop-color": "stopColor",
  "stop-opacity": "stopOpacity", "flood-color": "floodColor",
  "flood-opacity": "floodOpacity",
};

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img",
  "input", "link", "meta", "param", "source", "track", "wbr",
]);

const BOOL_ATTRS = new Set([
  "disabled", "checked", "selected", "readonly", "multiple", "autofocus", "autoplay",
  "controls", "default", "defer", "formnovalidate", "hidden", "ismap", "loop",
  "nomodule", "novalidate", "open", "required", "reversed", "scoped",
  "allowfullscreen", "async",
]);

const HTML_ENTITIES = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'",
  "&nbsp;": "\u00a0", "&copy;": "©", "&reg;": "®", "&trade;": "™",
  "&mdash;": "—", "&ndash;": "–", "&laquo;": "«", "&raquo;": "»", "&hellip;": "…",
};

const STRIP_TAGS = new Set(["script", "style"]);

// Tags whose text content we treat as significant data
const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
const BUTTON_TAGS = new Set(["button", "a"]);
const SKIP_DATA_TAGS = new Set(["script", "style", "noscript"]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toCamelCase(str) {
  return str.replace(/[-_](\w)/g, (_, c) => c.toUpperCase());
}

function decodeEntities(str) {
  return str.replace(/&(?:[a-zA-Z]+|#\d+|#x[\da-fA-F]+);/g, (entity) => {
    if (HTML_ENTITIES[entity]) return HTML_ENTITIES[entity];
    if (entity.startsWith("&#x"))
      return String.fromCharCode(parseInt(entity.slice(3, -1), 16));
    if (entity.startsWith("&#"))
      return String.fromCharCode(parseInt(entity.slice(2, -1), 10));
    return entity;
  });
}

function styleStringToObject(styleStr) {
  const decls = [];
  let depth = 0, current = "";
  for (const ch of styleStr) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === ";" && depth === 0) { decls.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  if (current.trim()) decls.push(current.trim());
  return decls.filter(Boolean).map((decl) => {
    const colonIdx = decl.indexOf(":");
    if (colonIdx === -1) return null;
    const prop = decl.slice(0, colonIdx).trim();
    const value = decl.slice(colonIdx + 1).trim();
    const key = prop.startsWith("--") ? `"${prop}"` : toCamelCase(prop);
    return `${key}: "${value}"`;
  }).filter(Boolean).join(", ");
}

function isValidIdentifier(str) {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str);
}

function classToRef(cls) {
  return isValidIdentifier(cls) ? `styles.${cls}` : `styles['${cls}']`;
}

function classesToJsx(classStr) {
  const parts = classStr.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const refs = parts.map(classToRef);
  return refs.length === 1
    ? `{${refs[0]}}`
    : `{\`${refs.map((r) => `\${${r}}`).join(" ")}\`}`;
}

function htmlEventToReact(attrName) {
  return attrName.replace(/^on([a-z])/, (_, c) => `on${c.toUpperCase()}`);
}

// ─── Prop Registry (for disambiguating src, href, price …) ───────────────────
class PropRegistry {
  constructor() { this._map = new Map(); }

  register(baseName, defaultVal) {
    if (!this._map.has(baseName)) { this._map.set(baseName, defaultVal); return baseName; }
    let i = 2;
    while (this._map.has(`${baseName}${i}`)) i++;
    const newName = `${baseName}${i}`;
    this._map.set(newName, defaultVal);
    return newName;
  }

  registerOnce(baseName, defaultVal) {
    if (!this._map.has(baseName)) this._map.set(baseName, defaultVal);
    return baseName;
  }

  get entries() { return [...this._map.entries()]; }
  signature() { return this.entries.map(([n, d]) => `  ${n} = ${d},`).join("\n"); }
}

// ─── Data Registry ────────────────────────────────────────────────────────────
/**
 * Collects all static content as we walk the HTML tree.
 * Produces a JS module: export const data = { text: {…}, images: […], links: […], … }
 *
 * Key strategy:
 *   - text content → slugified camelCase key, e.g. "Shop Now" → shopNow
 *   - collisions → shopNow2, shopNow3 …
 *   - images  → flat array  { src, alt, width, height }
 *   - links   → flat array  { href, label }
 *   - headings → { h1: "…", h2: "…", h2b: "…" }  (h2, h2b, h2c for dupes)
 *   - buttons  → { shopNow: "Shop Now" }
 *   - meta     → { description: "…", keywords: "…" }
 */
class DataRegistry {
  constructor() {
    this.text = new Map(); // camelKey → string value
    this.headings = new Map(); // "h1" / "h2" / "h2b" → string
    this.buttons = new Map(); // camelKey → string label
    this.images = [];        // { src, alt }
    this.links = [];        // { href, label }
    this.meta = new Map(); // name → content

    // Internal counters for disambiguation
    this._textKeys = new Map();
    this._headingKeys = new Map();
    this._buttonKeys = new Map();
  }

  // ── Helpers ────────────────────────────────────────────────────────
  /** Turn any text into a safe camelCase JS key */
  _toKey(text) {
    const raw = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")   // strip non-alphanum
      .trim()
      .replace(/\s+(.)/g, (_, c) => c.toUpperCase()) // camelCase
      .replace(/^\d/, "n$&")          // can't start with digit
      .slice(0, 32)                   // max key length
      || "value";
    return raw;
  }

  /** Register in a map with auto-suffix for collisions. Returns the final key. */
  _register(map, counterMap, rawText, value) {
    const base = this._toKey(rawText);
    const count = (counterMap.get(base) || 0) + 1;
    counterMap.set(base, count);
    // First occurrence → base key. Second → base+"2", etc.
    const key = count === 1 ? base : `${base}${count}`;
    map.set(key, value);
    return key;
  }

  // ── Public API ─────────────────────────────────────────────────────
  addText(text) {
    const clean = decodeEntities(text).trim();
    if (!clean || clean.length < 2) return null;
    return this._register(this.text, this._textKeys, clean, clean);
  }

  addHeading(tag, text) {
    const clean = decodeEntities(text).trim();
    if (!clean) return null;
    const base = tag; // "h1", "h2" etc.
    const count = (this._headingKeys.get(base) || 0) + 1;
    this._headingKeys.set(base, count);
    const key = count === 1 ? base : `${base}${String.fromCharCode(97 + count - 2)}`; // h2, h2b, h2c …
    this.headings.set(key, clean);
    return key;
  }

  addButton(text) {
    const clean = decodeEntities(text).trim();
    if (!clean) return null;
    return this._register(this.buttons, this._buttonKeys, clean, clean);
  }

  addImage(src, alt) {
    const idx = this.images.length;
    this.images.push({ src: src || "", alt: alt || "" });
    return idx;
  }

  addLink(href, label) {
    const idx = this.links.length;
    this.links.push({ href: href || "#", label: decodeEntities(label || "").trim() });
    return idx;
  }

  addMeta(name, content) {
    if (name && content) this.meta.set(name, content);
  }

  // ── Render to JS module string ─────────────────────────────────────
  toModule(componentName) {
    const lines = [];
    lines.push(`/**`);
    lines.push(` * Static data for ${componentName}`);
    lines.push(` * Auto-generated by html-to-react.js — edit freely.`);
    lines.push(` */`);
    lines.push(``);
    lines.push(`const data = {`);

    // meta
    if (this.meta.size > 0) {
      lines.push(`  meta: {`);
      for (const [k, v] of this.meta)
        lines.push(`    ${k}: ${JSON.stringify(v)},`);
      lines.push(`  },`);
    }

    // headings
    if (this.headings.size > 0) {
      lines.push(`  headings: {`);
      for (const [k, v] of this.headings)
        lines.push(`    ${k}: ${JSON.stringify(v)},`);
      lines.push(`  },`);
    }

    // buttons
    if (this.buttons.size > 0) {
      lines.push(`  buttons: {`);
      for (const [k, v] of this.buttons)
        lines.push(`    ${k}: ${JSON.stringify(v)},`);
      lines.push(`  },`);
    }

    // text
    if (this.text.size > 0) {
      lines.push(`  text: {`);
      for (const [k, v] of this.text)
        lines.push(`    ${k}: ${JSON.stringify(v)},`);
      lines.push(`  },`);
    }

    // images
    if (this.images.length > 0) {
      lines.push(`  images: [`);
      for (const img of this.images) {
        lines.push(`    { src: ${JSON.stringify(img.src)}, alt: ${JSON.stringify(img.alt)} },`);
      }
      lines.push(`  ],`);
    }

    // links
    if (this.links.length > 0) {
      lines.push(`  links: [`);
      for (const lnk of this.links) {
        lines.push(`    { href: ${JSON.stringify(lnk.href)}, label: ${JSON.stringify(lnk.label)} },`);
      }
      lines.push(`  ],`);
    }

    lines.push(`};`);
    lines.push(``);
    lines.push(`export default data;`);
    return lines.join("\n");
  }
}

// ─── Pre-pass: collect all meta tags ──────────────────────────────────────────
function collectMeta(root, dataReg) {
  root.querySelectorAll("meta").forEach((m) => {
    const name = m.getAttribute("name") || m.getAttribute("property");
    const content = m.getAttribute("content");
    if (name && content) dataReg.addMeta(name, content);
  });
}

// ─── AST → JSX (with data extraction) ───────────────────────────────────────
/**
 * Walk one node, collecting static data into dataReg and emitting JSX.
 * When we encounter a text/image/link node, we write data.xxx instead of
 * the raw string so the JSX stays clean and all strings live in data.js.
 */
function nodeToJsx(node, props, dataReg, depth = 0) {
  const PAD = "  ".repeat(depth);

  // ── TEXT node ─────────────────────────────────────────────────────
  if (node.nodeType === 3) {
    let text = node.rawText;
    if (!text.trim()) return "";

    text = decodeEntities(text);

    // Price pattern stays as prop (as before)
    if (/(₹|Rs\.?\s*)\d/.test(text)) {
      const replaced = text.replace(/(₹|Rs\.?\s*)(\d[\d,.]*)/g, (_, _s, val) => {
        const name = props.register("price", `"${val}"`);
        return `{${name}}`;
      });
      return PAD + replaced.trim();
    }

    // Register as static data text
    const key = dataReg.addText(text.trim());
    if (!key) return PAD + text.trim(); // too short — keep inline
    return `${PAD}{data.text.${key}}`;
  }

  // ── COMMENT node ──────────────────────────────────────────────────
  if (node.nodeType === 8) {
    const inner = node.rawText.replace(/^<!--/, "").replace(/-->$/, "").trim();
    return `${PAD}{/* ${inner} */}`;
  }

  // ── ELEMENT node ──────────────────────────────────────────────────
  if (node.nodeType !== 1) return "";

  const tag = node.rawTagName.toLowerCase();
  if (SKIP_DATA_TAGS.has(tag) && tag !== "noscript") {
    if (STRIP_TAGS.has(tag))
      return `${PAD}{/* <${tag}> stripped — move to external file */}`;
  }

  const isVoid = VOID_TAGS.has(tag);
  const isImg = tag === "img";
  const isTextarea = tag === "textarea";
  const isSelect = tag === "select";
  const isHeading = HEADING_TAGS.has(tag);
  const isButton = tag === "button" || tag === "input";
  const isAnchor = tag === "a";
  const jsxTag = isImg ? "Image" : tag;

  // ── Collect image data ──────────────────────────────────────────
  let imgDataIdx = -1;
  if (isImg) {
    const src = node.getAttribute("src") || "";
    const alt = node.getAttribute("alt") || "";
    imgDataIdx = dataReg.addImage(src, alt);
  }

  // ── Collect link data ───────────────────────────────────────────
  let linkDataIdx = -1;
  if (isAnchor) {
    const href = node.getAttribute("href") || "#";
    const label = node.text?.trim() || "";
    linkDataIdx = dataReg.addLink(href, label);
  }

  // ── Select defaultValue ─────────────────────────────────────────
  let selectDefaultValue = null;
  if (isSelect) {
    const selectedOpt = node.querySelector("option[selected]");
    if (selectedOpt) {
      selectDefaultValue = selectedOpt.getAttribute("value") ?? selectedOpt.text?.trim() ?? "";
    }
  }

  // ── Build attribute string ──────────────────────────────────────
  const attrParts = [];

  for (const [rawKey, rawVal] of Object.entries(node.attributes)) {
    const key = rawKey.toLowerCase();

    if (key === "style") {
      // Check for background-image url() → register as image
      const bgMatch = rawVal.match(/background(?:-image)?\s*:\s*url\(['"]?([^'")\s]+)['"]?\)/i);
      if (bgMatch) dataReg.addImage(bgMatch[1], "background");
      const obj = styleStringToObject(rawVal);
      if (obj) attrParts.push(`style={{ ${obj} }}`);
      continue;
    }

    if (key === "class" || key === "classname") {
      const expr = classesToJsx(rawVal);
      if (expr) attrParts.push(`className=${expr}`);
      continue;
    }

    if (isImg && key === "src") {
      // Point to data.images[n].src instead of hardcoded string
      attrParts.push(`src={data.images[${imgDataIdx}].src}`);
      continue;
    }

    if (isImg && key === "alt") {
      attrParts.push(`alt={data.images[${imgDataIdx}].alt}`);
      continue;
    }

    if (isAnchor && key === "href") {
      attrParts.push(`href={data.links[${linkDataIdx}].href}`);
      continue;
    }

    if (key.startsWith("on") && key.length > 2) {
      const reactEvent = htmlEventToReact(key);
      const fnMatch = rawVal.match(/^([a-zA-Z_$][\w$]*)\s*\(.*\)$/);
      if (fnMatch) {
        attrParts.push(`${reactEvent}={${fnMatch[1]}}`);
      } else if (rawVal.trim()) {
        attrParts.push(`${reactEvent}={() => { /* TODO: ${rawVal} */ }}`);
      } else {
        attrParts.push(`${reactEvent}={() => {}}`);
      }
      continue;
    }

    if (BOOL_ATTRS.has(key) && (rawVal === "" || rawVal === key)) {
      attrParts.push(`${ATTR_MAP[key] || key}={true}`);
      continue;
    }

    if (key.startsWith("data-") || key.startsWith("aria-")) {
      attrParts.push(rawVal === "" ? key : `${key}="${rawVal}"`);
      continue;
    }

    if (key === "xlink:href") {
      attrParts.push(`href="${rawVal}"`);
      continue;
    }

    const jsxKey = ATTR_MAP[key] || toCamelCase(key);
    attrParts.push(`${jsxKey}="${rawVal}"`);
  }

  if (isImg) {
    attrParts.push("width={300}");
    attrParts.push("height={300}");
  }

  if (isSelect && selectDefaultValue !== null) {
    attrParts.push(`defaultValue="${selectDefaultValue}"`);
  }

  const attrStr = attrParts.length ? " " + attrParts.join(" ") : "";

  if (isVoid) return `${PAD}<${jsxTag}${attrStr} />`;

  if (isTextarea) {
    const textContent = node.text?.trim() || "";
    if (textContent) {
      const propName = props.register("defaultValue", `"${decodeEntities(textContent)}"`);
      return `${PAD}<textarea${attrStr} defaultValue={${propName}} />`;
    }
    return `${PAD}<textarea${attrStr} />`;
  }

  // ── Children ──────────────────────────────────────────────────────
  // For headings: collect text from direct text children into data.headings
  // and replace child rendering with a data reference
  if (isHeading) {
    const fullText = node.text?.trim();
    if (fullText) {
      const key = dataReg.addHeading(tag, fullText);
      return `${PAD}<${tag}${attrStr}>{data.headings.${key}}</${tag}>`;
    }
  }

  // For buttons/inputs: collect label text
  if (isButton) {
    const labelText = node.text?.trim() || node.getAttribute("value") || "";
    if (labelText) {
      const key = dataReg.addButton(labelText);
      if (key) {
        // Render children normally but replace text with data.buttons.*
        const childLines = (node.childNodes || [])
          .map((child) => {
            if (child.nodeType === 3 && child.rawText.trim()) {
              return `${"  ".repeat(depth + 1)}{data.buttons.${key}}`;
            }
            return nodeToJsx(child, props, dataReg, depth + 1);
          })
          .filter(Boolean);
        if (childLines.length === 0) return `${PAD}<${jsxTag}${attrStr} />`;
        return `${PAD}<${jsxTag}${attrStr}>\n${childLines.join("\n")}\n${PAD}</${jsxTag}>`;
      }
    }
  }

  // For anchor tags: wrap text children with data.links[n].label
  if (isAnchor && linkDataIdx >= 0) {
    const childLines = (node.childNodes || [])
      .map((child) => {
        if (child.nodeType === 3 && child.rawText.trim()) {
          return `${"  ".repeat(depth + 1)}{data.links[${linkDataIdx}].label}`;
        }
        return nodeToJsx(child, props, dataReg, depth + 1);
      })
      .filter(Boolean);
    if (childLines.length === 0) return `${PAD}<${jsxTag}${attrStr} />`;
    return `${PAD}<${jsxTag}${attrStr}>\n${childLines.join("\n")}\n${PAD}</${jsxTag}>`;
  }

  // Default: recurse into children
  const childLines = (node.childNodes || [])
    .map((child) => nodeToJsx(child, props, dataReg, depth + 1))
    .filter((s) => s !== "");

  if (childLines.length === 0) return `${PAD}<${jsxTag}${attrStr} />`;
  const children = childLines.join("\n");
  return `${PAD}<${jsxTag}${attrStr}>\n${children}\n${PAD}</${jsxTag}>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function main() {
  if (!fs.existsSync(INPUT)) {
    console.error(`❌  input.html not found at:\n    ${INPUT}`);
    process.exit(1);
  }

  const rawHtml = fs.readFileSync(INPUT, "utf8");
  const componentName = (process.argv[2] || "NewComponent")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .replace(/^[^A-Za-z]+/, "") || "NewComponent";

  console.log(`\n📂  Reading    : ${INPUT}`);
  console.log(`⚙️   Component  : ${componentName}`);

  const root = parse(rawHtml, {
    lowerCaseTagName: true,
    comment: true,
    fixNestedATags: true,
    parseNoneClosedTags: true,
  });

  const body = root.querySelector("body");
  const topNodes = body ? body.childNodes : root.childNodes;

  const meaningful = topNodes.filter((n) => {
    if (n.nodeType === 3) return n.rawText.trim() !== "";
    return n.nodeType === 1 || n.nodeType === 8;
  });

  if (meaningful.length === 0) {
    console.error("❌  No meaningful HTML nodes found in input.html");
    process.exit(1);
  }

  const props = new PropRegistry();
  const dataReg = new DataRegistry();

  // Collect <meta> tags (title, description, keywords, og:* …)
  collectMeta(root, dataReg);

  // Convert each top-level node
  const jsxLines = meaningful
    .map((n) => nodeToJsx(n, props, dataReg, 2))
    .filter(Boolean);

  let returnBody;
  if (jsxLines.length === 1) {
    returnBody = jsxLines[0].trimStart();
  } else {
    const inner = jsxLines.join("\n");
    returnBody = `<>\n${inner}\n    </>`;
  }

  const needsImage = rawHtml.toLowerCase().includes("<img");

  const imports = [
    `import React from 'react';`,
    needsImage ? `import Image from 'next/image';` : null,
    `import styles from './${componentName}.module.scss';`,
    `import data from './${componentName}.data.js';`,
  ].filter(Boolean).join("\n");

  const propSig = props.signature();
  const component = `${imports}

export default function ${componentName}({
${propSig || "  // no dynamic props extracted"}
}) {
  return (
    ${returnBody}
  );
}
`;

  // Write JSX
  fs.writeFileSync(OUTPUT_JSX, component, "utf8");
  console.log(`✅  JSX written : ${OUTPUT_JSX}`);

  // Write data module
  const dataModule = dataReg.toModule(componentName);
  fs.writeFileSync(OUTPUT_DATA, dataModule, "utf8");
  console.log(`✅  Data written: ${OUTPUT_DATA}`);

  // ── Summary ──────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(62)}`);

  const propEntries = props.entries;
  if (propEntries.length) {
    console.log(`\n📦  Dynamic props extracted:`);
    propEntries.forEach(([n, d]) => console.log(`   ${n.padEnd(18)} →  ${d}`));
  }

  const textCount = dataReg.text.size;
  const headingCount = dataReg.headings.size;
  const buttonCount = dataReg.buttons.size;
  const imageCount = dataReg.images.length;
  const linkCount = dataReg.links.length;
  const metaCount = dataReg.meta.size;

  console.log(`\n📊  Static data extracted into ${componentName}.data.js:`);
  if (metaCount) console.log(`   meta     : ${metaCount} entries`);
  if (headingCount) console.log(`   headings : ${headingCount} (${[...dataReg.headings.keys()].join(", ")})`);
  if (buttonCount) console.log(`   buttons  : ${buttonCount} (${[...dataReg.buttons.keys()].join(", ")})`);
  if (textCount) console.log(`   text     : ${textCount} strings`);
  if (imageCount) console.log(`   images   : ${imageCount}`);
  if (linkCount) console.log(`   links    : ${linkCount}`);

  console.log(`\n${"─".repeat(62)}\n`);
  console.log(`📄  ${componentName}.data.js preview:\n`);
  console.log(dataModule);
  console.log(`\n${"─".repeat(62)}\n`);
  console.log(`📄  ${componentName}.jsx preview:\n`);
  console.log(component);
}

main();