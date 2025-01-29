import { ETH, LORDS } from "@/components/Icons";

export const TOKEN_ICONS: Record<string, React.ComponentType> = {
  ETH: ETH,
  USDC: ETH,
  LORDS: LORDS,
  STRK: ETH,
};

// Optional: Add token addresses if needed
export const TOKEN_ADDRESSES: Record<string, string> = {
  ETH: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
  USDC: "0x53c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
  LORDS: "0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49",
  STRK: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
};

export const ITEMS: { [key: number]: string } = {
  1: "Pendant",
  2: "Necklace",
  3: "Amulet",
  4: "Silver Ring",
  5: "Bronze Ring",
  6: "Platinum Ring",
  7: "Titanium Ring",
  8: "Gold Ring",
  9: "Ghost Wand",
  10: "Grave Wand",
  11: "Bone Wand",
  12: "Wand",
  13: "Grimoire",
  14: "Chronicle",
  15: "Tome",
  16: "Book",
  17: "Divine Robe",
  18: "Silk Robe",
  19: "Linen Robe",
  20: "Robe",
  21: "Shirt",
  22: "Crown",
  23: "Divine Hood",
  24: "Silk Hood",
  25: "Linen Hood",
  26: "Hood",
  27: "Brightsilk Sash",
  28: "Silk Sash",
  29: "Wool Sash",
  30: "Linen Sash",
  31: "Sash",
  32: "Divine Slippers",
  33: "Silk Slippers",
  34: "Wool Shoes",
  35: "Linen Shoes",
  36: "Shoes",
  37: "Divine Gloves",
  38: "Silk Gloves",
  39: "Wool Gloves",
  40: "Linen Gloves",
  41: "Gloves",
  42: "Katana",
  43: "Falchion",
  44: "Scimitar",
  45: "Long Sword",
  46: "Short Sword",
  47: "Demon Husk",
  48: "Dragonskin Armor",
  49: "Studded Leather Armor",
  50: "Hard Leather Armor",
  51: "Leather Armor",
  52: "Demon Crown",
  53: "Dragons Crown",
  54: "War Cap",
  55: "Leather Cap",
  56: "Cap",
  57: "Demonhide Belt",
  58: "Dragonskin Belt",
  59: "Studded Leather Belt",
  60: "Hard Leather Belt",
  61: "Leather Belt",
  62: "Demonhide Boots",
  63: "Dragonskin Boots",
  64: "Studded Leather Boots",
  65: "Hard Leather Boots",
  66: "Leather Boots",
  67: "Demons Hands",
  68: "Dragonskin Gloves",
  69: "Studded Leather Gloves",
  70: "Hard Leather Gloves",
  71: "Leather Gloves",
  72: "Warhammer",
  73: "Quarterstaff",
  74: "Maul",
  75: "Mace",
  76: "Club",
  77: "Holy Chestplate",
  78: "Ornate Chestplate",
  79: "Plate Mail",
  80: "Chain Mail",
  81: "Ring Mail",
  82: "Ancient Helm",
  83: "Ornate Helm",
  84: "Great Helm",
  85: "Full Helm",
  86: "Helm",
  87: "Ornate Belt",
  88: "War Belt",
  89: "Plated Belt",
  90: "Mesh Belt",
  91: "Heavy Belt",
  92: "Holy Greaves",
  93: "Ornate Greaves",
  94: "Greaves",
  95: "Chain Boots",
  96: "Heavy Boots",
  97: "Holy Gauntlets",
  98: "Ornate Gauntlets",
  99: "Gauntlets",
  100: "Chain Gloves",
  101: "Heavy Gloves",
};

export const tournaments = [
  {
    fee: 5,
    pot: 100,
    players: 5,
    startsIn: 12,
    registration: "Open",
    games: ["lootSurvivor"],
    name: "FOCGing Around",
    description: "Lorem ipsum dolar sit amet",
  },
  {
    fee: 5,
    pot: 100,
    players: 5,
    startsIn: 12,
    registration: "Open",
    games: ["lootSurvivor", "zkube"],
    name: "FOCGing Around",
    description: "Lorem ipsum dolar sit amet",
  },
  {
    fee: 5,
    pot: 100,
    players: 5,
    startsIn: 12,
    registration: "Open",
    games: ["lootSurvivor", "zkube", "darkShuffle"],
    name: "FOCGing Around",
    description: "Lorem ipsum dolar sit amet",
  },
  {
    fee: 5,
    pot: 100,
    players: 5,
    startsIn: 12,
    registration: "Open",
    games: ["lootSurvivor", "zkube", "darkShuffle"],
    name: "FOCGing Around",
    description: "Lorem ipsum dolar sit amet",
  },
  {
    fee: 5,
    pot: 100,
    players: 5,
    startsIn: 12,
    registration: "Open",
    games: ["lootSurvivor", "zkube", "darkShuffle", "dopeWars"],
    name: "FOCGing Around",
    description: "Lorem ipsum dolar sit amet",
  },
  {
    fee: 5,
    pot: 100,
    players: 5,
    startsIn: 12,
    registration: "Open",
    games: ["lootSurvivor"],
    name: "FOCGing Around",
    description: "Lorem ipsum dolar sit amet",
  },
  {
    fee: 5,
    pot: 100,
    players: 5,
    startsIn: 12,
    registration: "Open",
    games: ["lootSurvivor", "zkube"],
    name: "FOCGing Around",
    description: "Lorem ipsum dolar sit amet",
  },
  {
    fee: 5,
    pot: 100,
    players: 5,
    startsIn: 12,
    registration: "Open",
    games: ["lootSurvivor", "zkube", "darkShuffle"],
    name: "FOCGing Around",
    description: "Lorem ipsum dolar sit amet",
  },
  {
    fee: 5,
    pot: 100,
    players: 5,
    startsIn: 12,
    registration: "Open",
    games: ["lootSurvivor", "zkube", "darkShuffle"],
    name: "FOCGing Around",
    description: "Lorem ipsum dolar sit amet",
  },
  {
    fee: 5,
    pot: 100,
    players: 5,
    startsIn: 12,
    registration: "Open",
    games: ["lootSurvivor", "zkube", "darkShuffle", "dopeWars"],
    name: "FOCGing Around",
    description: "Lorem ipsum dolar sit amet",
  },
];

export const participants = [
  {
    name: "Clicksave",
    score: 1000,
  },
  {
    name: "Clicksave",
    score: 1000,
  },
  {
    name: "Clicksave",
    score: 1000,
  },
  {
    name: "Clicksave",
    score: 1000,
  },
  {
    name: "Clicksave",
    score: 1000,
  },
];
