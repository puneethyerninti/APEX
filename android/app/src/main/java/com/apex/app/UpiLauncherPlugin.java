package com.apex.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "UpiLauncher")
public class UpiLauncherPlugin extends Plugin {
    @PluginMethod
    public void open(PluginCall call) {
        String value = call.getString("uri");
        if (value == null) { call.reject("Payment URI required"); return; }
        Uri uri = Uri.parse(value);
        if (!"upi".equals(uri.getScheme()) || !"pay".equals(uri.getHost()) || uri.getQueryParameter("pa") == null) {
            call.reject("Invalid UPI payment URI"); return;
        }
        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        if (intent.resolveActivity(getActivity().getPackageManager()) == null) {
            call.reject("Install a bank or UPI app to make this payment"); return;
        }
        try {
            getActivity().startActivity(Intent.createChooser(intent, "Pay with UPI"));
            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (ActivityNotFoundException error) { call.reject("No UPI app available", error); }
    }
}
