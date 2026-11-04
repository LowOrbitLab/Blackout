package io.github.loworbitlab.blackout.util

fun Any.serialize(): Any = when (this) {
    is String -> "\"$this\""
    else -> toString()
}