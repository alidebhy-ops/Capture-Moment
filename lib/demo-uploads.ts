export type DemoUpload = {
  buffer: Buffer;
  mimeType: string;
  name: string;
};

declare global {
  var captureMomentDemoUploads: Map<string, DemoUpload> | undefined;
}

function uploadStore(): Map<string, DemoUpload> {
  if (!globalThis.captureMomentDemoUploads) {
    globalThis.captureMomentDemoUploads = new Map();
  }
  return globalThis.captureMomentDemoUploads;
}

export function saveDemoUpload(upload: DemoUpload): string {
  const id = `demo-upload-${crypto.randomUUID().slice(0, 12)}`;
  uploadStore().set(id, upload);
  return id;
}

export function getDemoUpload(id: string): DemoUpload | undefined {
  return uploadStore().get(id);
}
