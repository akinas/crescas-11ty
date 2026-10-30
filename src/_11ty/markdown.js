import markdownIt from "markdown-it";

/**
 * Generate a URL- and Unicode-friendly slug (supports Hebrew & Latin).
 */
export function slugifyHeading(str) {
  return String(str || "")
    .trim()
    .toLowerCase()
    .replace(/['"״׳`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Plugin 1: Automatic heading IDs for h2-h4.
 */
function headingAnchorsPlugin(md) {
  md.core.ruler.push("heading_anchors", (state) => {
    const seen = new Map();
    const tokens = state.tokens;

    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== "heading_open") continue;
      const tag = tokens[i].tag;
      if (tag !== "h2" && tag !== "h3" && tag !== "h4") continue;
      if (tokens[i].attrGet("id")) continue;

      const inline = tokens[i + 1];
      if (!inline || inline.type !== "inline") continue;

      const rawText = inline.children
        ? inline.children
            .filter((t) => t.type === "text" || t.type === "code_inline")
            .map((t) => t.content)
            .join("")
        : inline.content;

      const base = slugifyHeading(rawText);
      if (!base) continue;

      const count = seen.get(base) || 0;
      seen.set(base, count + 1);
      const id = count === 0 ? base : `${base}-${count + 1}`;
      tokens[i].attrSet("id", id);
    }
  });
}

/**
 * Plugin 2: Fenced Scholarly Containers
 * Syntax:
 *   ::: aside [Optional Title]
 *   Markdown content...
 *   :::
 *
 * Supported types:
 *   - aside | sidenote | margin
 *   - box (parchment default)
 *   - box-navy | manuscript | apparatus
 *   - box-rubric | important | highlight
 *   - box-info | note
 *   - lead
 *   - dropcap
 *   - columns
 *   - figure [wide|full|small] [| Caption text]  (or ::: figure Caption text)
 */
function scholarlyContainersPlugin(md) {
  const CONTAINER_RE = /^(:{3,})\s*([a-zA-Z0-9_-]+)(?:\s+(.*))?$/;

  md.block.ruler.before(
    "fence",
    "scholarly_container",
    (state, startLine, endLine, silent) => {
      const startPos = state.bMarks[startLine] + state.tShift[startLine];
      const maxPos = state.eMarks[startLine];
      const firstLine = state.src.slice(startPos, maxPos).trim();

      if (!firstLine.startsWith(":::")) return false;
      const match = CONTAINER_RE.exec(firstLine);
      if (!match) return false;

      const marker = match[1];
      const markerLen = marker.length;
      const rawType = match[2].toLowerCase();
      const rawParams = (match[3] || "").trim();

      if (silent) return true;

      let nextLine = startLine + 1;
      let autoClosed = false;

      while (nextLine < endLine) {
        const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
        const lineMax = state.eMarks[nextLine];
        const lineText = state.src.slice(lineStart, lineMax).trim();

        if (
          lineText.startsWith(marker) &&
          /^:+$/.test(lineText) &&
          lineText.length >= markerLen
        ) {
          autoClosed = true;
          break;
        }
        nextLine++;
      }

      const oldParent = state.parentType;
      const oldLineMax = state.lineMax;
      state.parentType = "container";
      state.lineMax = nextLine;

      const openToken = state.push("scholarly_container_open", "div", 1);
      openToken.markup = marker;
      openToken.block = true;
      openToken.meta = { type: rawType, params: rawParams };
      openToken.map = [startLine, nextLine];

      state.md.block.tokenize(state, startLine + 1, nextLine);

      const closeToken = state.push("scholarly_container_close", "div", -1);
      closeToken.markup = marker;
      closeToken.block = true;
      closeToken.meta = { type: rawType, params: rawParams };

      state.parentType = oldParent;
      state.lineMax = oldLineMax;
      state.line = nextLine + (autoClosed ? 1 : 0);
      return true;
    },
    { alt: ["paragraph", "reference", "blockquote", "list"] }
  );

  function parseFigureParams(params) {
    let modifier = "";
    let caption = params;

    if (params.includes("|")) {
      const idx = params.indexOf("|");
      const first = params.slice(0, idx).trim().toLowerCase();
      if (["wide", "full", "small"].includes(first)) {
        modifier = first;
        caption = params.slice(idx + 1).trim();
      }
    } else if (["wide", "full", "small"].includes(params.toLowerCase())) {
      modifier = params.toLowerCase();
      caption = "";
    }
    return { modifier, caption };
  }

  md.renderer.rules.scholarly_container_open = (tokens, idx) => {
    const { type, params } = tokens[idx].meta;
    const renderedTitle = params ? md.renderInline(params) : "";

    if (type === "aside" || type === "sidenote" || type === "margin") {
      const titleHtml = renderedTitle
        ? `<div class="post-aside-title">${renderedTitle}</div>`
        : "";
      return `<aside class="post-aside" role="note">${titleHtml}<div class="post-aside-body">\n`;
    }

    if (type === "lead") {
      return `<div class="post-lead">\n`;
    }

    if (type === "dropcap") {
      return `<div class="post-dropcap">\n`;
    }

    if (type === "columns") {
      return `<div class="columns-container">\n`;
    }

    if (type === "figure") {
      const { modifier } = parseFigureParams(params);
      const modClass = modifier ? ` post-figure--${modifier}` : "";
      return `<figure class="post-figure post-figure--container${modClass}"><div class="post-figure-media">\n`;
    }

    // Box variants
    let variant = "parchment";
    if (type === "box-navy" || type === "manuscript" || type === "apparatus") {
      variant = "navy";
    } else if (
      type === "box-rubric" ||
      type === "important" ||
      type === "highlight"
    ) {
      variant = "rubric";
    } else if (type === "box-info" || type === "note") {
      variant = "info";
    }

    const titleHtml = renderedTitle
      ? `<div class="post-box-title">${renderedTitle}</div>`
      : "";
    return `<div class="post-box post-box--${variant}">${titleHtml}<div class="post-box-body">\n`;
  };

  md.renderer.rules.scholarly_container_close = (tokens, idx) => {
    const { type, params } = tokens[idx].meta;

    if (type === "aside" || type === "sidenote" || type === "margin") {
      return `</div></aside>\n`;
    }

    if (type === "lead" || type === "dropcap" || type === "columns") {
      return `</div>\n`;
    }

    if (type === "figure") {
      const { caption } = parseFigureParams(params);
      const captionHtml = caption
        ? `<figcaption class="post-figcaption">${md.renderInline(caption)}</figcaption>`
        : "";
      return `</div>${captionHtml}</figure>\n`;
    }

    return `</div></div>\n`;
  };
}

/**
 * Plugin 3: Automatic Figures & Captions from Markdown Images
 * Syntax:
 *   ![Alt text](/path/to/img.jpg "Caption text with *markdown* support")
 *   ![wide: Alt text](/path/to/img.jpg "Wide figure caption")
 *   ![small: Alt text](/path/to/img.jpg "Compact figure caption")
 */
function autoFiguresPlugin(md) {
  function extractSizeModifier(altText) {
    const m = /^(wide|full|small):\s*(.*)$/i.exec(altText || "");
    if (m) {
      return { modifier: m[1].toLowerCase(), cleanAlt: m[2] };
    }
    return { modifier: "", cleanAlt: altText || "" };
  }

  // Ensure lazy loading on images by default
  const defaultImageRender =
    md.renderer.rules.image ||
    function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    if (!token.attrGet("loading")) {
      token.attrSet("loading", "lazy");
    }
    if (!token.attrGet("decoding")) {
      token.attrSet("decoding", "async");
    }
    return defaultImageRender(tokens, idx, options, env, self);
  };

  md.core.ruler.after("inline", "scholarly_auto_figures", (state) => {
    const tokens = state.tokens;

    for (let i = 0; i < tokens.length - 2; i++) {
      if (
        tokens[i].type !== "paragraph_open" ||
        tokens[i + 1].type !== "inline" ||
        tokens[i + 2].type !== "paragraph_close"
      ) {
        continue;
      }

      // Skip paragraphs already inside an explicit ::: figure container
      let insideExplicitFigure = false;
      for (let k = i - 1; k >= 0; k--) {
        if (
          tokens[k].type === "scholarly_container_close" &&
          tokens[k].meta?.type === "figure"
        ) {
          break;
        }
        if (
          tokens[k].type === "scholarly_container_open" &&
          tokens[k].meta?.type === "figure"
        ) {
          insideExplicitFigure = true;
          break;
        }
      }
      if (insideExplicitFigure) continue;

      const children = tokens[i + 1].children || [];
      let imgToken = null;

      if (children.length === 1 && children[0].type === "image") {
        imgToken = children[0];
      } else if (
        children.length === 3 &&
        children[0].type === "link_open" &&
        children[1].type === "image" &&
        children[2].type === "link_close"
      ) {
        imgToken = children[1];
      }

      if (!imgToken) continue;

      const rawTitle = imgToken.attrGet("title");
      const { modifier, cleanAlt } = extractSizeModifier(imgToken.content);

      // Only convert to <figure> if a caption (title) or explicit size prefix is provided
      if (!rawTitle && !modifier) continue;

      // Update alt text if size prefix was stripped
      if (modifier) {
        imgToken.content = cleanAlt;
        if (imgToken.children && imgToken.children.length === 1) {
          imgToken.children[0].content = cleanAlt;
        }
      }

      // Remove title attribute so browser tooltip does not duplicate visible caption
      if (rawTitle && imgToken.attrs) {
        imgToken.attrs = imgToken.attrs.filter(([name]) => name !== "title");
      }

      const figOpen = new state.Token("auto_figure_open", "figure", 1);
      figOpen.meta = { modifier };

      const figClose = new state.Token("auto_figure_close", "figure", -1);
      figClose.meta = { caption: rawTitle || "" };

      tokens[i] = figOpen;
      tokens[i + 2] = figClose;
    }
  });

  md.renderer.rules.auto_figure_open = (tokens, idx) => {
    const mod = tokens[idx].meta?.modifier;
    const modClass = mod ? ` post-figure--${mod}` : "";
    return `<figure class="post-figure${modClass}"><div class="post-figure-frame">`;
  };

  md.renderer.rules.auto_figure_close = (tokens, idx) => {
    const caption = tokens[idx].meta?.caption;
    const captionHtml = caption
      ? `<figcaption class="post-figcaption">${md.renderInline(caption)}</figcaption>`
      : "";
    return `</div>${captionHtml}</figure>\n`;
  };
}

/**
 * Plugin 4: Scholarly Blockquote Citations
 * Supports:
 *   > Quoted passage...
 *   > — Source citation
 * AND:
 *   > Quoted passage...
 *   >
 *   > — Source citation
 */
function blockquoteAttributionPlugin(md) {
  const CITE_RE = /^(?:—|–|―|--)\s+(.+)$/;

  md.core.ruler.after("inline", "blockquote_attribution", (state) => {
    const tokens = state.tokens;

    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== "blockquote_open") continue;

      // Find matching blockquote_close at same nesting depth
      let depth = 1;
      let closeIdx = -1;
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].type === "blockquote_open") depth++;
        else if (tokens[j].type === "blockquote_close") {
          depth--;
          if (depth === 0) {
            closeIdx = j;
            break;
          }
        }
      }
      if (closeIdx === -1) continue;

      // Inspect last element before blockquote_close
      if (
        closeIdx >= i + 3 &&
        tokens[closeIdx - 3].type === "paragraph_open" &&
        tokens[closeIdx - 2].type === "inline" &&
        tokens[closeIdx - 1].type === "paragraph_close"
      ) {
        const inlineTok = tokens[closeIdx - 2];
        const raw = inlineTok.content.trim();

        // Case A: Entire final paragraph is "— Citation"
        const wholeMatch = CITE_RE.exec(raw);
        if (wholeMatch) {
          const citeOpen = new state.Token("blockquote_cite_open", "footer", 1);
          const citeInline = new state.Token("inline", "", 0);
          citeInline.content = wholeMatch[1].trim();
          citeInline.children = [];
          state.md.inline.parse(
            citeInline.content,
            state.md,
            state.env,
            citeInline.children
          );
          const citeClose = new state.Token(
            "blockquote_cite_close",
            "footer",
            -1
          );

          tokens.splice(closeIdx - 3, 3, citeOpen, citeInline, citeClose);
          continue;
        }

        // Case B: Multi-line paragraph where last line starts with "— Citation"
        const lines = inlineTok.content.split("\n");
        if (lines.length >= 2) {
          const lastLine = lines[lines.length - 1].trim();
          const lineMatch = CITE_RE.exec(lastLine);
          if (lineMatch) {
            const bodyContent = lines.slice(0, -1).join("\n").trimEnd();
            inlineTok.content = bodyContent;
            inlineTok.children = [];
            state.md.inline.parse(
              bodyContent,
              state.md,
              state.env,
              inlineTok.children
            );

            const citeOpen = new state.Token(
              "blockquote_cite_open",
              "footer",
              1
            );
            const citeInline = new state.Token("inline", "", 0);
            citeInline.content = lineMatch[1].trim();
            citeInline.children = [];
            state.md.inline.parse(
              citeInline.content,
              state.md,
              state.env,
              citeInline.children
            );
            const citeClose = new state.Token(
              "blockquote_cite_close",
              "footer",
              -1
            );

            tokens.splice(closeIdx, 0, citeOpen, citeInline, citeClose);
          }
        }
      }
    }
  });

  md.renderer.rules.blockquote_cite_open = () =>
    `<footer class="post-quote-cite"><cite>`;
  md.renderer.rules.blockquote_cite_close = () => `</cite></footer>\n`;
}

/**
 * Plugin 5: Pure Markdown Footnotes
 * Syntax:
 *   Inline reference: [^1] or [^ms-flor]
 *   Definition:
 *   [^1]: Footnote text (supports inline & multi-paragraph indented markdown).
 */
function scholarlyFootnotesPlugin(md) {
  const DEF_RE = /^\[\^([^\]\s]+)\]:[ \t]*(.*)$/;

  // 0. Initialize fresh footnote store per render call
  md.core.ruler.before("block", "footnote_init", (state) => {
    state.env.footnotes = { defs: Object.create(null), list: [] };
  });

  // 1. Parse footnote definitions
  md.block.ruler.before(
    "reference",
    "footnote_def",
    (state, startLine, endLine, silent) => {
      const start = state.bMarks[startLine] + state.tShift[startLine];
      const max = state.eMarks[startLine];
      if (state.sCount[startLine] - state.blkIndent >= 4) return false;

      const line = state.src.slice(start, max);
      const match = DEF_RE.exec(line);
      if (!match) return false;
      if (silent) return true;

      const label = match[1].toLowerCase();
      const contentLines = [match[2]];

      let nextLine = startLine + 1;
      while (nextLine < endLine) {
        if (state.isEmpty(nextLine)) {
          // Check if followed by an indented continuation paragraph
          let lookahead = nextLine + 1;
          while (lookahead < endLine && state.isEmpty(lookahead)) lookahead++;
          if (
            lookahead < endLine &&
            state.sCount[lookahead] - state.blkIndent >= 4
          ) {
            contentLines.push("");
            nextLine = lookahead;
            const lStart = state.bMarks[nextLine];
            const lMax = state.eMarks[nextLine];
            contentLines.push(
              state.src.slice(lStart, lMax).replace(/^(?: {4}|\t)/, "")
            );
            nextLine++;
            continue;
          }
          break;
        }

        const lStart = state.bMarks[nextLine] + state.tShift[nextLine];
        const lMax = state.eMarks[nextLine];
        const rawLine = state.src.slice(lStart, lMax);

        // Stop if a new footnote definition or container starts
        if (DEF_RE.test(rawLine) || rawLine.startsWith(":::")) break;

        if (state.sCount[nextLine] - state.blkIndent >= 2) {
          contentLines.push(rawLine);
          nextLine++;
        } else {
          break;
        }
      }

      if (!state.env.footnotes) {
        state.env.footnotes = { defs: Object.create(null), list: [] };
      }
      state.env.footnotes.defs[label] = contentLines.join("\n").trim();

      state.line = nextLine;
      return true;
    },
    { alt: ["paragraph", "reference"] }
  );

  // 2. Parse inline footnote references [^id]
  md.inline.ruler.after("image", "footnote_ref", (state, silent) => {
    const max = state.posMax;
    const start = state.pos;

    if (start + 3 >= max) return false;
    if (state.src.charCodeAt(start) !== 0x5b /* [ */) return false;
    if (state.src.charCodeAt(start + 1) !== 0x5e /* ^ */) return false;

    let pos = start + 2;
    while (pos < max) {
      const ch = state.src.charCodeAt(pos);
      if (ch === 0x20 || ch === 0x0a) return false;
      if (ch === 0x5d /* ] */) break;
      pos++;
    }
    if (pos === start + 2 || pos >= max) return false;

    const label = state.src.slice(start + 2, pos).toLowerCase();
    if (!state.env.footnotes || !(label in state.env.footnotes.defs)) {
      return false;
    }

    if (!silent) {
      const list = state.env.footnotes.list;
      let fnIdx = list.findIndex((item) => item.label === label);
      if (fnIdx === -1) {
        fnIdx = list.length;
        list.push({
          label,
          content: state.env.footnotes.defs[label],
          count: 0,
        });
      }
      list[fnIdx].count += 1;
      const subId = list[fnIdx].count;

      const token = state.push("footnote_ref", "", 0);
      token.meta = { id: fnIdx + 1, subId, label };
    }

    state.pos = pos + 1;
    return true;
  });

  // 3. Append footnotes section at the end of the document
  md.core.ruler.after("inline", "footnote_tail", (state) => {
    const list = state.env.footnotes?.list;
    if (!list || list.length === 0) return;

    const tailToken = new state.Token("footnote_section", "", 0);
    tailToken.meta = {
      list,
      lang: state.env.lang || "he",
    };
    state.tokens.push(tailToken);
  });

  md.renderer.rules.footnote_ref = (tokens, idx) => {
    const { id, subId } = tokens[idx].meta;
    const refId = subId > 1 ? `fnref-${id}-${subId}` : `fnref-${id}`;
    return `<sup class="footnote-ref"><a href="#fn-${id}" id="${refId}" role="doc-noteref">[${id}]</a></sup>`;
  };

  md.renderer.rules.footnote_section = (tokens, idx, options, env) => {
    const { list, lang } = tokens[idx].meta;
    const isHe = lang === "he";
    const heading = isHe ? "הערות שוליים" : "Footnotes";
    const backLabel = isHe ? "חזרה לגוף הטקסט" : "Back to text";

    const itemsHtml = list
      .map((item, i) => {
        const num = i + 1;
        // Render footnote markdown cleanly with an isolated env so footnotes don't recurse infinitely
        const rendered = md.render(item.content, { lang }).trim();
        let backlinks = "";
        for (let c = 1; c <= item.count; c++) {
          const refTarget = c > 1 ? `#fnref-${num}-${c}` : `#fnref-${num}`;
          const suffix = item.count > 1 ? `<sup>${c}</sup>` : "";
          backlinks += ` <a href="${refTarget}" class="footnote-backref" role="doc-backlink" aria-label="${escapeHtml(backLabel)}">↩${suffix}</a>`;
        }

        // Inject backlinks at the end of the last </p> if present
        let bodyWithBacklink = rendered;
        if (rendered.endsWith("</p>")) {
          bodyWithBacklink = rendered.slice(0, -4) + backlinks + "</p>";
        } else {
          bodyWithBacklink = `${rendered}<p>${backlinks}</p>`;
        }

        return `<li id="fn-${num}" class="footnote-item">${bodyWithBacklink}</li>`;
      })
      .join("\n");

    return `\n<section class="post-footnotes" role="doc-endnotes" aria-labelledby="footnotes-title">
  <div class="post-footnotes-rule" aria-hidden="true"></div>
  <h2 id="footnotes-title" class="post-footnotes-heading">${heading}</h2>
  <ol class="post-footnotes-list">
${itemsHtml}
  </ol>
</section>\n`;
  };
}

/**
 * Plugin 6: Inline Highlight Mark (==highlighted text==)
 */
function highlightMarkPlugin(md) {
  md.inline.ruler.before("emphasis", "scholarly_mark", (state, silent) => {
    const start = state.pos;
    const max = state.posMax;
    if (start + 3 >= max) return false;
    if (
      state.src.charCodeAt(start) !== 0x3d /* = */ ||
      state.src.charCodeAt(start + 1) !== 0x3d
    ) {
      return false;
    }

    const closeIdx = state.src.indexOf("==", start + 2);
    if (closeIdx === -1 || closeIdx === start + 2) return false;

    const inner = state.src.slice(start + 2, closeIdx);
    if (inner.startsWith(" ") || inner.endsWith(" ") || inner.includes("\n")) {
      return false;
    }

    if (!silent) {
      const openTok = state.push("mark_open", "mark", 1);
      openTok.attrSet("class", "post-mark");

      const children = [];
      state.md.inline.parse(inner, state.md, state.env, children);
      for (const child of children) {
        state.tokens.push(child);
      }

      state.push("mark_close", "mark", -1);
    }

    state.pos = closeIdx + 2;
    return true;
  });
}

export function createScholarlyMarkdown() {
  const md = markdownIt({
    html: true,
    linkify: false,
    typographer: false,
  });

  md.use(headingAnchorsPlugin);
  md.use(scholarlyContainersPlugin);
  md.use(autoFiguresPlugin);
  md.use(blockquoteAttributionPlugin);
  md.use(scholarlyFootnotesPlugin);
  md.use(highlightMarkPlugin);

  return md;
}
