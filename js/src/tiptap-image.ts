import { mergeAttributes, Node } from "@tiptap/core";
import type {
  CommandProps,
  MarkdownParseHelpers,
  MarkdownToken,
  NodeViewRendererProps,
} from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

import { sanitizeMarkdownImageSrc } from "./editor-core.ts";

type ImageAttributes = {
  src?: unknown;
  alt?: unknown;
  title?: unknown;
};

type ParsedImageDestination = {
  href: string;
  title: string;
};

type MarkdownImageToken = MarkdownToken & {
  type: "image";
  raw: string;
  href: string;
  text: string;
  title: string;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    papyroImage: {
      setImage: (attributes?: ImageAttributes) => ReturnType;
    };
  }
}

function normalizeText(value: unknown): string {
  return String(value ?? "");
}

function escapeImageAlt(text: unknown): string {
  return normalizeText(text).replace(/\\/g, "\\\\").replace(/\]/g, "\\]");
}

function escapeImageTitle(text: unknown): string {
  return normalizeText(text).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function imageLabel(attrs: ImageAttributes = {}): string {
  return normalizeText(attrs.alt).trim() || normalizeText(attrs.title).trim() || "Image preview";
}

function isEscaped(source: string, index: number): boolean {
  let backslashes = 0;
  for (let cursor = index - 1; cursor >= 0 && source[cursor] === "\\"; cursor -= 1) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
}

function findClosingBracket(source: string, openIndex: number, closeChar: string): number {
  for (let cursor = openIndex + 1; cursor < source.length; cursor += 1) {
    if (source[cursor] === closeChar && !isEscaped(source, cursor)) return cursor;
  }
  return -1;
}

function parseImageDestinationAndTitle(raw: unknown): ParsedImageDestination | null {
  const text = normalizeText(raw).trim();
  if (!text) return null;

  const angleMatch = /^<([^>]+)>(?:\s+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))?$/u.exec(text);
  if (angleMatch) {
    return {
      href: angleMatch[1].trim(),
      title: normalizeText(angleMatch[2] ?? angleMatch[3] ?? angleMatch[4]),
    };
  }

  const titled = /^(.*?)(?:\s+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))$/u.exec(text);
  if (titled) {
    return {
      href: titled[1].trim(),
      title: normalizeText(titled[2] ?? titled[3] ?? titled[4]),
    };
  }

  return {
    href: text,
    title: "",
  };
}

export function tokenizeMarkdownImage(source: string): MarkdownImageToken | undefined {
  const text = normalizeText(source);
  if (!text.startsWith("![")) return undefined;

  const altEnd = findClosingBracket(text, 1, "]");
  if (altEnd < 0 || text[altEnd + 1] !== "(") return undefined;

  const destinationEnd = findClosingBracket(text, altEnd + 1, ")");
  if (destinationEnd < 0) return undefined;

  const destination = parseImageDestinationAndTitle(text.slice(altEnd + 2, destinationEnd));
  if (!destination?.href) return undefined;

  return {
    type: "image",
    raw: text.slice(0, destinationEnd + 1),
    href: destination.href,
    text: text.slice(2, altEnd).replace(/\\]/g, "]").replace(/\\\\/g, "\\"),
    title: destination.title,
  };
}

function createImageDom(documentRef: Document, attrs: ImageAttributes = {}): HTMLElement {
  const figure = documentRef.createElement("span");
  figure.className = "mn-tiptap-image";
  figure.contentEditable = "false";
  figure.setAttribute("role", "img");
  figure.setAttribute("aria-label", imageLabel(attrs));

  const src = sanitizeMarkdownImageSrc(attrs.src);
  if (!src) {
    figure.classList.add("mn-tiptap-image-error");
    figure.textContent = normalizeText(attrs.src) || "Invalid image source";
    return figure;
  }

  const image = documentRef.createElement("img");
  image.src = src;
  image.alt = normalizeText(attrs.alt);
  image.loading = "lazy";
  image.decoding = "async";
  if (attrs.title) image.title = normalizeText(attrs.title);
  figure.appendChild(image);

  if (attrs.title) {
    const caption = documentRef.createElement("span");
    caption.className = "mn-tiptap-image-caption";
    caption.textContent = normalizeText(attrs.title);
    figure.appendChild(caption);
  }

  return figure;
}

export const PapyroImage = Node.create({
  name: "image",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: {
        default: "",
        parseHTML: (element) => element.getAttribute("src") ?? "",
        renderHTML: (attributes) => ({
          src: sanitizeMarkdownImageSrc(attributes.src),
        }),
      },
      alt: {
        default: "",
        parseHTML: (element) => element.getAttribute("alt") ?? "",
        renderHTML: (attributes) => ({
          alt: normalizeText(attributes.alt),
        }),
      },
      title: {
        default: "",
        parseHTML: (element) => element.getAttribute("title") ?? "",
        renderHTML: (attributes) => ({
          title: attributes.title ? normalizeText(attributes.title) : null,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "img",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: "mn-tiptap-image-element",
      }),
    ];
  },

  addNodeView() {
    return ({ node, view }: NodeViewRendererProps) => ({
      dom: createImageDom(view.dom.ownerDocument, node.attrs),
    });
  },

  markdownTokenName: "image",

  markdownTokenizer: {
    name: "image",
    level: "inline",
    start: "![",
    tokenize: tokenizeMarkdownImage,
  },

  parseMarkdown: (token: MarkdownToken, helpers: MarkdownParseHelpers) =>
    helpers.createNode("image", {
      src: normalizeText(token.href),
      alt: normalizeText(token.text),
      title: normalizeText(token.title),
    }),

  renderMarkdown: (node: ProseMirrorNode | { attrs?: ImageAttributes }) => {
    const attrs = node.attrs ?? {};
    const alt = escapeImageAlt(attrs.alt);
    const src = normalizeText(attrs.src);
    const title = normalizeText(attrs.title);
    return title
      ? `![${alt}](${src} "${escapeImageTitle(title)}")`
      : `![${alt}](${src})`;
  },

  addCommands() {
    return {
      setImage:
        (attributes: ImageAttributes = {}) =>
        ({ commands }: CommandProps) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              src: normalizeText(attributes.src),
              alt: normalizeText(attributes.alt),
              title: normalizeText(attributes.title),
            },
          }),
    };
  },
});

export function createPapyroImageExtensions() {
  return [PapyroImage];
}
