export function dataUrlPayload(dataUrl) {
  const value = String(dataUrl ?? "");
  const comma = value.indexOf(",");
  return comma >= 0 ? value.slice(comma + 1) : value;
}

export function blobToBase64(blob, FileReaderCtor = globalThis.FileReader) {
  return new Promise((resolve, reject) => {
    if (typeof FileReaderCtor !== "function") {
      reject(new Error("FileReader is unavailable"));
      return;
    }

    const reader = new FileReaderCtor();
    reader.onload = () => resolve(dataUrlPayload(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });
}

export function imageFileFromTransfer(transfer) {
  const items = Array.from(transfer?.items ?? []);
  for (const item of items) {
    if (item.kind !== "file" || !String(item.type ?? "").startsWith("image/")) {
      continue;
    }

    const file = item.getAsFile?.();
    if (file) {
      return { file, mimeType: item.type };
    }
  }

  const files = Array.from(transfer?.files ?? []);
  const file = files.find((candidate) => String(candidate?.type ?? "").startsWith("image/"));
  return file ? { file, mimeType: file.type } : null;
}

export async function sendEditorImageRequest({
  tabId,
  image,
  getEntry,
  readBlobAsBase64 = blobToBase64,
} = {}) {
  if (!tabId || !image?.file || typeof getEntry !== "function") {
    return false;
  }

  const data = await readBlobAsBase64(image.file);
  const entry = getEntry();
  if (!entry?.dioxus?.send) {
    return false;
  }

  entry.dioxus.send({
    type: "paste_image_requested",
    tab_id: tabId,
    mime_type: image.file.type || image.mimeType || "image/png",
    data,
  });
  return true;
}
