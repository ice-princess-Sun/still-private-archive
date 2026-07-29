import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "xxmi.still.space",
  appName: "STILL",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
};

export default config;
