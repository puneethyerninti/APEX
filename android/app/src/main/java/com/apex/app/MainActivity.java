package com.apex.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(UpiLauncherPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
