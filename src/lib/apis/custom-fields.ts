import { apiClient } from "@/lib/api-client";
import type { MessageResponse } from "@/types/api";
import type { CustomFieldDTO, CustomFieldEntity, CustomFieldType } from "@/types/custom-fields";

const base = (companyId: string) => `/companies/${companyId}`;

export const customFieldsApi = {
  list: (companyId: string, entity: CustomFieldEntity) =>
    apiClient.get<CustomFieldDTO[]>(`${base(companyId)}/custom-fields?entity=${entity}`),
  create: (
    companyId: string,
    body: {
      entity: CustomFieldEntity;
      label: string;
      field_type: CustomFieldType;
      options?: string[];
      is_required?: boolean;
      /** Product types it applies to; omit or [] for every product. */
      category_ids?: string[];
    },
  ) => apiClient.post<CustomFieldDTO>(`${base(companyId)}/custom-fields`, body),
  /** Create-if-missing (by label slug). Used by smart imports that add columns on the fly. */
  ensure: (
    companyId: string,
    entity: CustomFieldEntity,
    fields: { label: string; field_type?: CustomFieldType; options?: string[]; category_ids?: string[] }[],
  ) => apiClient.post<CustomFieldDTO[]>(`${base(companyId)}/custom-fields/ensure`, { entity, fields }),
  update: (
    companyId: string,
    id: string,
    body: Partial<Pick<CustomFieldDTO, "label" | "options" | "is_visible" | "is_required" | "position" | "category_ids">>,
  ) => apiClient.patch<CustomFieldDTO>(`${base(companyId)}/custom-fields/${id}`, body),
  reorder: (companyId: string, entity: CustomFieldEntity, ids: string[]) =>
    apiClient.post<CustomFieldDTO[]>(`${base(companyId)}/custom-fields/reorder`, { entity, ids }),
  remove: (companyId: string, id: string) =>
    apiClient.del<MessageResponse>(`${base(companyId)}/custom-fields/${id}`),
};

export const preferencesApi = {
  get: <T = unknown>(companyId: string, key: string) =>
    apiClient.get<{ key: string; value: T | null }>(`${base(companyId)}/preferences/${encodeURIComponent(key)}`),
  put: <T = unknown>(companyId: string, key: string, value: T) =>
    apiClient.put<{ key: string; value: T }>(`${base(companyId)}/preferences/${encodeURIComponent(key)}`, { value }),
};
