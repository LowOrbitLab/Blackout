package io.github.loworbitlab.blackout.util

fun String?.toJS(): Any = this?.serialize() ?: JSUndefined