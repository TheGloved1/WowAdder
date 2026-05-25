import { useQuery } from '@tanstack/react-query';
import {
  getClientStatus,
  getGameVersions,
  getMod,
  getModDescription,
  getModFiles,
  searchMods,
} from '../services/curseforge';

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
    enabled,
  });
}

export function useMod(modId: number | undefined) {
  const enabled = useClientEnabled();
  return useQuery({
    queryKey: ['mod', modId],
    queryFn: () => getMod(modId!),
    staleTime: 5 * 60_000,
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
