import JSZip from "jszip";

export async function exportBatchAsZip(
  items: Array<{ name: string; bytes: Uint8Array; format: string }>
): Promise<void> {
  const zip = new JSZip();

  items.forEach((item, index) => {
    const ext = item.format.toLowerCase() === "jpeg" ? "jpg" : item.format.toLowerCase();
    const cleanName = item.name.replace(/\.[^/.]+$/, "").replace(/[/\\?%*:|"<>]/g, "-").trim() || `image_${index + 1}`;
    zip.file(`${cleanName}.${ext}`, item.bytes);
  });

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `removebg_batch_${Date.now()}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
