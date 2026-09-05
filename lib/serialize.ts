// Menjalankan pekerjaan bertanda kunci sama satu per satu.
//
// Dibutuhkan di dua tempat yang polanya sama: album Telegram yang tiba sebagai
// beberapa webhook sekaligus, dan foto iPhone yang dikirim beruntun untuk
// tanggal yang sama. Keduanya melakukan baca-ubah-tulis pada momen yang sama,
// jadi kalau berjalan bersamaan salah satunya akan menimpa yang lain.
//
// Kuncinya per proses. Cold start di tengah antrean hanya membuat satu momen
// tambahan, bukan kehilangan media.
declare global {
  var captureMomentLocks: Map<string, Promise<unknown>> | undefined;
}

const MAX_TRACKED_KEYS = 200;

function locks(): Map<string, Promise<unknown>> {
  if (!globalThis.captureMomentLocks) {
    globalThis.captureMomentLocks = new Map();
  }
  return globalThis.captureMomentLocks;
}

export async function runSerialized<T>(
  key: string,
  task: () => Promise<T>
): Promise<T> {
  const store = locks();
  const previous = store.get(key) ?? Promise.resolve();

  // Antrean tetap berjalan walau pekerjaan sebelumnya gagal.
  const run = previous.then(task, task);
  store.set(
    key,
    run.then(
      () => undefined,
      () => undefined
    )
  );

  try {
    return await run;
  } finally {
    if (store.size > MAX_TRACKED_KEYS) store.clear();
  }
}
