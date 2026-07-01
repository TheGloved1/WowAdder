export { cf };
import * as cf from 'curseforge-v2';

const apiKey = import.meta.env.VITE_CURSEFORGE_API_KEY;
const BASE_URL = 'https://api.curseforge.com';

let client: cf.CFV2Client | null = null;

function getClient(): cf.CFV2Client {
  if (!client) {
    if (!apiKey || apiKey === 'your_curseforge_api_key_here') {
      throw new Error('CurseForge API key not configured. Set VITE_CURSEFORGE_API_KEY in your .env file.');
    }
    client = new cf.CFV2Client({ apiKey });
  }
  return client;
}

export function getClientStatus(): { configured: boolean; keyPreview: string } {
  const configured = !!apiKey && apiKey !== 'your_curseforge_api_key_here';
  return {
    configured,
    keyPreview: configured ? `${apiKey.slice(0, 8)}...` : '',
  };
}

export async function getGameVersions(gameId: number = 1) {
  const c = getClient();
  const result = await c.getGameVersions(gameId);
  return result.data?.data ?? [];
}

export async function searchMods(params: {
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
  const c = getClient();

  const versions = params.gameVersion?.split(',').filter(Boolean) ?? [];

  if (versions.length > 1) {
    const url = new URL(`${BASE_URL}/v1/mods/search`);
    url.searchParams.set('gameId', String(params.gameId ?? 1));
    url.searchParams.set('gameVersions', versions.join(','));
    if (params.searchFilter) url.searchParams.set('searchFilter', params.searchFilter);
    if (params.gameVersionTypeId) url.searchParams.set('gameVersionTypeId', String(params.gameVersionTypeId));
    if (params.categoryId) url.searchParams.set('categoryId', String(params.categoryId));
    if (params.sortField) url.searchParams.set('sortField', params.sortField);
    if (params.sortOrder) url.searchParams.set('sortOrder', params.sortOrder);
    if (params.index !== undefined) url.searchParams.set('index', String(params.index));
    if (params.pageSize !== undefined) url.searchParams.set('pageSize', String(params.pageSize));

    const response = await fetch(url.toString(), { headers: { 'x-api-key': apiKey! } });
    if (!response.ok) throw new Error(`CurseForge API returned ${response.status}`);
    const json = await response.json();
    return {
      addons: (json.data ?? []) as cf.CF2Addon[],
      pagination: json.pagination as cf.CF2Pagination | undefined,
    };
  }

  const result = await c.searchMods({
    gameId: params.gameId ?? 1,
    searchFilter: params.searchFilter,
    gameVersion: params.gameVersion,
    gameVersionTypeId: params.gameVersionTypeId,
    categoryId: params.categoryId,
    sortField: params.sortField,
    sortOrder: params.sortOrder,
    index: params.index ?? 0,
    pageSize: params.pageSize ?? 20,
  });
  return {
    addons: result.data?.data ?? [],
    pagination: result.data?.pagination,
  };
}

export async function getFeaturedMods(gameVersionTypeId?: number, excludedModIds: number[] = []) {
  const c = getClient();
  const result = await c.getFeaturedMods({
    gameId: 1,
    gameVersionTypeId,
    excludedModIds,
  });
  return result.data?.data ?? { featured: [], popular: [], recentlyUpdated: [] };
}

export async function getMod(modId: number) {
  const c = getClient();
  const result = await c.getMod(modId);
  return result.data?.data;
}

export async function getModFiles(
  modId: number,
  params?: {
    gameVersion?: string;
    gameVersionTypeId?: number;
    index?: number;
    pageSize?: number;
  },
) {
  const url = new URL(`${BASE_URL}/v1/mods/${modId}/files`);
  if (params?.gameVersion) url.searchParams.set('gameVersion', params.gameVersion);
  if (params?.gameVersionTypeId) url.searchParams.set('gameVersionTypeId', String(params.gameVersionTypeId));
  if (params?.index !== undefined) url.searchParams.set('index', String(params.index));
  if (params?.pageSize !== undefined) url.searchParams.set('pageSize', String(params.pageSize));

  const response = await fetch(url.toString(), { headers: { 'x-api-key': apiKey! } });
  if (!response.ok) throw new Error(`CurseForge API returned ${response.status}`);
  const json = await response.json();
  return {
    files: (json.data ?? []) as cf.CF2File[],
    pagination: json.pagination as cf.CF2Pagination | undefined,
  };
}

export async function getModFileDownloadUrl(modId: number, fileId: number) {
  console.log('Getting mod file download URL...');
  const c = getClient();
  const result = await c.getModFileDownloadUrl(modId, fileId);
  console.log('[DEBUG getModFileDownloadUrl] full result:', JSON.stringify(result));
  if (result.data) {
    console.log('[DEBUG getModFileDownloadUrl] result.data.data:', result.data.data);
  } else {
    console.log(
      '[DEBUG getModFileDownloadUrl] result.data is undefined/null, statusCode:',
      result.statusCode,
      'message:',
      result.message,
    );
  }
  return result.data?.data ?? null;
}

export function getFileGameVersion(file: {
  gameVersions?: string[];
  sortableGameVersions?: { gameVersion: string; gameVersionTypeId?: number }[];
}): string | null {
  const retail = file.sortableGameVersions?.find((v) => v.gameVersionTypeId === 517);
  if (retail?.gameVersion) return retail.gameVersion;
  const versions = file.gameVersions?.filter((v) => !/^\d+$/.test(v));
  return versions?.[0] ?? null;
}

export async function getModDescription(modId: number) {
  const c = getClient();
  const result = await c.getModDescription(modId);
  return result.data?.data ?? '';
}

const categoryNames: Record<number, string> = {
  1001: 'Chat & Communication',
  1002: 'Auction & Economy',
  1003: 'Audio & Video',
  1004: 'PvP',
  1005: 'Buffs & Debuffs',
  1006: 'Artwork',
  1007: 'Data Export',
  1008: 'Guild',
  1009: 'Bags & Inventory',
  1010: 'Libraries',
  1011: 'Map & Minimap',
  1012: 'Mail',
  1013: 'Quests & Leveling',
  1014: 'Boss Encounters',
  1015: 'Professions',
  1016: 'Unit Frames',
  1017: 'Miscellaneous',
  1018: 'Action Bars',
  1019: 'Combat',
  1020: 'Class',
  1021: 'Mage',
  1022: 'Paladin',
  1023: 'Druid',
  1024: 'Hunter',
  1025: 'Shaman',
  1026: 'Priest',
  1027: 'Rogue',
  1028: 'Warrior',
  1029: 'Warlock',
  1031: 'Development Tools',
  1032: 'Healer',
  1033: 'Tank',
  1034: 'Caster',
  1035: 'Damage Dealer',
  1036: 'Death Knight',
  1037: 'Raid Frames',
  1038: 'Minigames',
  1039: 'HUDs',
  1040: 'Arena',
  1041: 'Battleground',
  1042: 'Alchemy',
  1043: 'Blacksmithing',
  1044: 'Cooking',
  1045: 'Enchanting',
  1046: 'Engineering',
  1047: 'First Aid',
  1048: 'Fishing',
  1049: 'Herbalism',
  1050: 'Jewelcrafting',
  1051: 'Leatherworking',
  1052: 'Mining',
  1053: 'Skinning',
  1054: 'Tailoring',
  1055: 'Tooltip',
  1059: 'Inscription',
  1060: 'Roleplay',
  1063: 'Plugins',
  1064: 'FuBar',
  1065: 'Titan Panel',
  1066: 'Data Broker',
  1067: 'Achievements',
  1085: 'Companions',
  1103: 'Archaeology',
  1171: 'Transmogrification',
  1242: 'Monk',
  1243: 'Battle Pets',
  1469: 'Garrison',
  1502: 'Demon Hunters',
  4675: 'Twitch Integration',
  0: 'All Addons',
};

export interface CategoryOption {
  id: number;
  name: string;
}

export function getCategories(): CategoryOption[] {
  const ALL_CATEGORY = { id: 0, name: 'All Addons' };
  return [
    ALL_CATEGORY,
    ...Object.entries(categoryNames)
      .filter(([id]) => id !== '0')
      .map(([id, name]) => ({
        id: Number(id),
        name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  ];
}

const parentCategoryIds = [1020, 1019, 1085, 1063, 1015, 1004, 1060, 1016] as const;

export const categoryChildren: Record<number, number[]> = {
  1020: [1036, 1502, 1023, 1024, 1021, 1242, 1022, 1026, 1027, 1025, 1029, 1028],
  1019: [1034, 1035, 1032, 1033],
  1085: [1243],
  1063: [1066, 1064, 1065],
  1015: [1042, 1103, 1043, 1044, 1045, 1046, 1047, 1048, 1049, 1059, 1050, 1051, 1052, 1053, 1054],
  1004: [1040, 1041],
  1060: [1171],
  1016: [1039, 1037],
};

const childToParent = new Map<number, number>();
for (const [parentId, children] of Object.entries(categoryChildren)) {
  for (const childId of children) {
    childToParent.set(childId, Number(parentId));
  }
}

export interface CategoryTreeNode {
  id: number;
  name: string;
  parentId: number | null;
}

export function getCategoryTree(): CategoryTreeNode[] {
  const result: CategoryTreeNode[] = [];
  const added = new Set<number>();

  for (const parentId of parentCategoryIds) {
    const name = categoryNames[parentId];
    if (name) {
      result.push({ id: parentId, name, parentId: null });
      added.add(parentId);
      for (const childId of categoryChildren[parentId]) {
        const childName = categoryNames[childId];
        if (childName) {
          result.push({ id: childId, name: childName, parentId });
          added.add(childId);
        }
      }
    }
  }

  for (const [idStr, name] of Object.entries(categoryNames)) {
    const id = Number(idStr);
    if (id !== 0 && !added.has(id)) {
      result.push({ id, name, parentId: null });
    }
  }

  return result;
}

export function getParentCategoryIds(): Set<number> {
  return new Set(parentCategoryIds);
}

export function getCategoryParent(childId: number): number | null {
  return childToParent.get(childId) ?? null;
}
