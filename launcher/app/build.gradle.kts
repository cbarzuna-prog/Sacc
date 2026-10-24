plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "app.tvhome.launcher"
    compileSdk = 34

    defaultConfig {
        applicationId = "app.tvhome.launcher"
        minSdk = 26
        // La TV objetivo es Android 11 (API 30).
        targetSdk = 30
        versionCode = 3
        versionName = "0.3.0"
    }

    signingConfigs {
        // Clave de depuracion fija (no es secreta): permite actualizar con `adb install -r`.
        getByName("debug") {
            storeFile = file("../debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            // Firma de depuracion: suficiente para instalar por ADB en una TV propia.
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    lint {
        abortOnError = false
        checkReleaseBuilds = false
    }
}

dependencies {
    implementation("androidx.recyclerview:recyclerview:1.3.2")
}
