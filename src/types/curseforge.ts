import type { CF2File } from 'curseforge-v2';

export type {
  CF2Addon,
  CF2Category,
  CF2File,
  CF2GameVersionsByType,
  CF2GameVersionType,
  CF2Pagination,
  CF2SearchModsParams,
} from 'curseforge-v2';

export type UpdateStatus = 'up-to-date' | 'update-available' | 'downgrade-available' | 'no-compatible-version' | 'error';

export interface UpdateInfo {
  modId: number;
  status: UpdateStatus;
  latestFile: CF2File | null;
  error?: string;
}
