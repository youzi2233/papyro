import React, { useEffect, useRef, useState } from "react";

function stopEditorPointer(event) {
  event?.stopPropagation?.();
}

export function PapyroLinkEditor({ state }) {
  const inputRef = useRef(null);
  const [href, setHref] = useState(state?.href ?? "");
  const labels = state?.labels ?? {};

  useEffect(() => {
    setHref(state?.href ?? "");
  }, [state?.href, state?.open]);

  useEffect(() => {
    const input = inputRef.current;
    if (!state?.open || !input) return;
    input.focus();
    input.select();
  }, [state?.open]);

  return (
    <>
      <div className="mn-tiptap-link-editor-title">
        {labels.title}
      </div>
      <form
        className="mn-tiptap-link-editor-form"
        onSubmit={(event) => {
          event.preventDefault();
          state.apply(href);
        }}
      >
        <input
          ref={inputRef}
          className="mn-tiptap-link-editor-input"
          type="text"
          inputMode="url"
          spellCheck={false}
          aria-label={labels.input}
          placeholder={labels.placeholder}
          value={href}
          onChange={(event) => setHref(event.target.value)}
          onPointerDown={stopEditorPointer}
          onMouseDown={(event) => event.stopPropagation()}
        />
        <div
          className={`mn-tiptap-link-editor-error${state?.error ? "" : " hidden"}`}
          role="alert"
        >
          {state?.error ?? ""}
        </div>
        <div className="mn-tiptap-link-editor-actions">
          <button
            type="button"
            className="mn-tiptap-link-editor-button subtle"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              state.remove();
            }}
          >
            {labels.remove}
          </button>
          <button
            type="submit"
            className="mn-tiptap-link-editor-button primary"
          >
            {labels.apply}
          </button>
        </div>
      </form>
      <button
        type="button"
        className="mn-tiptap-link-editor-close"
        aria-label={labels.close}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          state.close();
        }}
      />
    </>
  );
}
