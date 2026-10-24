package app.tvhome.launcher

import android.graphics.Outline
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import android.widget.ImageView
import androidx.recyclerview.widget.RecyclerView
import java.util.Collections

/**
 * Las primeras [favCount] apps se muestran como tarjetas grandes (fila de favoritas) y el resto
 * como tarjetas pequenas en cuadricula. Cada tarjeta es una sola vista de imagen.
 */
class AppAdapter(
    private val loader: IconLoader,
    private val favCount: Int,
    private val largeW: Int,
    private val largeH: Int,
    private val smallW: Int,
    private val smallH: Int,
    private val margin: Int,
    /** Sombra por elevacion en el foco (variable de medicion). */
    private val shadow: Boolean,
    /** Recorte de esquinas por contorno; si es false, los bitmaps ya vienen redondeados. */
    private val clip: Boolean,
    private val onLaunch: (AppInfo) -> Unit,
    private val onLongPress: (Int) -> Unit,
    private val onFocused: (Int) -> Unit
) : RecyclerView.Adapter<AppAdapter.VH>() {

    private val items = ArrayList<AppInfo>()

    /** Paquete que se esta moviendo (modo mover); se resalta mas que el foco normal. */
    var movingPkg: String? = null

    /** Devuelve true si la lista cambio (y se redibujo). */
    fun submit(list: List<AppInfo>): Boolean {
        if (items.size == list.size && items.indices.all { items[it].pkg == list[it].pkg }) {
            return false
        }
        items.clear()
        items.addAll(list)
        notifyDataSetChanged()
        return true
    }

    fun packages(): List<String> = items.map { it.pkg }

    fun pkgAt(position: Int): String? = items.getOrNull(position)?.pkg

    fun labelAt(position: Int): String? = items.getOrNull(position)?.label

    /** Intercambia dos apps (rebinda ambas, porque pueden cambiar de tarjeta grande a pequena). */
    fun swap(a: Int, b: Int) {
        Collections.swap(items, a, b)
        notifyItemChanged(a)
        notifyItemChanged(b)
    }

    override fun getItemCount(): Int = items.size

    override fun getItemViewType(position: Int): Int =
        if (position < favCount) TYPE_LARGE else TYPE_SMALL

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val large = viewType == TYPE_LARGE
        val w = if (large) largeW else smallW
        val h = if (large) largeH else smallH

        val v = LayoutInflater.from(parent.context).inflate(R.layout.item_app, parent, false) as ImageView
        val lp = v.layoutParams as ViewGroup.MarginLayoutParams
        lp.width = w
        lp.height = h
        lp.setMargins(margin, margin, margin, margin)

        if (shadow || clip) {
            v.outlineProvider = object : ViewOutlineProvider() {
                override fun getOutline(view: View, outline: Outline) {
                    outline.setRoundRect(
                        0, 0, view.width, view.height, view.height * IconLoader.CORNER_RATIO
                    )
                }
            }
            v.clipToOutline = clip
        }
        v.elevation = if (shadow) h * 0.06f else 0f
        return VH(v, w, h, large)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        holder.bind(items[position])
    }

    inner class VH(
        private val card: ImageView,
        private val w: Int,
        private val h: Int,
        private val large: Boolean
    ) : RecyclerView.ViewHolder(card) {

        init {
            card.setOnClickListener {
                val p = bindingAdapterPosition
                if (p != RecyclerView.NO_POSITION) onLaunch(items[p])
            }
            card.setOnLongClickListener {
                val p = bindingAdapterPosition
                if (p != RecyclerView.NO_POSITION) {
                    onLongPress(p)
                    true
                } else {
                    false
                }
            }
            card.setOnFocusChangeListener { _, focused ->
                applyState(focused, true)
                if (focused) {
                    val p = bindingAdapterPosition
                    if (p != RecyclerView.NO_POSITION) onFocused(p)
                }
            }
        }

        fun bind(app: AppInfo) {
            loader.load(app, card, w, h, large)
            applyState(card.hasFocus(), false)
        }

        /**
         * Foco = crece y se muestra a pleno brillo; el resto se oscurece (filtro de color negro
         * semitransparente: la tarjeta sigue opaca, no deja ver el fondo a traves).
         */
        private fun applyState(focused: Boolean, animate: Boolean) {
            val pkg = items.getOrNull(bindingAdapterPosition)?.pkg
            val moving = movingPkg != null && pkg == movingPkg
            val scale = if (moving) 1.14f else if (focused) 1.1f else 1f
            val lift = if (shadow && (focused || moving)) h * 0.3f else 0f
            if (focused || moving) card.clearColorFilter() else card.setColorFilter(DIM_COLOR)
            if (animate) {
                card.animate().scaleX(scale).scaleY(scale).translationZ(lift)
                    .setDuration(140).start()
            } else {
                card.animate().cancel()
                card.scaleX = scale
                card.scaleY = scale
                card.translationZ = lift
            }
        }
    }

    companion object {
        private const val TYPE_LARGE = 0
        private const val TYPE_SMALL = 1
        /** Negro al ~30 %: oscurece las tarjetas sin foco. */
        private const val DIM_COLOR = 0x4D000000
    }
}
