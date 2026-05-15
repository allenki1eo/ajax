import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canopy: "#14352c",
        jungle: "#2f7d5c",
        leaf: "#e7f4ec",
        clay: "#b8623b",
        stone: "#5f6f68",
      },
      boxShadow: {
        panel: "0 22px 70px rgba(20, 53, 44, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
