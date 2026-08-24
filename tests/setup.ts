import { setCacheInvalidator } from "@/src/lib/cache-invalidator";

setCacheInvalidator({
  async invalidateTag() {
    // no-op under the test runner — see setCacheInvalidator's doc comment.
  },
});
