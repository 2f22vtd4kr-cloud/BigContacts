declare module "playwright" {
  export const chromium: {
    connectOverCDP(endpoint: string): Promise<{
      newPage(): Promise<{
        goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<unknown>;
        content(): Promise<string>;
        waitForTimeout(ms: number): Promise<void>;
        close(): Promise<void>;
      }>;
      close(): Promise<void>;
    }>;
    launch(options?: Record<string, unknown>): Promise<{
      newPage(): Promise<{
        goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<unknown>;
        content(): Promise<string>;
        waitForTimeout(ms: number): Promise<void>;
        close(): Promise<void>;
      }>;
      close(): Promise<void>;
    }>;
  };
}