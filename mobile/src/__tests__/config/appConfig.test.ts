import appJson from '../../../app.json';
import easJson from '../../../eas.json';

describe('app.json configuration', () => {
  const expo = appJson.expo;

  it('has correct app name', () => {
    expect(expo.name).toBe('SetCrate');
  });

  it('has correct slug', () => {
    expect(expo.slug).toBe('setcrate');
  });

  it('uses dark user interface style', () => {
    expect(expo.userInterfaceStyle).toBe('dark');
  });

  describe('iOS config', () => {
    it('has bundle identifier', () => {
      expect(expo.ios.bundleIdentifier).toBe('com.setcrate.mobile');
    });

    it('has buildNumber set', () => {
      expect(expo.ios.buildNumber).toBe('1');
    });

    it('supports tablet', () => {
      expect(expo.ios.supportsTablet).toBe(true);
    });

    it('has UIBackgroundModes with audio', () => {
      expect(expo.ios.infoPlist).toBeDefined();
      expect(expo.ios.infoPlist.UIBackgroundModes).toContain('audio');
    });
  });

  describe('Android config', () => {
    it('has package name', () => {
      expect(expo.android.package).toBe('com.setcrate.mobile');
    });

    it('has edgeToEdgeEnabled disabled (for Expo Go compat)', () => {
      expect(expo.android.edgeToEdgeEnabled).toBe(false);
    });
  });

  it('has newArchEnabled disabled (for Expo Go compat)', () => {
    expect(expo.newArchEnabled).toBe(false);
  });

  it('has EAS project ID', () => {
    expect(expo.extra.eas.projectId).toBeTruthy();
  });

  it('has expo-secure-store plugin', () => {
    expect(expo.plugins).toContain('expo-secure-store');
  });
});

describe('eas.json configuration', () => {
  it('has development, preview, and production build profiles', () => {
    expect(easJson.build.development).toBeDefined();
    expect(easJson.build.preview).toBeDefined();
    expect(easJson.build.production).toBeDefined();
  });

  describe('production build', () => {
    it('iOS distribution is store', () => {
      expect(easJson.build.production.ios.distribution).toBe('store');
    });

    it('iOS auto-increments buildNumber', () => {
      expect(easJson.build.production.ios.autoIncrement).toBe('buildNumber');
    });

    it('Android builds APK', () => {
      expect(easJson.build.production.android.buildType).toBe('apk');
    });
  });

  describe('preview build', () => {
    it('iOS distribution is internal', () => {
      expect(easJson.build.preview.ios.distribution).toBe('internal');
    });

    it('Android builds APK', () => {
      expect(easJson.build.preview.android.buildType).toBe('apk');
    });
  });

  describe('submit config', () => {
    it('has iOS submit placeholder', () => {
      expect(easJson.submit.production.ios).toBeDefined();
    });
  });
});
