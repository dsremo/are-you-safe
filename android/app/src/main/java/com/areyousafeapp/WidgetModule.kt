package com.areyousafeapp

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class WidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "WidgetModule"
    }

    @ReactMethod
    fun updateWidget(lastCheckInDate: String?, promise: Promise) {
        try {
            CheckInWidget.updateAllWidgets(reactApplicationContext, lastCheckInDate)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("WIDGET_UPDATE_ERROR", e.message)
        }
    }
}
