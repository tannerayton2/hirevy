import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aytoncreations.aytopus',
  appName: 'Aytopus',
  webDir: 'dist',
  // Dark brand color behind the web view so there's no white/gray flash
  // between the splash screen and the first paint.
  backgroundColor: '#0F0F10',
  plugins: {
    SplashScreen: {
      // Keep the octopus splash up briefly while the web app boots, then fade.
      launchShowDuration: 1200,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#0E0C0A',
      showSpinner: false,
    },
  },
};

export default config;
