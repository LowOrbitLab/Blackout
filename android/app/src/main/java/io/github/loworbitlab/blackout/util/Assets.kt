package io.github.loworbitlab.blackout.util

import android.content.res.AssetManager

fun AssetManager.readBytes(path: String): ByteArray = open(path).use { stream -> stream.readBytes() }