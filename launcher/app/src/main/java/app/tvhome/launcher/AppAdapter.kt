package app.tvhome.launcher

import android.graphics.Outline
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import java.util.Collections

/**
 * Las primeras [favCount] apps se muestran como tarjetas grandes (fila de favoritas) y el resto
 * como tarjetas pequenas en cuadricula.
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
    private val onLongPress: (Int) -> Unit
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

        val v = LayoutInflater.from(parent.context).inflate(R.layout.item_app, parent, false)
        val card = v.findViewById<ImageView>(R.id.card_image)
        card.layoutParams.width = w
        card.layoutParams.height = h
        val label = v.findViewById<TextView>(R.id.card_label)
        label.layoutParams.width = w
        label.textSize = if (large) 15f else 13f
        (v.layoutParams as ViewGroup.MarginLayoutParams).setMargins(margin, margin, margin, margin)

        if (shadow || clip) {
            card.outlineProvider = object : ViewOutlineProvider() {
                override fun getOutline(view: View, outline: Outline) {
                    outline.setRoundRect(
                        0, 0, view.width, view.height, view.height * IconLoader.CORNER_RATIO
                    )
                }
            }
            card.clipToOutline = clip
        }
        card.elevation = if (shadow) h * 0.06f else 0f
        // Con bitmaps ya redondeados, el fondo rectangular asomaria por las esquinas.
        if (!clip) card.background = null
        return VH(v, w, h)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        holder.bind(items[position])
    }

    inner class VH(view: View, private val w: Int, private val h: Int) : RecyclerView.ViewHolder(view) {
        private val card: ImageView = view.findViewById(R.id.card_image)
        private val label: TextView = view.findViewById(R.id.card_label)

        init {
            view.setOnClickListener {
                val p = bindingAdapterPosition
                if (p != RecyclerView.NO_POSITION) onLaunch(items[p])
            }
            view.setOnLongClickListener {
                val p = bindingAdapterPosition
                if (p != RecyclerView.NO_POSITION) {
                    onLongPress(p)
                    true
                } else {
                    false
                }
            }
            view.setOnFocusChangeListener { v, focused -> applyState(v, focused, true) }
        }

        fun bind(app: AppInfo) {
            label.text = app.label
            loader.load(app, card, w, h)
            applyState(itemView, itemView.hasFocus(), false)
        }

        private fun applyState(v: View, focused: Boolean, animate: Boolean) {
            val pkg = items.getOrNull(bindingAdapterPosition)?.pkg
            val moving = movingPkg != null && pkg == movingPkg
            val scale = if (moving) 1.16f else if (focused) 1.12f else 1f
            val lift = if (shadow && (focused || moving)) h * 0.3f else 0f
            val labelAlpha = if (focused || moving) 1f else 0f
            if (animate) {
                v.animate().scaleX(scale).scaleY(scale).translationZ(lift).setDuration(120).start()
                card.animate().translationZ(lift).setDuration(120).start()
                label.animate().alpha(labelAlpha).setDuration(120).start()
            } else {
                v.animate().cancel()
                card.animate().cancel()
                label.animate().cancel()
                v.scaleX = scale
                v.scaleY = scale
                v.translationZ = lift
                card.translationZ = lift
                label.alpha = labelAlpha
            }
        }
    }

    companion object {
        private const val TYPE_LARGE = 0
        private const val TYPE_SMALL = 1
    }
}
