import type { CategoryDTO } from "@/types/api";
import type { CustomFieldDTO } from "@/types/custom-fields";

/**
 * Product columns can be scoped to product types (categories). A column scoped to
 * "Ropa" also applies to "Ropa › Polos": we walk up from the product's category.
 */
export function ancestorIds(categories: CategoryDTO[], categoryId: string | null | undefined): Set<string> {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const out = new Set<string>();
  let cursor = categoryId ? byId.get(categoryId) : undefined;
  if (categoryId && !cursor) out.add(categoryId);
  while (cursor && !out.has(cursor.id)) {
    out.add(cursor.id);
    cursor = cursor.parent_id ? byId.get(cursor.parent_id) : undefined;
  }
  return out;
}

export function isGlobalField(field: Pick<CustomFieldDTO, "category_ids">): boolean {
  return !field.category_ids || field.category_ids.length === 0;
}

export function fieldAppliesTo(
  field: Pick<CustomFieldDTO, "category_ids">,
  categoryId: string | null | undefined,
  categories: CategoryDTO[],
): boolean {
  if (isGlobalField(field)) return true;
  const chain = ancestorIds(categories, categoryId);
  return field.category_ids.some((id) => chain.has(id));
}

export function fieldsForCategory<T extends Pick<CustomFieldDTO, "category_ids">>(
  fields: T[],
  categoryId: string | null | undefined,
  categories: CategoryDTO[],
): T[] {
  return fields.filter((f) => fieldAppliesTo(f, categoryId, categories));
}

/** "Todos los productos" or "Ropa, Calzado" — short human label for a column's scope. */
export function scopeLabel(field: Pick<CustomFieldDTO, "category_ids">, categories: CategoryDTO[]): string {
  if (isGlobalField(field)) return "Todos los productos";
  const names = field.category_ids
    .map((id) => categories.find((c) => c.id === id)?.name)
    .filter(Boolean) as string[];
  if (names.length === 0) return "Tipos eliminados";
  return names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ");
}
