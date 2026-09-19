"use client";

import { useCallback, useEffect, useState } from "react";
import { useApi } from "./useApi";
import { customFieldsApi, preferencesApi } from "@/lib/apis/custom-fields";
import type { CustomFieldDTO, CustomFieldEntity } from "@/types/custom-fields";

/**
 * Column configuration for a table of `entity` records: the company's custom fields
 * plus which built-in columns the user hid. Hidden built-ins persist server-side
 * (preference `columns:<entity>`) so the view is the same on every device.
 */
export function useColumnConfig(companyId: string | null, entity: CustomFieldEntity) {
  const fields = useApi(
    () => (companyId ? customFieldsApi.list(companyId, entity) : Promise.resolve([] as CustomFieldDTO[])),
    [companyId, entity],
  );
  const [hiddenBuiltins, setHidden] = useState<string[]>([]);
  const prefKey = `columns:${entity}`;

  useEffect(() => {
    if (!companyId) return;
    preferencesApi
      .get<{ hidden?: string[] }>(companyId, prefKey)
      .then((res) => setHidden(res.value?.hidden ?? []))
      .catch(() => {});
  }, [companyId, prefKey]);

  const setHiddenBuiltins = useCallback(
    (next: string[]) => {
      setHidden(next);
      if (companyId) preferencesApi.put(companyId, prefKey, { hidden: next }).catch(() => {});
    },
    [companyId, prefKey],
  );

  const all = fields.data ?? [];
  return {
    fields: all,
    visibleFields: all.filter((f) => f.is_visible),
    reloadFields: fields.reload,
    hiddenBuiltins,
    setHiddenBuiltins,
    isBuiltinVisible: (key: string) => !hiddenBuiltins.includes(key),
  };
}
