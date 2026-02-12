#!/bin/bash

# Are You Safe App - Run Script
# This script sets up the environment for this project only

# Load nvm for this session only
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use Node 20 for this project
nvm use 20

# Navigate to project directory
cd "$(dirname "$0")"

echo ""
echo "=========================================="
echo "   Are You Safe? - React Native App"
echo "=========================================="
echo ""

case "$1" in
  "start")
    echo "Starting Metro bundler..."
    npx react-native start --reset-cache
    ;;
  "android")
    echo "Running on Android..."
    npx react-native run-android
    ;;
  "build")
    echo "Building debug APK..."
    cd android && ./gradlew assembleDebug
    echo ""
    echo "APK created at:"
    echo "android/app/build/outputs/apk/debug/app-debug.apk"
    ;;
  "clean")
    echo "Cleaning project..."
    cd android && ./gradlew clean
    ;;
  "install")
    echo "Installing dependencies..."
    npm install
    ;;
  *)
    echo "Usage: ./run.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start    - Start Metro bundler"
    echo "  android  - Run app on Android device/emulator"
    echo "  build    - Build debug APK"
    echo "  clean    - Clean build files"
    echo "  install  - Install npm dependencies"
    echo ""
    echo "Example:"
    echo "  ./run.sh start     # Start Metro bundler"
    echo "  ./run.sh android   # Run on connected Android device"
    echo "  ./run.sh build     # Create APK file"
    ;;
esac
