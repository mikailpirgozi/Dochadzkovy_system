export default {
  expo: {
    name: "Dochádzka Pro",
    slug: "attendance-pro",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "attendance-pro",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#3b82f6"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.dochadzkapro.attendance",
      buildNumber: "1",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "Táto aplikácia potrebuje prístup k polohe pre overenie vašej pozície pri pipnutí do práce.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "Táto aplikácia potrebuje prístup k polohe na pozadí pre sledovanie pracovného času a upozornenia pri opustení pracoviska.",
        NSLocationAlwaysUsageDescription: "Táto aplikácia potrebuje prístup k polohe na pozadí pre sledovanie pracovného času a upozornenia pri opustení pracoviska.",
        NSLocationUsageDescription: "Táto aplikácia potrebuje prístup k polohe pre overenie vašej pozície pri pipnutí do práce.",
        NSCameraUsageDescription: "Táto aplikácia potrebuje prístup ku kamere pre skenovanie QR kódov pri pipnutí do práce. Kamera sa používa len na skenovanie QR kódov a žiadne obrázky sa neukladajú.",
        NSUserNotificationsUsageDescription: "Táto aplikácia posiela upozornenia na pripomenutie prestávok, konca zmeny a pri opustení pracoviska. Upozornenia pomáhajú zabezpečiť presné sledovanie času a dodržiavanie pracovných pravidiel.",
        NSFaceIDUsageDescription: "Táto aplikácia používa Face ID pre bezpečné a rýchle prihlásenie bez nutnosti zadávať heslo. Face ID sa používa len na overenie vašej identity.",
        UIBackgroundModes: ["location", "background-processing"],
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
          NSExceptionDomains: {
            "localhost": {
              NSExceptionAllowsInsecureHTTPLoads: true
            },
            "192.168.1.22": {
              NSExceptionAllowsInsecureHTTPLoads: true
            },
            "backend-api-production-03aa.up.railway.app": {
              NSExceptionRequiresForwardSecrecy: false,
              NSExceptionMinimumTLSVersion: "TLSv1.2",
              NSThirdPartyExceptionAllowsInsecureHTTPLoads: false,
              NSThirdPartyExceptionMinimumTLSVersion: "TLSv1.2"
            }
          }
        },
        ITSAppUsesNonExemptEncryption: false,
        LSApplicationCategoryType: "public.app-category.business"
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#3b82f6"
      },
      package: "com.dochadzkapro.attendance",
      versionCode: 1,
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "CAMERA",
        "VIBRATE",
        "RECEIVE_BOOT_COMPLETED",
        "WAKE_LOCK",
        "USE_FINGERPRINT",
        "USE_BIOMETRIC"
      ]
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-location",
      "expo-task-manager",
      "expo-notifications",
      "expo-barcode-scanner",
      "expo-local-authentication",
      [
        "expo-build-properties",
        {
          ios: {
            deploymentTarget: "15.1"
          },
          android: {
            compileSdkVersion: 34,
            targetSdkVersion: 34,
            minSdkVersion: 26
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      eas: {
        projectId: "d0564238-9aa3-4e70-b4ce-5656ec4a811e"
      },
      API_URL: process.env.EXPO_PUBLIC_API_URL || "https://backend-api-production-03aa.up.railway.app/api",
      ENVIRONMENT: process.env.NODE_ENV || "development"
    }
  }
};
