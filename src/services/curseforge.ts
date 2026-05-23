import { CFV2Client } from "curseforge-v2";

const apiKey = import.meta.env.VITE_CURSEFORGE_API_KEY;

let client: CFV2Client | null = null;

function getClient(): CFV2Client {
  console.log("Getting CurseForge client...");
  if (!client) {
    if (!apiKey || apiKey === "your_curseforge_api_key_here") {
      throw new Error(
        "CurseForge API key not configured. Set VITE_CURSEFORGE_API_KEY in your .env file.",
      );
    }
    client = new CFV2Client({ apiKey });
  }
  return client;
}

export function getClientStatus(): { configured: boolean; keyPreview: string } {
  const configured = !!apiKey && apiKey !== "your_curseforge_api_key_here";
  return {
    configured,
    keyPreview: configured ? `${apiKey.slice(0, 8)}...` : "",
  };
}

export async function getGameVersions(gameId: number = 1) {
  console.log("Getting game versions...");
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
  sortOrder?: "asc" | "desc";
  index?: number;
  pageSize?: number;
}) {
  console.log("Searching mods...");
  const c = getClient();
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

export async function getFeaturedMods(
  gameVersionTypeId?: number,
  excludedModIds: number[] = [],
) {
  const c = getClient();
  const result = await c.getFeaturedMods({
    gameId: 1,
    gameVersionTypeId,
    excludedModIds,
  });
  return (
    result.data?.data ?? { featured: [], popular: [], recentlyUpdated: [] }
  );
}

export async function getMod(modId: number) {
  console.log("Getting mod...");
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
  console.log("Getting mod files...");
  const c = getClient();
  const result = await c.getModFiles({
    modId,
    gameVersion: params?.gameVersion,
    gameVersionTypeId: params?.gameVersionTypeId,
    index: params?.index ?? 0,
    pageSize: params?.pageSize ?? 20,
  });
  return {
    files: result.data?.data ?? [],
    pagination: result.data?.pagination,
  };
}

export async function getModFileDownloadUrl(modId: number, fileId: number) {
  console.log("Getting mod file download URL...");
  const c = getClient();
  const result = await c.getModFileDownloadUrl(modId, fileId);
  console.log(
    "[DEBUG getModFileDownloadUrl] full result:",
    JSON.stringify(result),
  );
  if (result.data) {
    console.log(
      "[DEBUG getModFileDownloadUrl] result.data.data:",
      result.data.data,
    );
  } else {
    console.log(
      "[DEBUG getModFileDownloadUrl] result.data is undefined/null, statusCode:",
      result.statusCode,
      "message:",
      result.message,
    );
  }
  return result.data?.data ?? null;
}

export async function getModDescription(modId: number) {
  const c = getClient();
  const result = await c.getModDescription(modId);
  return result.data?.data ?? "";
}

const categoryNames: Record<number, string> = {
  1001: "Chat & Communication",
  1002: "Auction & Economy",
  1003: "Audio & Video",
  1004: "PvP",
  1005: "Buffs & Debuffs",
  1006: "Artwork",
  1007: "Data Export",
  1008: "Guild",
  1009: "Bags & Inventory",
  1010: "Libraries",
  1011: "Map & Minimap",
  1012: "Mail",
  1013: "Quests & Leveling",
  1014: "Boss Encounters",
  1015: "Professions",
  1016: "Unit Frames",
  1017: "Miscellaneous",
  1018: "Action Bars",
  1019: "Combat",
  1020: "Class",
  1021: "Mage",
  1022: "Paladin",
  1023: "Druid",
  1024: "Hunter",
  1025: "Shaman",
  1026: "Priest",
  1027: "Rogue",
  1028: "Warrior",
  1029: "Warlock",
  1031: "Development Tools",
  1032: "Healer",
  1033: "Tank",
  1034: "Caster",
  1035: "Damage Dealer",
  1036: "Death Knight",
  1037: "Raid Frames",
  1038: "Minigames",
  1039: "HUDs",
  1040: "Arena",
  1041: "Battleground",
  1042: "Alchemy",
  1043: "Blacksmithing",
  1044: "Cooking",
  1045: "Enchanting",
  1046: "Engineering",
  1047: "First Aid",
  1048: "Fishing",
  1049: "Herbalism",
  1050: "Jewelcrafting",
  1051: "Leatherworking",
  1052: "Mining",
  1053: "Skinning",
  1054: "Tailoring",
  1055: "Tooltip",
  1059: "Inscription",
  1060: "Roleplay",
  1063: "Plugins",
  1064: "FuBar",
  1065: "Titan Panel",
  1066: "Data Broker",
  1067: "Achievements",
  1085: "Companions",
  1103: "Archaeology",
  1171: "Transmogrification",
  1242: "Monk",
  1243: "Battle Pets",
  1469: "Garrison",
  1502: "Demon Hunters",
  4675: "Twitch Integration",
  0: "All Addons",
};

export interface CategoryOption {
  id: number;
  name: string;
}

export function getCategories(): CategoryOption[] {
  const ALL_CATEGORY = { id: 0, name: "All Addons" };
  return [
    ALL_CATEGORY,
    ...Object.entries(categoryNames)
      .filter(([id]) => id !== "0")
      .map(([id, name]) => ({
        id: Number(id),
        name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  ];
}
