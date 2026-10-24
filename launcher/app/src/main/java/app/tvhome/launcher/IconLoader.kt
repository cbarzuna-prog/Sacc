package app.tvhome.launcher

import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapShader
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.os.Handler
import android.os.Looper
import android.util.LruCache
import android.widget.ImageView
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit

/**
 * Carga perezosa de banners/iconos en segundo plano, ya reducidos al tamano exacto de la tarjeta
 * (grande o pequena), con una cache LRU de tamano maximo fijo (en KB). Los hilos se liberan al
 * quedar inactivos.
 */
class IconLoader(
    private val pm: PackageManager,
    /** Si es true, las esquinas redondeadas se hornean en el bitmap (sin recorte por contorno). */
    private val rounded: Boolean
) {
    private val cache = object : LruCache<String, Bitmap>(CACHE_KB) {
        override fun sizeOf(key: String, value: Bitmap): Int = value.byteCount / 1024
    }

    private val executor = ThreadPoolExecutor(
        2, 2, 5, TimeUnit.SECONDS, LinkedBlockingQueue<Runnable>()
    ).apply { allowCoreThreadTimeOut(true) }

    private val main = Handler(Looper.getMainLooper())

    fun load(app: AppInfo, view: ImageView, w: Int, h: Int) {
        val key = "${app.pkg}@${w}x$h"
        view.tag = key
        val cached = cache.get(key)
        if (cached != null) {
            view.setImageBitmap(cached)
            return
        }
        view.setImageDrawable(null)
        executor.execute {
            val bmp = try {
                render(app, w, h)
            } catch (e: Exception) {
                null
            }
            if (bmp != null) {
                cache.put(key, bmp)
                main.post { if (view.tag == key) view.setImageBitmap(bmp) }
            }
        }
    }

    fun shutdown() {
        executor.shutdownNow()
        cache.evictAll()
    }

    private fun render(app: AppInfo, w: Int, h: Int): Bitmap {
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
        return if (rounded) round(bmp, w, h) else bmp
    }

    private fun round(src: Bitmap, w: Int, h: Int): Bitmap {
        val out = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        paint.shader = BitmapShader(src, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP)
        val r = h * CORNER_RATIO
        Canvas(out).drawRoundRect(RectF(0f, 0f, w.toFloat(), h.toFloat()), r, r, paint)
        src.recycle()
        return out
    }

    companion object {
        /** Mismo radio relativo que usa el contorno de AppAdapter. */
        const val CORNER_RATIO = 0.14f
        private const val CACHE_KB = 10 * 1024
        private const val CARD_COLOR = 0xFF1E2230.toInt()
    }
}
