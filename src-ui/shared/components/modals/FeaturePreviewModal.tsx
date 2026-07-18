import { X, Sparkles, Image as ImageIcon, Crop, Palette, FileOutput, Layers, Sun, Lightbulb, ZoomIn, Wand2, PenTool } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { closeModal } from "../../../app/slices/uiSlice";

// @ts-ignore
import removeBgPreview from "../../../assets/previews/remove_bg_demo.png";
// @ts-ignore
import cropResizePreview from "../../../assets/previews/crop_resize_demo.png";
// @ts-ignore
import colorFillPreview from "../../../assets/previews/color_fill_demo.png";

const PREVIEW_DATA = {
  remove_bg_basic: {
    title: "Remove Background",
    desc: "Instantly cut out subjects and remove messy backgrounds with AI-powered precision. Perfect for product shots and portraits.",
    image: removeBgPreview,
    icon: Sparkles,
    color: "var(--brand)",
    gradient: "var(--brand)"
  },
  crop_resize: {
    title: "Crop & Resize",
    desc: "Automatically crop away empty space and center your subject perfectly. Great for e-commerce and social media.",
    image: cropResizePreview,
    icon: Crop,
    color: "var(--brand)",
    gradient: "var(--brand)"
  },
  color_background_fill: {
    title: "Color Background Fill",
    desc: "Drop your isolated subject onto any solid color or vibrant gradient to match your brand style effortlessly.",
    image: colorFillPreview,
    icon: Palette,
    color: "var(--brand)",
    gradient: "var(--brand)"
  },
  hd_export: {
    title: "HD Export",
    desc: "Export your images in stunning high-definition resolution without losing any fine details.",
    image: removeBgPreview, // Placeholder
    icon: FileOutput,
    color: "var(--brand)",
    gradient: "var(--brand)"
  },
  ai_background: {
    title: "AI Background",
    desc: "Generate hyper-realistic AI backgrounds tailored perfectly to your subject's lighting and perspective.",
    image: removeBgPreview, // Placeholder
    icon: Layers,
    color: "var(--brand)",
    gradient: "var(--brand)"
  },
  ai_shadows: {
    title: "AI Shadows",
    desc: "Add realistic, physically accurate drop shadows that ground your subject and create depth.",
    image: removeBgPreview, // Placeholder
    icon: Sun,
    color: "var(--brand)",
    gradient: "var(--brand)"
  },
  ai_relighting: {
    title: "AI Relighting",
    desc: "Magically change the lighting and mood of your photo to match your new background perfectly.",
    image: removeBgPreview, // Placeholder
    icon: Lightbulb,
    color: "var(--brand)",
    gradient: "var(--brand)"
  },
  ai_upscale: {
    title: "AI Upscale",
    desc: "Enhance and upscale low-resolution images up to 4x their original size with crystal clear quality.",
    image: removeBgPreview, // Placeholder
    icon: ZoomIn,
    color: "var(--brand)",
    gradient: "var(--brand)"
  },
  ai_image_gen: {
    title: "AI Image Generation",
    desc: "Describe what you want to see, and our AI will generate beautiful, high-quality images from your text.",
    image: removeBgPreview, // Placeholder
    icon: Wand2,
    color: "var(--brand)",
    gradient: "var(--brand)"
  },
  ai_logo_maker: {
    title: "AI Logo Maker",
    desc: "Generate professional logos and brand marks instantly using our advanced AI logo generator.",
    image: removeBgPreview, // Placeholder
    icon: PenTool,
    color: "var(--brand)",
    gradient: "var(--brand)"
  }
};

export function FeaturePreviewModal() {
  const dispatch = useAppDispatch();
  const modalState = useAppSelector(s => s.ui.modal);
  
  const featureId = modalState.featureId as keyof typeof PREVIEW_DATA;
  const data = PREVIEW_DATA[featureId];

  if (!data) return null;

  const Icon = data.icon || ImageIcon;

  return (
    <AnimatePresence>
      <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => dispatch(closeModal())}>
        <motion.div className="modal" initial={{ scale: .93, y: 8 }} animate={{ scale: 1, y: 0 }}
          onClick={e => e.stopPropagation()} style={{ maxWidth: 360, overflow: "hidden", padding: 0 }}>
          
          {/* Top visual banner */}
          <div style={{
            height: 60,
            background: data.gradient,
            position: "relative",
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            color: "white"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Icon size={16} />
              </div>
              <span style={{ fontWeight: 800, fontSize: 14 }}>{data.title}</span>
            </div>
            
            <button className="modal-close" onClick={() => dispatch(closeModal())} style={{ 
              position: "absolute", 
              top: 18, 
              right: 18, 
              color: "rgba(255, 255, 255, 0.75)",
              background: "rgba(255, 255, 255, 0.15)",
              borderRadius: "50%",
              width: 24,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}><X size={14} /></button>
          </div>

          <div className="modal-body" style={{ padding: "16px 20px", gap: "16px", textAlign: "left" }}>
            
            {/* Preview Image */}
            <div style={{
              width: "100%",
              borderRadius: 8,
              border: "1px solid var(--c-border)",
              overflow: "hidden",
              background: "var(--c-bg-2)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center"
            }}>
              <img src={data.image} alt={`${data.title} Preview`} style={{ width: "100%", height: "auto", display: "block" }} />
            </div>

            <div style={{ fontSize: 12, color: "var(--c-text-2)", lineHeight: 1.5 }}>
              {data.desc}
            </div>

            <button className="btn btn-primary btn-block" onClick={() => dispatch(closeModal())} style={{
              height: 40,
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              background: data.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8
            }}>
              Close Preview
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
