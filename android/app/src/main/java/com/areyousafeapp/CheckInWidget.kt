package com.areyousafeapp

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.*

class CheckInWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {
        // Widget first instance created
    }

    override fun onDisabled(context: Context) {
        // Widget last instance removed
    }

    companion object {
        private const val PREFS_NAME = "com.areyousafeapp.widget"
        private const val PREF_LAST_CHECKIN = "last_checkin"

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_checkin)

            // Get last check-in from shared preferences
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val lastCheckIn = prefs.getString(PREF_LAST_CHECKIN, null)

            // Update status text
            val statusText = if (lastCheckIn != null) {
                val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                if (lastCheckIn == today) {
                    "Checked in today!"
                } else {
                    "Tap to check in"
                }
            } else {
                "Tap to check in"
            }
            views.setTextViewText(R.id.widget_status, statusText)

            // Update last check-in text
            val lastText = if (lastCheckIn != null) {
                try {
                    val inputFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                    val outputFormat = SimpleDateFormat("MMM d", Locale.getDefault())
                    val date = inputFormat.parse(lastCheckIn)
                    "Last: ${outputFormat.format(date!!)}"
                } catch (e: Exception) {
                    "Last: $lastCheckIn"
                }
            } else {
                "Last: Never"
            }
            views.setTextViewText(R.id.widget_last_checkin, lastText)

            // Create intent to launch app
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("fromWidget", true)
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Set click listeners
            views.setOnClickPendingIntent(R.id.widget_layout, pendingIntent)
            views.setOnClickPendingIntent(R.id.widget_button, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        // Called from React Native to update widget
        fun updateAllWidgets(context: Context, lastCheckInDate: String?) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(PREF_LAST_CHECKIN, lastCheckInDate).apply()

            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = android.content.ComponentName(context, CheckInWidget::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

            for (appWidgetId in appWidgetIds) {
                updateAppWidget(context, appWidgetManager, appWidgetId)
            }
        }
    }
}
