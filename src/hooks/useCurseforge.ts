import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { InstalledAddon } from '../services/addonManager';
import {
  getClientStatus,
  getGameVersions,
  getMod,
  getModDescription,
  getModFiles,
  searchMods,
} from '../services/curseforge';
import type { UpdateInfo } from '../types/curseforge';

function useClientEnabled() {
  const { configured } = getClientStatus();
  return configured;
}

export function useGameVersions(gameId: number = 1) {
  const enabled = useClientEnabled();
  return useQuery({
    queryKey: ['gameVersions', gameId],
    queryFn: () => getGameVersions(gameId),
    staleTime: Infinity,
    enabled,
  });
}

export function useSearchMods(params: {
  gameId?: number;
  searchFilter?: string;
  gameVersion?: string;
  gameVersionTypeId?: number;
  categoryId?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  index?: number;
  pageSize?: number;
}) {
  const enabled = useClientEnabled();
  return useQuery({
    queryKey: ['searchMods', params],
    queryFn: () => searchMods(params),
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useMod(modId: number | undefined) {
  const enabled = useClientEnabled();
  return useQuery({
    queryKey: ['mod', modId],
    queryFn: () => getMod(modId!),
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
    enabled: enabled && modId != null && !isNaN(modId),
  });
}

export function useModFiles(
  modId: number | undefined,
  params?: {
    gameVersion?: string;
    gameVersionTypeId?: number;
    index?: number;
    pageSize?: number;
  },
) {
  const enabled = useClientEnabled();
  return useQuery({
    queryKey: ['modFiles', modId, params],
    queryFn: () => getModFiles(modId!, params),
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
    enabled: enabled && modId != null && !isNaN(modId),
  });
}

export function useModDescription(modId: number | undefined) {
  const enabled = useClientEnabled();
  return useQuery({
    queryKey: ['modDescription', modId],
    queryFn: () => getModDescription(modId!),
    staleTime: Infinity,
    enabled: enabled && modId != null && !isNaN(modId),
  });
}

export function useAddonUpdateChecker() {
  const queryClient = useQueryClient();

  const checkAddon = useCallback(
    async (addon: InstalledAddon, gameVersion?: string): Promise<UpdateInfo> => {
      try {
        const result = await queryClient.fetchQuery({
          queryKey: ['modFiles', addon.modId, { gameVersionTypeId: 517, gameVersion, pageSize: 10 }],
          queryFn: () => getModFiles(addon.modId, { gameVersionTypeId: 517, gameVersion, pageSize: 10 }),
          staleTime: 5 * 60_000,
        });

        const releaseFile = result.files.find((f) => f.releaseType === 1) ?? null;

        if (!releaseFile) {
          return { modId: addon.modId, status: 'no-compatible-version', latestFile: null };
        }

        if (releaseFile.id === addon.installedFileId) {
          return { modId: addon.modId, status: 'up-to-date', latestFile: releaseFile };
        }

        return {
          modId: addon.modId,
          status: releaseFile.id > addon.installedFileId ? 'update-available' : 'downgrade-available',
          latestFile: releaseFile,
        };
      } catch (e) {
        return { modId: addon.modId, status: 'error', latestFile: null, error: String(e) };
      }
    },
    [queryClient],
  );

  const checkAll = useCallback(
    async (
      addons: InstalledAddon[],
      gameVersion?: string,
      onProgress?: (done: number, total: number) => void,
    ): Promise<Record<number, UpdateInfo>> => {
      const results: Record<number, UpdateInfo> = {};
      for (let i = 0; i < addons.length; i++) {
        results[addons[i].modId] = await checkAddon(addons[i], gameVersion);
        onProgress?.(i + 1, addons.length);
      }
      return results;
    },
    [checkAddon],
  );

  return { checkAddon, checkAll };
}
