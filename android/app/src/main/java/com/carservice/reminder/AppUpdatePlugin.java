package com.carservice.reminder;

import android.app.Activity;
import android.content.Intent;
import android.content.IntentSender;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.UpdateAvailability;
import com.google.android.play.core.install.model.InstallStatus;

@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {

    private static final int REQUEST_CODE_IMMEDIATE_UPDATE = 1001;
    private AppUpdateManager appUpdateManager;

    @Override
    public void load() {
        appUpdateManager = AppUpdateManagerFactory.create(getContext());
    }

    @PluginMethod
    public void checkForUpdate(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        appUpdateManager.getAppUpdateInfo().addOnSuccessListener(info -> {
            JSObject result = new JSObject();

            boolean updateAvailable = info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE;
            result.put("updateAvailable", updateAvailable);

            if (updateAvailable) {
                result.put("availableVersionCode", info.availableVersionCode());
                result.put("updatePriority", info.updatePriority());
                result.put("isUpdateTypeAllowed", info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE));
            }

            call.resolve(result);
        }).addOnFailureListener(e -> {
            call.reject("Failed to check for update: " + e.getMessage());
        });
    }

    @PluginMethod
    public void startImmediateUpdate(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        appUpdateManager.getAppUpdateInfo().addOnSuccessListener(info -> {
            if (info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
                    && info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
                try {
                    appUpdateManager.startUpdateFlowForResult(
                            info,
                            AppUpdateType.IMMEDIATE,
                            activity,
                            REQUEST_CODE_IMMEDIATE_UPDATE
                    );
                    call.resolve();
                } catch (IntentSender.SendIntentException e) {
                    call.reject("Failed to start update flow: " + e.getMessage());
                }
            } else {
                call.reject("Update not available or immediate update not allowed");
            }
        }).addOnFailureListener(e -> {
            call.reject("Failed to start update: " + e.getMessage());
        });
    }

    @PluginMethod
    public void completeUpdate(PluginCall call) {
        appUpdateManager.getAppUpdateInfo().addOnSuccessListener(info -> {
            if (info.installStatus() == InstallStatus.DOWNLOADED) {
                appUpdateManager.completeUpdate();
                call.resolve();
            } else {
                call.reject("Update not downloaded yet");
            }
        }).addOnFailureListener(e -> {
            call.reject("Failed to complete update: " + e.getMessage());
        });
    }

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        super.handleOnActivityResult(requestCode, resultCode, data);

        if (requestCode == REQUEST_CODE_IMMEDIATE_UPDATE) {
            if (resultCode != Activity.RESULT_OK) {
                // User cancelled or update failed — we could notify the JS side
                System.out.println("AppUpdate: Immediate update flow cancelled or failed");
            }
        }
    }
}