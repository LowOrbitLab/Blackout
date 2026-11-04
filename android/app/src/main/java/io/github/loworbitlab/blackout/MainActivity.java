package io.github.loworbitlab.blackout;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import io.github.loworbitlab.blackout.plugin.appinfo.AppInfo;
import io.github.loworbitlab.blackout.plugin.camerapreview.CameraPreview;
import io.github.loworbitlab.blackout.plugin.environment.Environment;
import io.github.loworbitlab.blackout.plugin.isolatedmodules.IsolatedModules;
import io.github.loworbitlab.blackout.plugin.saplingnative.SaplingNative;
import io.github.loworbitlab.blackout.plugin.securityutils.SecurityUtils;
import io.github.loworbitlab.blackout.plugin.zip.Zip;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(CameraPreview.class);
    registerPlugin(AppInfo.class);
    registerPlugin(SecurityUtils.class);
    registerPlugin(SaplingNative.class);
    registerPlugin(Zip.class);
    registerPlugin(Environment.class);

    registerPlugin(IsolatedModules.class);

    super.onCreate(savedInstanceState);
  }
}
