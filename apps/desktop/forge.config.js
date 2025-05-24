module.exports = {
  packagerConfig: {
    asar: true,
    icon: './assets/icon',
    appBundleId: 'com.closezly.app',
    appCategoryType: 'public.app-category.productivity',
    osxSign: {
      identity: process.env.APPLE_DEVELOPER_IDENTITY,
      hardenedRuntime: true,
      entitlements: 'entitlements.plist',
      'entitlements-inherit': 'entitlements.plist',
      'signature-flags': 'library'
    }
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'Closezly',
        authors: 'Closezly Team',
        description: 'AI-powered sales co-pilot',
        iconUrl: 'https://closezly.com/icon.ico',
        setupIcon: './assets/icon.ico'
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin']
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'Closezly Team',
          homepage: 'https://closezly.com',
          icon: './assets/icon.png'
        }
      }
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          homepage: 'https://closezly.com',
          icon: './assets/icon.png'
        }
      }
    }
  ],
  // Add hooks to ensure TypeScript compilation
  hooks: {
    generateAssets: async () => {
      // This hook runs before the app is packaged
      // We can use it to ensure TypeScript is compiled
      const { execSync } = require('child_process');
      console.log('Compiling TypeScript...');
      execSync('npm run build:electron', { stdio: 'inherit' });
    }
  }
}
