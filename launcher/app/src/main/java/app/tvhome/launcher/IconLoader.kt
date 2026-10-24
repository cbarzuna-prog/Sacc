package app.tvhome.launcher

import android.content.pm.ActivityInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapShader
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.graphics.drawable.Drawable
import android.os.Handler
import android.os.Looper
import android.util.LruCache
import android.widget.ImageView
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit

/**
 * Prepara cada tarjeta ya "horneada": una tarjeta oscura uniforme con el logo centrado y, en las
 * tarjetas grandes, el nombre de la app. Todo el trabajo (degradado, borde de luz, tinte, texto)
 * se hace una vez en segundo plano y se guarda en una cache LRU de tamano maximo fijo; en pantalla
 * solo se dibuja un bitmap.
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

    fun load(app: AppInfo, view: ImageView, w: Int, h: Int, named: Boolean) {
        val key = "${app.pkg}@${w}x$h${if (named) "n" else ""}"
        view.tag = key
        val cached = cache.get(key)
        if (cached != null) {
            view.setImageBitmap(cached)
            return
        }
        view.setImageDrawable(null)
        executor.execute {
            val bmp = try {
                render(app, w, h, named)
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

    private fun loadDrawable(info: ActivityInfo): Drawable? {
        try {
            return info.loadIcon(pm)
        } catch (e: Exception) {
            // Se intenta con el banner de TV.
        }
        return try {
            info.loadBanner(pm)
        } catch (e: Exception) {
            null
        }
    }

    private fun render(app: AppInfo, w: Int, h: Int, named: Boolean): Bitmap {
        val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val ratio = if (named) ICON_RATIO_NAMED else ICON_RATIO
        var glyph = loadDrawable(app.ri.activityInfo)?.let { rasterize(it, (h * ratio).toInt()) }
        val stats = glyph?.let { analyze(it) }

        // Un icono cuadrado a sangre (sin transparencia) se redondea para que no parezca una placa.
        if (glyph != null && stats != null && stats.coverage > 0.97f) {
            glyph = roundGlyph(glyph)
        }

        // Un logo oscuro y con transparencia se perderia sobre la tarjeta oscura: se usa una placa clara.
        val light = stats != null && stats.coverage < 0.6f && stats.luminance < 0.28f
        val top: Int
        val bottom: Int
        if (light) {
            top = 0xFFF0F2F7.toInt()
            bottom = 0xFFD3D8E3.toInt()
        } else {
            top = mix(0xFF2A2F42.toInt(), stats?.color ?: 0xFF3A4260.toInt(), 0.22f)
            bottom = 0xFF11131B.toInt()
        }

        val rect = RectF(0f, 0f, w.toFloat(), h.toFloat())
        val r = h * CORNER_RATIO
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        paint.shader = LinearGradient(0f, 0f, 0f, h.toFloat(), top, bottom, Shader.TileMode.CLAMP)
        if (rounded) canvas.drawRoundRect(rect, r, r, paint) else canvas.drawRect(rect, paint)

        // Borde de luz fino, horneado.
        paint.shader = null
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = maxOf(1f, h * 0.012f)
        paint.color = if (light) 0x33000000 else 0x33FFFFFF
        val inset = paint.strokeWidth / 2f
        canvas.drawRoundRect(RectF(inset, inset, w - inset, h - inset), r, r, paint)

        if (glyph != null) {
            val cy = if (named) h * 0.43f else h * 0.5f
            canvas.drawBitmap(
                glyph,
                (w - glyph.width) / 2f,
                cy - glyph.height / 2f,
                Paint(Paint.FILTER_BITMAP_FLAG)
            )
            glyph.recycle()
        }

        if (named) drawName(canvas, app.label, w, h, light)
        return bmp
    }

    /** Nombre de la app, centrado abajo, recortado con puntos suspensivos si no cabe. */
    private fun drawName(canvas: Canvas, label: String, w: Int, h: Int, light: Boolean) {
        val p = Paint(Paint.ANTI_ALIAS_FLAG)
        p.typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
        p.textSize = h * 0.105f
        p.textAlign = Paint.Align.CENTER
        p.color = if (light) 0xFF2A2F42.toInt() else 0xFFE8ECF4.toInt()
        val maxW = w * 0.84f
        val fit = p.breakText(label, true, maxW, null)
        val text = if (fit < label.length) label.take(maxOf(1, fit - 1)) + "…" else label
        canvas.drawText(text, w / 2f, h - h * 0.10f, p)
    }

    /** Dibuja el icono dentro de un cuadrado de lado [box] conservando su proporcion. */
    private fun rasterize(d: Drawable, box: Int): Bitmap {
        val iw = if (d.intrinsicWidth > 0) d.intrinsicWidth else box
        val ih = if (d.intrinsicHeight > 0) d.intrinsicHeight else box
        val scale = box / maxOf(iw, ih).toFloat()
        val dw = maxOf(1, (iw * scale).toInt())
        val dh = maxOf(1, (ih * scale).toInt())
        val b = Bitmap.createBitmap(dw, dh, Bitmap.Config.ARGB_8888)
        d.setBounds(0, 0, dw, dh)
        d.draw(Canvas(b))
        return b
    }

    private fun roundGlyph(src: Bitmap): Bitmap {
        val out = Bitmap.createBitmap(src.width, src.height, Bitmap.Config.ARGB_8888)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        paint.shader = BitmapShader(src, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP)
        val rad = minOf(src.width, src.height) * 0.2f
        Canvas(out).drawRoundRect(
            RectF(0f, 0f, src.width.toFloat(), src.height.toFloat()), rad, rad, paint
        )
        src.recycle()
        return out
    }

    private class Stats(val coverage: Float, val luminance: Float, val color: Int)

    /** Cobertura opaca, luminancia y color medio del icono, sobre una miniatura de 32 px. */
    private fun analyze(b: Bitmap): Stats {
        val sw = minOf(b.width, 32)
        val sh = minOf(b.height, 32)
        val small = Bitmap.createScaledBitmap(b, sw, sh, true)
        val px = IntArray(sw * sh)
        small.getPixels(px, 0, sw, 0, 0, sw, sh)
        if (small !== b) small.recycle()

        var n = 0
        var sr = 0L
        var sg = 0L
        var sb = 0L
        for (p in px) {
            if (Color.alpha(p) > 40) {
                n++
                sr += Color.red(p)
                sg += Color.green(p)
                sb += Color.blue(p)
            }
        }
        if (n == 0) return Stats(0f, 0.5f, 0xFF3A4260.toInt())
        val ar = (sr / n).toInt()
        val ag = (sg / n).toInt()
        val ab = (sb / n).toInt()
        val lum = (0.299f * ar + 0.587f * ag + 0.114f * ab) / 255f
        return Stats(n / px.size.toFloat(), lum, Color.rgb(ar, ag, ab))
    }

    private fun mix(a: Int, b: Int, t: Float): Int {
        fun ch(x: Int, y: Int) = (x + (y - x) * t).toInt().coerceIn(0, 255)
        return Color.rgb(
            ch(Color.red(a), Color.red(b)),
            ch(Color.green(a), Color.green(b)),
            ch(Color.blue(a), Color.blue(b))
        )
    }

    companion object {
        /** Mismo radio relativo que usa el contorno de AppAdapter. */
        const val CORNER_RATIO = 0.14f
        private const val ICON_RATIO = 0.56f
        private const val ICON_RATIO_NAMED = 0.52f
        private const val CACHE_KB = 10 * 1024
    }
}
