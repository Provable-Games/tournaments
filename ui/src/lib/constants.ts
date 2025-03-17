import { ETH, LORDS } from "@/components/Icons";

export const NAMESPACE = "budokan_v_1_0_4";

export const TOURNAMENT_VERSION_KEY: string = "0x302e302e31";

export const SECONDS_IN_DAY = 86400;
export const SECONDS_IN_HOUR = 3600;

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

export const tournaments = [
  {
    id: "1",
    fee: 5,
    pot: 100,
    players: 5,
    startsIn: 12,
    registration: "Open",
    games: ["lootSurvivor"],
    name: "FOCGing Around",
    description:
      "asudbfabsdkfbakusdbfbaskyudfbukyasbduyfbuyasbdfuba asdkufbkasdf akusydbf auksdb fagsd ausdyhbf asudkyafb asidufb asdkufhbasd aksdbfasdfausd  asdlfbasdb asdkfbas bhdbf asjdf asdjhfb asdbf ahjsdf sdjhfb ajhsd f ajhbdf asdfbas aisdbf asaisbd aisdbf aujd faisudf ausd fasdfiasd aisd fasdib asidf asdf iasd fujb sdf",
    type: "Tournament",
    starts: 1738750674,
    submissionPeriod: 3600,
  },
  {
    id: "2",
    fee: 5,
    pot: 100,
    players: 5,
    startsIn: 12,
    registration: "Open",
    games: ["lootSurvivor", "zkube"],
    name: "FOCGing Around",
    description: "Lorem ipsum dolar sit amet",
    type: "Season",
  },
  {
    id: "3",
    fee: 5,
    pot: 100,
    players: 5,
    startsIn: 12,
    registration: "Open",
    games: ["lootSurvivor", "zkube", "darkShuffle"],
    name: "FOCGing Around",
    description: "Lorem ipsum dolar sit amet",
    type: "Season",
  },
  {
    id: "4",
    fee: 5,
    pot: 100,
    players: 5,
    startsIn: 12,
    registration: "Open",
    games: ["lootSurvivor", "zkube", "darkShuffle"],
    name: "FOCGing Around",
    description: "Lorem ipsum dolar sit amet",
    type: "Season",
  },
  {
    id: "5",
    fee: 5,
    pot: 100,
    players: 5,
    startsIn: 12,
    registration: "Open",
    games: ["lootSurvivor", "zkube", "darkShuffle", "dopeWars"],
    name: "FOCGing Around",
    description: "Lorem ipsum dolar sit amet",
    type: "Season",
  },
  {
    id: "6",
    fee: 5,
    pot: 100,
    players: 5,
    startsIn: 12,
    registration: "Open",
    games: ["lootSurvivor"],
    name: "FOCGing Around",
    description: "Lorem ipsum dolar sit amet",
    type: "Season",
  },
  {
    id: "7",
    fee: 5,
    pot: 100,
    players: 5,
    startsIn: 12,
    registration: "Open",
    games: ["lootSurvivor", "zkube"],
    name: "FOCGing Around",
    description: "Lorem ipsum dolar sit amet",
    type: "Season",
  },
  {
    id: "8",
    fee: 5,
    pot: 100,
    players: 5,
    startsIn: 12,
    registration: "Open",
    games: ["lootSurvivor", "zkube", "darkShuffle"],
    name: "FOCGing Around",
    description: "Lorem ipsum dolar sit amet",
    type: "Season",
  },
  {
    id: "9",
    fee: 5,
    pot: 100,
    players: 5,
    startsIn: 12,
    registration: "Open",
    games: ["lootSurvivor", "zkube", "darkShuffle"],
    name: "FOCGing Around",
    description: "Lorem ipsum dolar sit amet",
    type: "Season",
  },
  {
    id: "10",
    fee: 5,
    pot: 100,
    players: 5,
    startsIn: 12,
    registration: "Open",
    games: ["lootSurvivor", "zkube", "darkShuffle", "dopeWars"],
    name: "FOCGing Around",
    description: "Lorem ipsum dolar sit amet",
    type: "Season",
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

export const testTokenUri = {
  attributes: [
    { trait: "Name", value: "Creator" },
    { trait: "XP", value: "0" },
    { trait: "Health", value: "0" },
  ],
  description: "An NFT representing ownership of a game of Dark Shuffle.",
  image:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc0NzAnIGhlaWdodD0nNjAwJz48c3R5bGU+dGV4dHt0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO2ZvbnQtZmFtaWx5OiBDb3VyaWVyLCBtb25vc3BhY2U7ZmlsbDogI2ZmZTk3Zjt9Z3tmaWxsOiAjZmZlOTdmO308L3N0eWxlPjxyZWN0IHg9JzAuNScgeT0nMC41JyB3aWR0aD0nNDY5JyBoZWlnaHQ9JzU5OScgcng9JzI3LjUnIGZpbGw9J2JsYWNrJyBzdHJva2U9JyNmZmU5N2YnLz48ZyB0cmFuc2Zvcm09J3RyYW5zbGF0ZSgyMCwyNSkgc2NhbGUoMC41KSc+PHBhdGggZD0iTTMyLjkxNCAzMS4xMzNhMTM1IDEzNSAwIDAgMC03LjMxMi0xMS41NzVsMS45NzQtMS4yMTUgMi4wODIgMi44NTRhMTAzIDEwMyAwIDAgMCA0LjgwMy0yLjA2MXEyLjQwMy0xLjExIDUuMjMtMS4yMTYgNi40Ni4xMDUgOS44NzUgNC44NjJhMzAuNyAzMC43IDAgMCAxIDIuODI5IDQuOTY4IDEzNCAxMzQgMCAwIDEgMS45NzQgNS42NTZxLjQyNyAyLjI3MiAxLjA2OCA0LjY1YTI2LjYgMjYuNiAwIDAgMCAxLjY1NCA0LjY1MiAxMC43IDEwLjcgMCAwIDAgMi43MjIgMy41OTRjMi4zMTcgMi4wODUgNi4wNiAyLjA4NSA4LjM3NyAwYTEwLjcgMTAuNyAwIDAgMCAyLjcyMi0zLjU5NCAyNi42IDI2LjYgMCAwIDAgMS42NTQtNC42NTEgNjIgNjIgMCAwIDAgMS4wNjgtNC42NTEgMTM0IDEzNCAwIDAgMSAxLjk3NS01LjY1NSAzMC43IDMwLjcgMCAwIDEgMi44MjgtNC45NjlxMy40MTctNC43NTYgOS44NzQtNC44NjIgMi44My4xMDYgNS4yMyAxLjIxNWExMDMgMTAzIDAgMCAwIDQuODA0IDIuMDYybDIuMDgyLTIuODU0IDEuOTc1IDEuMjE1YTEzNSAxMzUgMCAwIDAtNy4zMTIgMTEuNTc1IDEwIDEwIDAgMCAxLTIuNjE2LS45NTEgMjMgMjMgMCAwIDAtMi41NjItMS40MjdxLTEuMTczLS42MzQtMi44MjgtMS4yMTYtMS42MDItLjUyOC0zLjY4My0uNTI4LTIuODgyIDAtNC45NjQgMS41MzItMi4yOTUgMS42NC0yLjI5NSA0LjY1MSAwIDIuNjk2IDEuNzYxIDUuMjg2IDEuNjU1IDIuNjk1IDQuMTY0IDMuOTFhMjIuMSAyMi4xIDAgMCAwIDcuNDE4IDEuMDU4cTIuMDgyIDAgNC4xNjMtLjIxMnY3LjUwNWgtOS43MTNMNjcuMTgyIDExNS4ybDMuMTU1LTU3LjgzN2MuMTk2LTMuNTk4LTIuNjk3LTYuNjIyLTYuMzM1LTYuNjIycy02LjUzMiAzLjAyNC02LjMzNiA2LjYyMmwzLjE1NSA1Ny44MzdMNDQuMDcgNTAuNzQxaC05LjcxNHYtNy41MDVxMi4wOC4yMTIgNC4xNjMuMjEyIDMuNzg5LjEwNSA3LjQxOS0xLjA1NyAyLjUwOC0xLjIxNSA0LjE2My0zLjkxMSAxLjc2LTIuNTkgMS43Ni01LjI4NiAwLTMuMDEyLTIuMjk0LTQuNjUtMi4wODEtMS41MzQtNC45NjQtMS41MzMtMi4wODEgMC0zLjY4Mi41MjgtMS42NTYuNTgyLTIuODMgMS4yMTYtMS4zMzQuNjMzLTIuNTYxIDEuNDI3YTEwIDEwIDAgMCAxLTIuNjE1Ljk1MSIvPjwvZz48dGV4dCB4PScxMDAnIHk9JzUwJyBmb250LXNpemU9JzI0JyB0ZXh0LWFuY2hvcj0nbGVmdCcgZG9taW5hbnQtYmFzZWxpbmU9J21pZGRsZSc+IzA8L3RleHQ+PHRleHQgeD0nMTAwJyB5PSc3MicgZm9udC1zaXplPScxNicgdGV4dC1hbmNob3I9J2xlZnQnIGRvbWluYW50LWJhc2VsaW5lPSdtaWRkbGUnPkdhbWUgbm90IHN0YXJ0ZWQ8L3RleHQ+PC9zdmc+",
  name: "Game #0",
};

export const ADMIN_ADDRESS =
  "0x077b8ed8356a7c1f0903fc4ba6e15f9b09cf437ce04f21b2cbf32dc2790183d0";
