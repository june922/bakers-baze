import { revalidateTag } from "next/cache";

export interface CacheInvalidator {
  invalidateTag(tag: string): Promise<void>;
}

class NextCacheInvalidator implements CacheInvalidator {
  async invalidateTag(tag: string): Promise<void> {
    revalidateTag(tag, "max");
  }
}

export let cacheInvalidator: CacheInvalidator = new NextCacheInvalidator();

/**
 * Swaps the active invalidator — used by tests, since revalidateTag() requires
 * a live Next.js request/render context that doesn't exist under a test runner.
 * This is the reason the CacheInvalidator boundary exists: business logic only
 * ever depends on the interface, never on next/cache directly.
 */
export function setCacheInvalidator(invalidator: CacheInvalidator): void {
  cacheInvalidator = invalidator;
}

export function storefrontCacheTag(tenantId: string): string {
  return `storefront:${tenantId}`;
}
