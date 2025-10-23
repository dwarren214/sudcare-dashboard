import { toBlob } from "html-to-image";

export interface ElementSnapshotOptions {
  pixelRatio?: number;
  backgroundColor?: string;
  filter?: (element: HTMLElement) => boolean;
}

export async function exportElementToPng(element: HTMLElement, options: ElementSnapshotOptions = {}): Promise<Blob> {
  const blob = await toBlob(element, {
    pixelRatio: options.pixelRatio ?? 2,
    backgroundColor: options.backgroundColor ?? "#ffffff",
    style: {
      margin: "0",
      padding: "0",
    },
    filter: options.filter,
  });

  if (!blob) {
    throw new Error("Failed to render snapshot.");
  }

  return blob;
}
