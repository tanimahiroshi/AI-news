/**
 * 503 UNAVAILABLE など一時的なエラーに対してリトライする。
 * Gemini API は高負荷時に 503 を返すことがあるため、指数バックオフで自動回復する。
 */

const RETRYABLE_STATUS_CODES = new Set([503, 502, 429]);

function isRetryable(error: unknown): boolean {
  if (error !== null && typeof error === "object") {
    const status = (error as Record<string, unknown>).status;
    if (typeof status === "number" && RETRYABLE_STATUS_CODES.has(status)) {
      return true;
    }
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param fn       実行する非同期関数
 * @param maxTries 最大試行回数（初回を含む）。デフォルト 4 = 最大 3 回リトライ
 * @param baseMs   初回待機ミリ秒。以降は 2 倍ずつ増える。デフォルト 5000ms
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxTries = 4,
  baseMs = 5_000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxTries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryable(error) || attempt === maxTries) {
        throw error;
      }

      const waitMs = baseMs * 2 ** (attempt - 1);
      console.warn(
        `[retry] Gemini API が一時的に利用不可（試行 ${attempt}/${maxTries}）。${waitMs / 1000}秒後にリトライします...`,
      );
      await sleep(waitMs);
    }
  }

  throw lastError;
}
