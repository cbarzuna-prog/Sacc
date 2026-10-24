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

    private val worker = Executors.newSingleThreadExecutor()

    private var span = 5
    private var moveMode = false
    private var movingPos = -1
    private var moveStartedAt = 0L
    private var firstLoad = true

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        prefs = getSharedPreferences(AppRepository.PREFS, MODE_PRIVATE)

        val cardW = dp(CARD_W_DP)
        val cardH = dp(CARD_H_DP)
        val margin = dp(ITEM_MARGIN_DP)
        val usable = resources.displayMetrics.widthPixels - 2 * dp(SIDE_PADDING_DP)
        span = (usable / (cardW + 2 * margin)).coerceIn(3, 8)

        // Variables de medicion: `am start -S -n app.tvhome.launcher/.MainActivity --ez shadow false --ez clip false`
        val shadow = intent.getBooleanExtra(EXTRA_SHADOW, true)
        val clip = intent.getBooleanExtra(EXTRA_CLIP, true)

        iconLoader = IconLoader(packageManager, cardW, cardH, !clip)
        adapter = AppAdapter(
            iconLoader, cardW, cardH, margin, shadow, clip,
            { app -> launchApp(app) },
            { position -> startMove(position) }
        )

        grid = findViewById(R.id.app_grid)
        grid.layoutManager = GridLayoutManager(this, span)
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
        focusFirst()
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
            focusFirst()
        }
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.action == KeyEvent.ACTION_DOWN) {
            if (moveMode) {
                val delta = when (event.keyCode) {
                    KeyEvent.KEYCODE_DPAD_LEFT -> -1
                    KeyEvent.KEYCODE_DPAD_RIGHT -> 1
                    KeyEvent.KEYCODE_DPAD_UP -> -span
                    KeyEvent.KEYCODE_DPAD_DOWN -> span
                    else -> 0
                }
                if (delta != 0) {
                    moveBy(delta)
                    return true
                }
                when (event.keyCode) {
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
                    focusFirst()
                }
            }
        }
    }

    private fun focusFirst(attempt: Int = 0) {
        val v = grid.findViewHolderForAdapterPosition(0)?.itemView
        if (v != null) {
            v.requestFocus()
        } else if (attempt < 10) {
            grid.postDelayed({ focusFirst(attempt + 1) }, 50)
        }
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

    private fun moveBy(delta: Int) {
        val target = movingPos + delta
        if (target < 0 || target >= adapter.itemCount) return
        adapter.move(movingPos, target)
        movingPos = target
        grid.scrollToPosition(target)
        grid.post { grid.findViewHolderForAdapterPosition(target)?.itemView?.requestFocus() }
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
        if (pos in 0 until adapter.itemCount) adapter.notifyItemChanged(pos)
    }

    private fun dp(value: Int): Int =
        TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics
        ).toInt()

    companion object {
        // Deben coincidir con las medidas por defecto de res/layout/item_app.xml.
        private const val CARD_W_DP = 152
        private const val CARD_H_DP = 86
        private const val ITEM_MARGIN_DP = 12
        private const val SIDE_PADDING_DP = 48
        private const val MOVE_GUARD_MS = 600L

        private const val EXTRA_SHADOW = "shadow"
        private const val EXTRA_CLIP = "clip"

        private const val ORIGINAL_PKG = "com.google.android.tvlauncher"
        private const val ORIGINAL_ACTIVITY = "com.google.android.tvlauncher.MainActivity"
    }
}
