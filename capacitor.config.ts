import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rescue.app',
  appName: 'resq-nepal',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
};

export default config;
