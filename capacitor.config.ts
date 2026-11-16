import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kriakarya.barbersuite',
  appName: 'Barber Suite',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      androidIsEncryption: false,
    },
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#0D0D0D',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#C67D3B',
    },
  },
};

export default config;
