# Android Publishing Guide for Washoe POS

This guide will help you publish your Washoe POS app to the Google Play Store.

## Prerequisites

1. **Expo CLI and EAS CLI**: Install the latest versions
   ```bash
   npm install -g @expo/cli eas-cli
   ```

2. **Google Play Console Account**: You need a Google Play Developer account ($25 one-time fee)

3. **App Signing**: You'll need to set up app signing (EAS can handle this automatically)

## Setup Steps

### 1. Login to EAS
```bash
eas login
```

### 2. Configure EAS Project
```bash
eas build:configure
```

### 3. Build for Android

#### Development Build (for testing)
```bash
npm run build:android-dev
```

#### Preview Build (APK for testing)
```bash
npm run build:android-preview
```

#### Production Build (AAB for Play Store)
```bash
npm run build:android-production
```

### 4. Google Play Console Setup

1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app
3. Fill in the required information:
   - App name: "Washoe POS"
   - Default language: English
   - App or game: App
   - Free or paid: Choose based on your business model

### 5. App Store Listing

Prepare the following assets:
- **App icon**: 512x512 PNG (already configured in your app)
- **Feature graphic**: 1024x500 PNG
- **Screenshots**: At least 2 screenshots for phones and tablets
- **App description**: Write a compelling description
- **Privacy policy**: Required for apps that collect user data

### 6. Upload and Submit

1. Download your production AAB file from the EAS build
2. Upload it to Google Play Console
3. Fill in the store listing details
4. Submit for review

### 7. Automated Submission (Optional)

You can also use EAS Submit to automate the upload:
```bash
npm run submit:android
```

## Important Notes

- **Package Name**: Your app uses `app.rork.washoe-pos` - make sure this matches in Google Play Console
- **Version Code**: Currently set to 1, increment this for each release
- **Permissions**: The app requests camera and storage permissions - ensure your privacy policy covers these
- **Target SDK**: Set to 34 (Android 14) for latest compatibility

## Troubleshooting

### Common Issues:
1. **Build fails**: Check that all dependencies are compatible with the target Android version
2. **Upload rejected**: Ensure your app meets Google Play policies
3. **Signing issues**: EAS handles signing automatically, but you can configure custom signing if needed

### Useful Commands:
```bash
# Check build status
eas build:list

# View build logs
eas build:view [BUILD_ID]

# Update app version
# Edit app.json version and versionCode, then rebuild
```

## Next Steps After Publishing

1. Monitor crash reports in Google Play Console
2. Respond to user reviews
3. Plan regular updates to maintain app quality
4. Consider setting up automated testing

For more detailed information, refer to the [Expo documentation](https://docs.expo.dev/build/introduction/) and [Google Play Console help](https://support.google.com/googleplay/android-developer/).
