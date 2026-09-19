import type { SelectOption } from "@/components/ui/Select";
import type { CategoryDTO } from "@/types/api";

export function childrenOf(categories: CategoryDTO[], parentId: string | null): CategoryDTO[] {
  return categories
    .filter((c) => (c.parent_id ?? null) === parentId)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/** The category itself plus every descendant — used to filter products under a branch. */
export function descendantIds(categories: CategoryDTO[], rootId: string): Set<string> {
  const set = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of categories) {
      if (c.parent_id && set.has(c.parent_id) && !set.has(c.id)) {
        set.add(c.id);
        grew = true;
      }
    }
  }
  return set;
}

/** Depth-first flatten: children right under their parent (Marca → Tipo). */
export function flattenTree(
  categories: CategoryDTO[],
  parentId: string | null = null,
  depth = 0,
): { category: CategoryDTO; depth: number }[] {
  return childrenOf(categories, parentId).flatMap((c) => [
    { category: c, depth },
    ...flattenTree(categories, c.id, depth + 1),
  ]);
}

export function categoryPath(categories: CategoryDTO[], id: string | null | undefined): string[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const path: string[] = [];
  const seen = new Set<string>();
  let cursor = id ? byId.get(id) : undefined;
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    path.unshift(cursor.name);
    cursor = cursor.parent_id ? byId.get(cursor.parent_id) : undefined;
  }
  return path;
}

/** Options for the themed Select, indented by depth. `noneLabel` adds an empty choice. */
export function categoryOptions(categories: CategoryDTO[], noneLabel?: string, excludeId?: string): SelectOption[] {
  const excluded = excludeId ? descendantIds(categories, excludeId) : new Set<string>();
  const byId = new Map(categories.map((c) => [c.id, c]));
  const opts: SelectOption[] = flattenTree(categories)
    .filter(({ category }) => !excluded.has(category.id))
    .map(({ category, depth }) => ({
      value: category.id,
      label: category.name,
      depth,
      description: depth > 0 ? categoryPath(categories, category.parent_id).join(" › ") : undefined,
    }));
  void byId;
  return noneLabel ? [{ value: "", label: noneLabel }, ...opts] : opts;
}
