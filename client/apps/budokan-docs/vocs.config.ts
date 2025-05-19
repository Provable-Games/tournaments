import path from "path";
import { defineConfig } from "vocs";
import llmTxtPlugin from "./vite-plugin-llm-txt.mjs";

export default defineConfig({
  vite: {
    publicDir: path.resolve(__dirname, "../../public"),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./docs"),
        "@contracts": path.resolve(__dirname, "../../../contracts/utils"),
      },
    },
    plugins: [llmTxtPlugin()],
  },
  title: "Budokan",
  description: "A Dojo-powered tournament platform",
  iconUrl: "/favicon.svg",
  logoUrl: "/logo.svg",
  ogImageUrl: "/logo.svg",
  socials: [
    {
      icon: "github",
      link: "https://github.com/Provable-Games/tournaments",
    },
    {
      icon: "discord",
      link: "https://discord.com/channels/884211910222970891/1354444557449822308",
    },
    {
      icon: "x",
      link: "https://x.com/budokan_gg",
    },
  ],
  theme: {
    colorScheme: "dark",
    variables: {
      color: {
        textAccent: "#f6c297",
        background: "#14100d",
        backgroundDark: "#14100d",
        noteBackground: "#14100d",
      },
    },
  },
  sidebar: [
    {
      text: "Budokan",
      link: "/budokan",
      items: [
        { text: "Overview", link: "/budokan/overview" },
        { text: "Key Functions", link: "/budokan/key-functions" },
        {
          text: "Guide",
          link: "/budokan/guide/guide",
          collapsed: true,
          items: [
            { text: "Onboarding", link: "/budokan/guide/onboarding" },
            { text: "Enter", link: "/budokan/guide/enter" },
            {
              text: "Create",
              link: "/budokan/guide/create",
              collapsed: true,
              items: [
                {
                  text: "Entry Fees",
                  link: "/budokan/guide/create/entry-fees",
                },
                {
                  text: "Entry Requirements",
                  link: "/budokan/guide/create/entry-requirements",
                },
              ],
            },
            {
              text: "Prizes",
              link: "/budokan/guide/prizes",
            },
          ],
        },
      ],
    },
    {
      text: "Embeddable Game Standard",
      link: "/embeddable-game-standard",
      items: [
        { text: "Overview", link: "/embeddable-game-standard" },
        {
          text: "Key Functions",
          link: "/embeddable-game-standard/key-functions",
        },
        {
          text: "Implementation Guide",
          link: "/embeddable-game-standard/implementation",
        },
        {
          text: "Games",
          link: "/embeddable-game-standard/games",
        },
      ],
    },
  ],
});
