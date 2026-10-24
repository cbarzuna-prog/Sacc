package app.tvhome.launcher

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.ResolveInfo

class AppInfo(val pkg: String, val label: String, val ri: ResolveInfo)

/** Apps a mostrar y cuantas hay ocultas en total (para el boton "Ocultas (n)"). */
class LoadResult(val apps: List<AppInfo>, val hiddenCount: Int)

/** Descubre las apps lanzables (TV y estandar), aplica las ocultas y el orden guardado. */
object AppRepository {
    const val PREFS = "launcher"
    const val KEY_ORDER = "order"
    const val KEY_HIDDEN = "hidden"

    /** Con [hiddenOnly] devuelve solo las apps ocultas; si no, solo las visibles. */
    fun load(ctx: Context, prefs: SharedPreferences, hiddenOnly: Boolean): LoadResult {
        val pm = ctx.packageManager
        val seen = HashSet<String>()
        val all = ArrayList<AppInfo>()
        for (category in arrayOf(Intent.CATEGORY_LEANBACK_LAUNCHER, Intent.CATEGORY_LAUNCHER)) {
            val intent = Intent(Intent.ACTION_MAIN).addCategory(category)
            for (ri in pm.queryIntentActivities(intent, 0)) {
                val pkg = ri.activityInfo.packageName
                if (pkg == ctx.packageName || !seen.add(pkg)) continue
                all.add(AppInfo(pkg, ri.loadLabel(pm).toString(), ri))
            }
        }
        val hidden = HashSet(prefs.getStringSet(KEY_HIDDEN, emptySet()) ?: emptySet())
        val hiddenApps = all.filter { it.pkg in hidden }
        val chosen = if (hiddenOnly) hiddenApps else all.filter { it.pkg !in hidden }

        val index = HashMap<String, Int>()
        savedOrder(prefs).forEachIndexed { i, p -> index[p] = i }
        val sorted = chosen.sortedWith(
            compareBy<AppInfo>({ index[it.pkg] ?: Int.MAX_VALUE }, { it.label.lowercase() })
        )
        return LoadResult(sorted, hiddenApps.size)
    }

    fun savedOrder(prefs: SharedPreferences): List<String> =
        (prefs.getString(KEY_ORDER, "") ?: "").split(',').filter { it.isNotEmpty() }

    /** Guarda el orden de las apps visibles y conserva la posicion previa de las ocultas. */
    fun saveOrder(prefs: SharedPreferences, visible: List<String>) {
        val merged = visible + savedOrder(prefs).filter { it !in visible }
        prefs.edit().putString(KEY_ORDER, merged.joinToString(",")).apply()
    }

    fun setHidden(prefs: SharedPreferences, pkg: String, hide: Boolean) {
        val set = HashSet(prefs.getStringSet(KEY_HIDDEN, emptySet()) ?: emptySet())
        if (hide) set.add(pkg) else set.remove(pkg)
        prefs.edit().putStringSet(KEY_HIDDEN, set).apply()
    }
}
