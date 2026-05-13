import {
  blockHintsEqual,
  normalizeBlockHints,
  setBlockHints,
} from "./editor-core.ts";

export type PapyroBlockHintsPayload = {
  revision?: number;
  fallback?: Record<string, unknown>;
  blocks?: Array<Record<string, unknown>>;
};

export type PapyroBlockHints = {
  revision: number;
  fallback: Record<string, unknown>;
  blocks: Array<Record<string, unknown>>;
};

export type PapyroBlockHintsEntry = {
  blockHints?: PapyroBlockHints | null;
};

export type PapyroBlockHintsApplyResult = {
  changed: boolean;
  error: "invalid_block_hints" | null;
  hints: PapyroBlockHints | null;
};

export class TiptapBlockHintsController {
  #hints: PapyroBlockHints | null = null;

  get hints(): PapyroBlockHints | null {
    return this.#hints
      ? {
          ...this.#hints,
          fallback: { ...this.#hints.fallback },
          blocks: this.#hints.blocks.map((block) => ({ ...block })),
        }
      : null;
  }

  attach(entry?: PapyroBlockHintsEntry | null): PapyroBlockHints | null {
    if (entry) {
      entry.blockHints = this.hints;
    }
    return this.hints;
  }

  apply(
    entry: PapyroBlockHintsEntry | null | undefined,
    hints: PapyroBlockHintsPayload,
  ): PapyroBlockHintsApplyResult {
    const current = this.#hints;
    const next = normalizeBlockHints(hints) as PapyroBlockHints | null;
    if (!next) {
      this.attach(entry);
      return {
        changed: false,
        error: "invalid_block_hints",
        hints: this.hints,
      };
    }

    const shadowEntry: PapyroBlockHintsEntry = { blockHints: current };
    const applied = setBlockHints(shadowEntry, next) as PapyroBlockHints;
    this.#hints = applied;
    this.attach(entry);

    return {
      changed: !blockHintsEqual(current, applied),
      error: null,
      hints: this.hints,
    };
  }
}

export function createTiptapBlockHintsController(): TiptapBlockHintsController {
  return new TiptapBlockHintsController();
}
