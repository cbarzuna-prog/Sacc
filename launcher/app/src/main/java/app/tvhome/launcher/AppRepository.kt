package app.tvhome.launcher

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.ResolveInfo

class AppInfo(val pkg: String, val label: String, val ri: ResolveInfo)

/** Descubre las apps lanzables (TV y estandar) y aplica el orden guardado por el usuario. */
object AppRepository {
    const val PREFS = "launcher"
    const val KEY_ORDER = "order"

    fun load(ctx: Context, prefs: SharedPreferences): List<AppInfo> {
        val pm = ctx.packageManager
        val seen = HashSet<String>()
        val apps = ArrayList<AppInfo>()
        for (category in arrayOf(Intent.CATEGORY_LEANBACK_LAUNCHER, Intent.CATEGORY_LAUNCHER)) {
            val intent = Intent(Intent.ACTION_MAIN).addCategory(category)
            for (ri in pm.queryIntentActivities(intent, 0)) {
                val pkg = ri.activityInfo.packageName
                if (pkg == ctx.packageName || !seen.add(pkg)) continue
                apps.add(AppInfo(pkg, ri.loadLabel(pm).toString(), ri))
            }
        }
        val saved = (prefs.getString(KEY_ORDER, "") ?: "").split(',').filter { it.isNotEmpty() }
        val index = HashMap<String, Int>()
        saved.forEachIndexed { i, p -> index[p] = i }
        return apps.sortedWith(
            compareBy<AppInfo>({ index[it.pkg] ?: Int.MAX_VALUE }, { it.label.lowercase() })
        )
    }
}
