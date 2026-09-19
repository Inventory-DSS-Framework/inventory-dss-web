/** Company users: sellers (username login) and admins. */
import { apiClient } from "@/lib/api-client";
import type { UserDTO } from "@/types/api";

const base = (companyId: string) => `/companies/${companyId}`;

export const usersApi = {
  list: (companyId: string) => apiClient.get<UserDTO[]>(`${base(companyId)}/users?size=100`),
  create: (
    companyId: string,
    body: { full_name: string; username: string; password: string; role: "seller" | "admin" },
  ) => apiClient.post<UserDTO>(`${base(companyId)}/users`, body),
  update: (
    companyId: string,
    userId: string,
    body: { full_name?: string; password?: string; status?: "active" | "disabled" },
  ) => apiClient.patch<UserDTO>(`${base(companyId)}/users/${userId}`, body),
};

/** "María José Pérez Soto" -> "mperez" (lowercase, no accents, [a-z0-9._-]). */
export function suggestUsername(fullName: string): string {
  const parts = fullName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0].slice(0, 60);
  // first initial + first surname (2nd word when 2-3 words, 3rd when 4+ words: "maria jose perez soto")
  const surname = parts.length >= 4 ? parts[2] : parts[1];
  return `${parts[0][0]}${surname}`.slice(0, 60);
}

/** Readable random password without ambiguous characters (e.g. "Kp7-mq4x-Rt2"). */
export function generatePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const pick = () => {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return chars[arr[0] % chars.length];
  };
  return Array.from({ length: 3 }, () => Array.from({ length: 3 }, pick).join("")).join("-");
}
