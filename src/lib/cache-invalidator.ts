export interface CacheInvalidator {
  invalidateTag(tag: string): Promise<void>;
}
