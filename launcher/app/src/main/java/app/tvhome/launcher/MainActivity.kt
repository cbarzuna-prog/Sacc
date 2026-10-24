package app.tvhome.launcher

import android.app.Activity
import android.content.ComponentName
import android.content.Intent
import android.content.SharedPreferences
import android.os.Bundle
import android.os.SystemClock
import android.provider.Settings
import android.util.TypedValue
import android.view.KeyEvent
import android.view.View
import android.widget.TextView
import android.widget.Toast
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import java.util.concurrent.Executors

class MainActivity : Activity() {

    private lateinit var grid: RecyclerView
    private lateinit var adapter: AppAdapter
    private lateinit var iconLoader: IconLoader
    private lateinit var prefs: SharedPreferences
    private lateinit var moveHint: TextView
    private lateinit var heroTitle: TextView
    private lateinit var heroSub: TextView

    private val worker = Executors.newSingleThreadExecutor()

    private var moveMode = false
    private var movingPos = -1
    private var moveStartedAt = 0L
    private var firstLoad = true

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        prefs = getSharedPreferences(AppRepository.PREFS, MODE_PRIVATE)

        // Fila de favoritas: LARGE_PER_ROW tarjetas grandes; resto: SMALL_PER_ROW por fila.
        val margin = dp(MARGIN_DP)
        val usable = resources.displayMetrics.widthPixels - 2 * dp(SIDE_PADDING_DP)
        val largeW = usable / LARGE_PER_ROW - 2 * margin
        val smallW = usable / SMALL_PER_ROW - 2 * margin
        val largeH = largeW * 9 / 16
        val smallH = smallW * 9 / 16

        // Variables de medicion: `am start -S -n app.tvhome.launcher/.MainActivity --ez shadow true --ez clip true --ez bg false`
        val shadow = intent.getBooleanExtra(EXTRA_SHADOW, DEFAULT_SHADOW)
        val clip = intent.getBooleanExtra(EXTRA_CLIP, DEFAULT_CLIP)
        if (!intent.getBooleanExtra(EXTRA_BG, true)) {
            findViewById<View>(R.id.bg).visibility = View.GONE
        }

        heroTitle = findViewById(R.id.hero_title)
        heroSub = findViewById(R.id.hero_sub)

        iconLoader = IconLoader(packageManager, !clip)
        adapter = AppAdapter(
            iconLoader, LARGE_PER_ROW, largeW, largeH, smallW, smallH, margin, shadow, clip,
            { app -> launchApp(app) },
            { position -> startMove(position) },
            { position -> showHero(position) }
        )

        val layoutManager = GridLayoutManager(this, SPAN_COUNT)
        layoutManager.spanSizeLookup = object : GridLayoutManager.SpanSizeLookup() {
            override fun getSpanSize(position: Int): Int =
                if (position < LARGE_PER_ROW) SPAN_COUNT / LARGE_PER_ROW
                else SPAN_COUNT / SMALL_PER_ROW
        }

        grid = findViewById(R.id.app_grid)
        grid.layoutManager = layoutManager
        grid.adapter = adapter
        grid.itemAnimator = null
        grid.setHasFixedSize(true)

        moveHint = findViewById(R.id.move_hint)
        findViewById<View>(R.id.btn_settings).setOnClickListener { openSettings() }
        findViewById<View>(R.id.btn_original).setOnClickListener { openOriginalLauncher() }
    }

    override fun onStart() {
        super.onStart()
        refreshApps()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // HOME pulsado con el launcher ya abierto: volver al inicio de la cuadricula.
        if (moveMode) endMove()
        grid.scrollToPosition(0)
        focusPosition(0)
    }

    override fun onDestroy() {
        worker.shutdownNow()
        iconLoader.shutdown()
        super.onDestroy()
    }

    @Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
    override fun onBackPressed() {
        // Un launcher no debe cerrarse con Atras.
        if (moveMode) {
            endMove()
        } else {
            grid.scrollToPosition(0)
            focusPosition(0)
        }
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.action == KeyEvent.ACTION_DOWN) {
            if (moveMode) {
                when (event.keyCode) {
                    KeyEvent.KEYCODE_DPAD_LEFT,
                    KeyEvent.KEYCODE_DPAD_RIGHT,
                    KeyEvent.KEYCODE_DPAD_UP,
                    KeyEvent.KEYCODE_DPAD_DOWN -> {
                        moveTo(moveTarget(movingPos, event.keyCode))
                        return true
                    }
                    KeyEvent.KEYCODE_DPAD_CENTER,
                    KeyEvent.KEYCODE_ENTER,
                    KeyEvent.KEYCODE_NUMPAD_ENTER -> {
                        // Se ignora la repeticion de la pulsacion larga que inicio el modo.
                        if (event.repeatCount == 0 &&
                            SystemClock.uptimeMillis() - moveStartedAt > MOVE_GUARD_MS
                        ) {
                            endMove()
                        }
                        return true
                    }
                    KeyEvent.KEYCODE_BACK -> {
                        endMove()
                        return true
                    }
                }
            } else if (event.keyCode == KeyEvent.KEYCODE_MENU && event.repeatCount == 0) {
                val f = currentFocus
                if (f != null && f.parent === grid) {
                    val p = grid.getChildAdapterPosition(f)
                    if (p != RecyclerView.NO_POSITION) startMove(p)
                }
                return true
            }
        }
        return super.dispatchKeyEvent(event)
    }

    /** Lee las apps en un hilo aparte y solo redibuja si la lista cambio. */
    private fun refreshApps() {
        worker.execute {
            val list = AppRepository.load(this, prefs)
            runOnUiThread {
                if (isDestroyed) return@runOnUiThread
                if (!moveMode) adapter.submit(list)
                if (firstLoad && adapter.itemCount > 0) {
                    firstLoad = false
                    focusPosition(0)
                }
            }
        }
    }

    private fun focusPosition(position: Int, attempt: Int = 0) {
        val v = grid.findViewHolderForAdapterPosition(position)?.itemView
        if (v != null) {
            v.requestFocus()
        } else if (attempt < 10) {
            grid.postDelayed({ focusPosition(position, attempt + 1) }, 50)
        }
    }

    /** Titulo grande con el nombre de la app enfocada y a que seccion pertenece. */
    private fun showHero(position: Int) {
        val label = adapter.labelAt(position) ?: return
        if (heroTitle.text.toString() != label) heroTitle.text = label
        heroSub.setText(if (position < LARGE_PER_ROW) R.string.hero_sub_fav else R.string.hero_sub_all)
    }

    private fun launchApp(app: AppInfo) {
        val info = app.ri.activityInfo
        val intent = Intent(Intent.ACTION_MAIN)
            .setComponent(ComponentName(info.packageName, info.name))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
        try {
            startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(this, R.string.err_launch, Toast.LENGTH_SHORT).show()
        }
    }

    private fun openSettings() {
        try {
            startActivity(Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (e: Exception) {
            Toast.makeText(this, R.string.err_launch, Toast.LENGTH_SHORT).show()
        }
    }

    /** Atajo de recuperacion: abre el launcher original de Google aunque este no sea el HOME. */
    private fun openOriginalLauncher() {
        val intent = Intent(Intent.ACTION_MAIN)
            .addCategory(Intent.CATEGORY_HOME)
            .setComponent(ComponentName(ORIGINAL_PKG, ORIGINAL_ACTIVITY))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(this, R.string.err_original_launcher, Toast.LENGTH_SHORT).show()
        }
    }

    private fun startMove(position: Int) {
        if (moveMode || position < 0 || position >= adapter.itemCount) return
        moveMode = true
        movingPos = position
        moveStartedAt = SystemClock.uptimeMillis()
        adapter.movingPkg = adapter.pkgAt(position)
        adapter.notifyItemChanged(position)
        moveHint.visibility = View.VISIBLE
    }

    /**
     * Posicion destino al mover con una flecha. Fila 0 = favoritas (LARGE_PER_ROW grandes);
     * filas 1.. = SMALL_PER_ROW pequenas por fila. Devuelve -1 si no hay destino.
     */
    private fun moveTarget(pos: Int, keyCode: Int): Int {
        val row = if (pos < LARGE_PER_ROW) 0 else 1 + (pos - LARGE_PER_ROW) / SMALL_PER_ROW
        val col = if (pos < LARGE_PER_ROW) pos else (pos - LARGE_PER_ROW) % SMALL_PER_ROW
        return when (keyCode) {
            KeyEvent.KEYCODE_DPAD_LEFT -> pos - 1
            KeyEvent.KEYCODE_DPAD_RIGHT -> pos + 1
            KeyEvent.KEYCODE_DPAD_UP ->
                if (row == 0) -1
                else if (row == 1) col * LARGE_PER_ROW / SMALL_PER_ROW
                else LARGE_PER_ROW + (row - 2) * SMALL_PER_ROW + col
            KeyEvent.KEYCODE_DPAD_DOWN ->
                if (row == 0) LARGE_PER_ROW + col * SMALL_PER_ROW / LARGE_PER_ROW
                else LARGE_PER_ROW + row * SMALL_PER_ROW + col
            else -> -1
        }
    }

    private fun moveTo(target: Int) {
        if (target < 0 || target >= adapter.itemCount || target == movingPos) return
        adapter.swap(movingPos, target)
        movingPos = target
        grid.scrollToPosition(target)
        focusPosition(target)
    }

    private fun endMove() {
        moveMode = false
        moveHint.visibility = View.GONE
        prefs.edit()
            .putString(AppRepository.KEY_ORDER, adapter.packages().joinToString(","))
            .apply()
        val pos = movingPos
        movingPos = -1
        adapter.movingPkg = null
        if (pos in 0 until adapter.itemCount) {
            adapter.notifyItemChanged(pos)
            focusPosition(pos)
        }
    }

    private fun dp(value: Int): Int =
        TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics
        ).toInt()

    companion object {
        private const val SIDE_PADDING_DP = 48
        private const val MARGIN_DP = 10

        // Cuadricula de 15 columnas virtuales: grandes ocupan 5 (3 por fila), pequenas 3 (5 por fila).
        private const val SPAN_COUNT = 15
        private const val LARGE_PER_ROW = 3
        private const val SMALL_PER_ROW = 5

        private const val MOVE_GUARD_MS = 600L

        private const val EXTRA_SHADOW = "shadow"
        private const val EXTRA_CLIP = "clip"
        private const val EXTRA_BG = "bg"
        // Valores por defecto de las variables de medicion (se fijan segun las pruebas A/B).
        private const val DEFAULT_SHADOW = false
        private const val DEFAULT_CLIP = false

        private const val ORIGINAL_PKG = "com.google.android.tvlauncher"
        private const val ORIGINAL_ACTIVITY = "com.google.android.tvlauncher.MainActivity"
    }
}
