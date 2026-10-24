package app.tvhome.launcher

import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.os.Handler
import android.os.Looper
import android.util.LruCache
import android.widget.ImageView
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit

/**
 * Carga perezosa de banners/iconos en segundo plano, ya reducidos al tamano de la tarjeta,
 * con una cache LRU de tamano maximo fijo (en KB). Los hilos se liberan al quedar inactivos.
 */
class IconLoader(
    private val pm: PackageManager,
    private val w: Int,
    private val h: Int
) {
    private val cache = object : LruCache<String, Bitmap>(CACHE_KB) {
        override fun sizeOf(key: String, value: Bitmap): Int = value.byteCount / 1024
    }

    private val executor = ThreadPoolExecutor(
        2, 2, 5, TimeUnit.SECONDS, LinkedBlockingQueue<Runnable>()
    ).apply { allowCoreThreadTimeOut(true) }

    private val main = Handler(Looper.getMainLooper())

    fun load(app: AppInfo, view: ImageView) {
        view.tag = app.pkg
        val cached = cache.get(app.pkg)
        if (cached != null) {
            view.setImageBitmap(cached)
            return
        }
        view.setImageDrawable(null)
        executor.execute {
            val bmp = try {
                render(app)
            } catch (e: Exception) {
                null
            }
            if (bmp != null) {
                cache.put(app.pkg, bmp)
                main.post { if (view.tag == app.pkg) view.setImageBitmap(bmp) }
            }
        }
    }

    fun shutdown() {
        executor.shutdownNow()
        cache.evictAll()
    }

    private fun render(app: AppInfo): Bitmap {
        val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val info = app.ri.activityInfo
        val banner = try {
            info.loadBanner(pm)
        } catch (e: Exception) {
            null
        }
        if (banner != null) {
            banner.setBounds(0, 0, w, h)
            banner.draw(canvas)
        } else {
            // Sin banner de TV: icono cuadrado centrado sobre fondo oscuro.
            canvas.drawColor(CARD_COLOR)
            val icon = info.loadIcon(pm)
            val s = (h * 0.62f).toInt()
            val left = (w - s) / 2
            val top = (h - s) / 2
            icon.setBounds(left, top, left + s, top + s)
            icon.draw(canvas)
        }
        return bmp
    }

    companion object {
        private const val CACHE_KB = 8 * 1024
        private const val CARD_COLOR = 0xFF1E2230.toInt()
    }
}
