package com.niteshkhobragade.creator_studio

import android.os.Build
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
    private val channelName = "com.niteshkhobragade.creator_studio/device"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName).setMethodCallHandler { call, result ->
            when (call.method) {
                "getDeviceModel" -> {
                    val manufacturer = Build.MANUFACTURER.trim()
                    val model = Build.MODEL.trim()
                    result.success(listOf(manufacturer, model).filter { it.isNotEmpty() }.joinToString(" "))
                }
                else -> result.notImplemented()
            }
        }
    }
}
