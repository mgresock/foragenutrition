import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.forage.app",
  appName: "Forage",
  webDir: "out",
  server: {
    // During development: point native app at your local Next.js dev server
    // Comment this out for production builds
    url: "http://192.168.1.100:3000",
    cleartext: true,
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#0c0e09",
  },
  android: {
    backgroundColor: "#0c0e09",
  },
};

export default config;
