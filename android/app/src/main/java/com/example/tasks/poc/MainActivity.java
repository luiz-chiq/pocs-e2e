package com.example.tasks.poc;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PolygonFilesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
