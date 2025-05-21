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
      collapsed: false,
      items: [
        { text: "Key Functions", link: "/budokan/key-functions" },
        {
          text: "Guide",
          link: "/budokan/guide",
          collapsed: true,
          items: [
            { text: "Onboarding", link: "/budokan/guide/onboarding" },
            { text: "Enter Tournaments", link: "/budokan/guide/enter" },
            { text: "Submission", link: "/budokan/guide/submission" },
            {
              text: "Prizes",
              link: "/budokan/guide/prizes",
            },
            {
              text: "Create",
              link: "/budokan/guide/create",
              collapsed: true,
              items: [
                {
                  text: "Game Settings",
                  link: "/budokan/guide/create/game-settings",
                },
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
          ],
        },
        { text: "FAQ", link: "/budokan/faq" },
      ],
    },
    {
      text: "Embeddable Game Standard",
      link: "/embeddable-game-standard",
      collapsed: false,
      items: [
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
    {
      text: "Development",
      link: "/development",
      collapsed: false,
      items: [
        {
          text: "SDK",
          link: "/development/sdk",
        },
      ],
    },
  ],
});
