package com.niteshkhobragade.creator_studio

import android.location.Address
import android.location.Geocoder
import android.os.Build
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.util.Locale

class MainActivity : FlutterActivity() {
    private val channel = "com.niteshkhobragade.creator_studio/device"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channel).setMethodCallHandler { call, result ->
            when (call.method) {
                "getDeviceInfo" -> result.success(mapOf(
                    "manufacturer" to Build.MANUFACTURER,
                    "model" to Build.MODEL,
                    "brand" to Build.BRAND,
                    "device" to Build.DEVICE,
                    "product" to Build.PRODUCT,
                    "androidVersion" to Build.VERSION.RELEASE,
                    "sdkInt" to Build.VERSION.SDK_INT
                ))
                "reverseGeocode" -> {
                    val lat = call.argument<Double>("latitude")
                    val lon = call.argument<Double>("longitude")
                    if (lat == null || lon == null) {
                        result.error("BAD_COORDINATES", "Latitude and longitude are required", null)
                    } else {
                        try {
                            @Suppress("DEPRECATION")
                            val geocoder = Geocoder(this, Locale.getDefault())
                            @Suppress("DEPRECATION")
                            val addresses: List<Address> = geocoder.getFromLocation(lat, lon, 1) ?: emptyList()
                            val a = addresses.firstOrNull()
                            result.success(mapOf(
                                "formatted" to listOfNotNull(a?.featureName, a?.subLocality, a?.locality, a?.adminArea, a?.countryName).distinct().joinToString(", "),
                                "locality" to (a?.locality ?: ""),
                                "subLocality" to (a?.subLocality ?: ""),
                                "adminArea" to (a?.adminArea ?: ""),
                                "country" to (a?.countryName ?: ""),
                                "postalCode" to (a?.postalCode ?: "")
                            ))
                        } catch (e: Exception) {
                            result.error("GEOCODER_FAILED", e.message, null)
                        }
                    }
                }
                "getTimeZone" -> result.success(java.util.TimeZone.getDefault().id)
                else -> result.notImplemented()
            }
        }
    }
}
