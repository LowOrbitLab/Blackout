# Blackout 设备测试

配置默认连接本机 Appium，并使用独立的 Blackout 应用标识。请按实际设备调整系统版本和设备名称，在 `uitest` 目录运行；相对安装包路径也以该目录为基准。

Android 默认测试包由根目录的 `./android/gradlew --project-dir android assembleDebug` 生成。iOS 示例路径对应在根目录运行 `xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build` 的产物，真机测试需改为实际签名包路径和自己的开发者团队。

## Requirements

- [Java 8 JDK](http://www.oracle.com/technetwork/java/javase/downloads/index.html)

- [Maven](https://maven.apache.org/download.cgi)

- [Appium server](http://appium.io/)

- [Android emulator or real device]

- [Path variable JAVA_HOME, maven]

## Quickstart run test

1. Run emulator or connect you device
2. start appium server

```
appium --address 127.0.0.1 --port 4723 --base-path /wd/hub --relaxed-security
```

3. edit config.json file set android version and other property like "androidVersion": "10.0"
4. run tests

```
mvn test
```

5. optional create report

```
mvn allure:serve
```
