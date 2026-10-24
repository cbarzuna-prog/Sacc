package app.tvhome.launcher

import android.graphics.Outline
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class AppAdapter(
    private val loader: IconLoader,
    private val cardW: Int,
    private val cardH: Int,
    private val margin: Int,
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

    fun move(from: Int, to: Int) {
        items.add(to, items.removeAt(from))
        notifyItemMoved(from, to)
    }

    override fun getItemCount(): Int = items.size

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val v = LayoutInflater.from(parent.context).inflate(R.layout.item_app, parent, false)
        val card = v.findViewById<ImageView>(R.id.card_image)
        card.layoutParams.width = cardW
        card.layoutParams.height = cardH
        v.findViewById<TextView>(R.id.card_label).layoutParams.width = cardW
        (v.layoutParams as ViewGroup.MarginLayoutParams).setMargins(margin, margin, margin, margin)
        // Esquinas redondeadas por recorte de contorno: no consume memoria de bitmap extra.
        card.outlineProvider = object : ViewOutlineProvider() {
            override fun getOutline(view: View, outline: Outline) {
                outline.setRoundRect(0, 0, view.width, view.height, view.height * 0.14f)
            }
        }
        card.clipToOutline = true
        card.elevation = cardH * 0.06f
        return VH(v)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        holder.bind(items[position])
    }

    inner class VH(view: View) : RecyclerView.ViewHolder(view) {
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
            loader.load(app, card)
            applyState(itemView, itemView.hasFocus(), false)
        }

        private fun applyState(v: View, focused: Boolean, animate: Boolean) {
            val pkg = items.getOrNull(bindingAdapterPosition)?.pkg
            val moving = movingPkg != null && pkg == movingPkg
            val scale = if (moving) 1.2f else if (focused) 1.12f else 1f
            val lift = if (focused || moving) cardH * 0.3f else 0f
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
}
