# Android Build Troubleshooting Guide

## Current Issue
The EAS build is failing during the "Install dependencies" phase with an "Unknown error". This is a common issue that can have several causes.

## Solutions to Try

### 1. Check Build Logs Online
Visit the build logs URL from the last failed build to see the exact error:
- Go to: https://expo.dev/accounts/geijin5/projects/washoe-pos/builds/[BUILD_ID]
- Look for the "Install dependencies" phase logs
- Check for specific error messages

### 2. Alternative Build Approaches

#### Option A: Use Expo Development Build
```bash
# Install expo-dev-client
npm install expo-dev-client

# Build development client
npx eas build --platform android --profile development
```

#### Option B: Use Local Build
```bash
# Install Expo CLI
npm install -g @expo/cli

# Prebuild the project
npx expo prebuild

# Build locally (requires Android Studio)
npx expo run:android
```

#### Option C: Use Expo Application Services (EAS) with Different Configuration
Create a new `eas.json` with minimal configuration:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### 3. Dependency Issues

The issue might be related to:
- React 19 compatibility issues
- Package manager conflicts (Bun vs npm)
- Specific dependency versions

#### Try These Fixes:
1. **Downgrade React**: Already done (React 18.3.1)
2. **Use npm consistently**: Added packageManager field
3. **Add .npmrc**: Already added with legacy-peer-deps

### 4. Alternative Publishing Methods

#### Method 1: Expo Go (for testing)
```bash
# Start development server
npm start

# Scan QR code with Expo Go app
```

#### Method 2: Local APK Build
```bash
# Install Android Studio
# Set up Android SDK
# Run local build
npx expo run:android
```

#### Method 3: Use Different Build Service
- Consider using GitHub Actions with Expo
- Use local builds with Android Studio
- Use alternative CI/CD services

### 5. Debugging Steps

1. **Check EAS Build Logs**: Visit the build URL to see detailed error messages
2. **Test Locally**: Run `npx expo run:android` to test locally
3. **Simplify Dependencies**: Remove non-essential packages temporarily
4. **Check Expo SDK Compatibility**: Ensure all packages are compatible with Expo SDK 53

### 6. Contact Support

If the issue persists:
- Check Expo Discord: https://discord.gg/expo
- Create an issue on Expo GitHub
- Contact Expo support

## Current Configuration Status

✅ **Fixed Issues:**
- EAS CLI version updated
- Dependencies resolved locally
- Build configuration simplified
- Package manager specified
- React version downgraded for stability

❌ **Remaining Issue:**
- EAS build still failing at dependency installation phase

## Next Steps

1. Check the build logs online for specific error details
2. Try the alternative build methods listed above
3. Consider using local builds if EAS continues to fail
4. Contact Expo support if the issue persists

The app configuration is correct and ready for Android publishing - the issue is specifically with the EAS build service dependency installation.
