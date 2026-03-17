"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  BarChart3,
  ChevronDown,
  Eraser,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Redo2,
  Smile,
  Table2,
  Underline,
  Undo2,
  Video,
  Minus,
  FileText,
  Code2,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  downloadFormat?: "html" | "word" | "pdf";
  onDownloadFormatChange?: (format: "html" | "word" | "pdf") => void;
  onDownload?: () => void;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  downloadFormat,
  onDownloadFormatChange,
  onDownload,
}: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activePanel, setActivePanel] = useState<"link" | "gif" | "embed" | "table" | "chart" | null>(null);
  const [activeMenu, setActiveMenu] = useState<"archivo" | "editar" | "insertar" | "formato" | "herramientas" | null>(null);
  const [panelInput, setPanelInput] = useState("");
  const [panelError, setPanelError] = useState<string | null>(null);
  const [tableRows, setTableRows] = useState("2");
  const [tableCols, setTableCols] = useState("2");
  const [chartTitle, setChartTitle] = useState("Grafica");
  const [chartDataInput, setChartDataInput] = useState("Enero:30\nFebrero:45\nMarzo:25");
  const [isFocused, setIsFocused] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadType, setUploadType] = useState<"image" | "video" | "document">("image");
  const supabase = createClient();

  const emojiList = ["😀", "😁", "😂", "😊", "😍", "😎", "🤝", "🚀", "🔥", "🎉", "✅", "🌍", "💡", "📢", "📈", "💼", "🔗", "⚡", "🧊", "🌱"];
  const toolButtonClass = "p-2 rounded-md hover:bg-black/5 text-slate-700 transition-colors";
  const menuButtonClass = "inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm text-slate-700 hover:bg-black/5";
  const dividerClass = "w-px h-6 bg-slate-300";

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const updateValue = () => {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
  };

  const runCommand = (command: string, valueArg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, valueArg);
    updateValue();
  };

  const insertHtml = (html: string) => {
    runCommand("insertHTML", html);
  };

  const sanitizePastedHtml = (rawHtml: string): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, "text/html");

    doc.querySelectorAll("script, style, link, meta").forEach((node) => node.remove());

    doc.querySelectorAll("*").forEach((node) => {
      const element = node as HTMLElement;

      // Remove all on* event handler attributes (XSS prevention)
      Array.from(element.attributes).forEach((attr) => {
        if (attr.name.toLowerCase().startsWith("on")) {
          element.removeAttribute(attr.name);
        }
      });

      if (element.hasAttribute("style")) {
        const cleaned = (element.getAttribute("style") || "")
          .split(";")
          .map((rule) => rule.trim())
          .filter(Boolean)
          .filter((rule) => {
            const lower = rule.toLowerCase();
            return !(lower.startsWith("color:") || lower.startsWith("background:") || lower.startsWith("background-color:") || lower.startsWith("font-family:"));
          })
          .join("; ");

        if (cleaned) {
          element.setAttribute("style", cleaned);
        } else {
          element.removeAttribute("style");
        }
      }

      if (element.tagName === "IMG") {
        const img = element as HTMLImageElement;
        const dataSrc = img.getAttribute("data-src") || img.getAttribute("data-original") || "";
        const srcset = img.getAttribute("srcset") || "";

        if (!img.getAttribute("src") && dataSrc) {
          img.setAttribute("src", dataSrc);
        }

        if (!img.getAttribute("src") && srcset) {
          const firstSrc = srcset.split(",")[0]?.trim().split(" ")[0];
          if (firstSrc) img.setAttribute("src", firstSrc);
        }

        const src = img.getAttribute("src") || "";
        if (src.startsWith("//")) {
          img.setAttribute("src", `https:${src}`);
        }

        img.setAttribute("loading", "lazy");
        img.setAttribute("referrerpolicy", "no-referrer");
        img.style.maxWidth = "100%";
        img.style.height = "auto";
      }

      if (element.tagName === "A") {
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noopener noreferrer");
      }
    });

    return doc.body.innerHTML;
  };

  const normalizeAbsoluteImageUrl = (rawSrc: string, baseUrl?: string): string | null => {
    const src = (rawSrc || "").trim();
    if (!src) return null;

    if (src.startsWith("data:") || src.startsWith("blob:")) {
      return src;
    }

    try {
      if (src.startsWith("//")) {
        return new URL(`https:${src}`).toString();
      }

      if (src.startsWith("http://") || src.startsWith("https://")) {
        return new URL(src).toString();
      }

      if (baseUrl) {
        return new URL(src, baseUrl).toString();
      }
    } catch {
      return null;
    }

    return null;
  };

  const uploadRemoteImageToStorage = async (sourceUrl: string): Promise<string | null> => {
    const normalized = normalizeHttpUrl(sourceUrl);
    if (!normalized) return null;

    try {
      const response = await fetch(`/api/fetch-remote-image?url=${encodeURIComponent(normalized)}`);
      if (!response.ok) return null;

      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) return null;

      const extension = blob.type.split("/")[1] || "jpg";
      const file = new File([blob], `remote-image.${extension}`, { type: blob.type });
      return await uploadToSupabase(file);
    } catch {
      return null;
    }
  };

  const localizePastedImages = async (sanitizedHtml: string, sourcePageUrl?: string): Promise<string> => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitizedHtml, "text/html");
    const images = Array.from(doc.querySelectorAll("img"));

    const baseFromHtml =
      doc.querySelector("base")?.getAttribute("href") ||
      doc.querySelector("link[rel='canonical']")?.getAttribute("href") ||
      doc.querySelector("meta[property='og:url']")?.getAttribute("content") ||
      sourcePageUrl ||
      undefined;

    for (const img of images) {
      const srcset = img.getAttribute("srcset") || "";
      const firstSrcsetUrl = srcset.split(",")[0]?.trim().split(" ")[0] || "";
      const candidate = img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("data-original") || firstSrcsetUrl || "";
      const resolved = normalizeAbsoluteImageUrl(candidate, baseFromHtml);
      if (!resolved) continue;

      if (!resolved.startsWith("http://") && !resolved.startsWith("https://")) {
        continue;
      }

      img.setAttribute("src", resolved);
      img.removeAttribute("srcset");

      const localUrl = await uploadRemoteImageToStorage(resolved);
      if (localUrl) {
        img.setAttribute("src", localUrl);
      }
    }

    return doc.body.innerHTML;
  };

  const normalizeHttpUrl = (input: string): string | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.toString();
      }
      return null;
    } catch {
      return null;
    }
  };

  const extractIframeSrc = (input: string): string | null => {
    const iframeMatch = input.match(/<iframe[^>]*\ssrc=["']([^"']+)["'][^>]*>/i);
    if (iframeMatch?.[1]) {
      return normalizeHttpUrl(iframeMatch[1]);
    }
    return normalizeHttpUrl(input);
  };

  const openPanel = (panel: "link" | "gif" | "embed" | "table" | "chart") => {
    setActivePanel(panel);
    setActiveMenu(null);
    setPanelInput("");
    setPanelError(null);
    setShowEmojiPicker(false);
    if (panel === "chart") {
      setChartTitle("Grafica");
      setChartDataInput("Enero:30\nFebrero:45\nMarzo:25");
    }
  };

  const closePanel = () => {
    setActivePanel(null);
    setPanelInput("");
    setPanelError(null);
  };

  const applyPanelAction = () => {
    if (!activePanel) return;

    if (activePanel === "table") {
      const rows = Number.parseInt(tableRows, 10);
      const cols = Number.parseInt(tableCols, 10);
      if (!Number.isFinite(rows) || !Number.isFinite(cols) || rows < 1 || cols < 1 || rows > 10 || cols > 10) {
        setPanelError("La tabla debe tener entre 1 y 10 filas/columnas.");
        return;
      }

      let html = "<table style=\"width:100%;border-collapse:collapse;margin:16px 0;\"><tbody>";
      for (let r = 0; r < rows; r += 1) {
        html += "<tr>";
        for (let c = 0; c < cols; c += 1) {
          html += "<td style=\"border:1px solid #cbd5e1;padding:8px;\">&nbsp;</td>";
        }
        html += "</tr>";
      }
      html += "</tbody></table><p><br/></p>";
      insertHtml(html);
      closePanel();
      return;
    }

    if (activePanel === "chart") {
      const parsed = chartDataInput
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [rawLabel, rawValue] = line.split(":");
          return { label: (rawLabel || "").trim(), value: Number.parseFloat((rawValue || "").trim()) };
        })
        .filter((item) => item.label && Number.isFinite(item.value) && item.value >= 0);

      if (parsed.length < 2) {
        setPanelError("Ingresa al menos 2 lineas con formato Etiqueta:Valor.");
        return;
      }

      const maxValue = Math.max(...parsed.map((item) => item.value), 1);
      const barGap = 14;
      const barWidth = 56;
      const chartHeight = 180;
      const chartWidth = parsed.length * (barWidth + barGap) + 40;

      const bars = parsed
        .map((item, idx) => {
          const h = Math.max(4, Math.round((item.value / maxValue) * chartHeight));
          const x = 20 + idx * (barWidth + barGap);
          const y = chartHeight - h + 10;
          const valueTextY = y - 8;
          const labelY = chartHeight + 30;
          return `
            <g>
              <rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="8" fill="#0ea5e9"></rect>
              <text x="${x + barWidth / 2}" y="${valueTextY}" text-anchor="middle" font-size="12" fill="#334155">${item.value}</text>
              <text x="${x + barWidth / 2}" y="${labelY}" text-anchor="middle" font-size="12" fill="#475569">${item.label}</text>
            </g>
          `;
        })
        .join("");

      const svg = `
        <figure style="margin:16px 0;padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
          <figcaption style="font-weight:600;color:#0f172a;margin-bottom:8px;">${chartTitle || "Grafica"}</figcaption>
          <svg viewBox="0 0 ${chartWidth} ${chartHeight + 44}" width="100%" role="img" aria-label="${chartTitle || "Grafica"}">
            <line x1="10" y1="${chartHeight + 10}" x2="${chartWidth - 10}" y2="${chartHeight + 10}" stroke="#94a3b8" stroke-width="1" />
            ${bars}
          </svg>
        </figure>
        <p><br/></p>
      `;

      insertHtml(svg);
      closePanel();
      return;
    }

    const inputValue = panelInput.trim();
    if (!inputValue) {
      setPanelError("Ingresa un valor valido.");
      return;
    }

    if (activePanel === "link") {
      const url = normalizeHttpUrl(inputValue);
      if (!url) {
        setPanelError("Ingresa una URL valida (http/https).");
        return;
      }
      runCommand("createLink", url);
      closePanel();
      return;
    }

    if (activePanel === "gif") {
      const url = normalizeHttpUrl(inputValue);
      if (!url) {
        setPanelError("Ingresa una URL valida de imagen o GIF.");
        return;
      }
      insertHtml(`<img src=\"${url}\" alt=\"gif\" style=\"max-width:100%;border-radius:8px;margin:16px 0;\" /><p><br/></p>`);
      closePanel();
      return;
    }

    const src = extractIframeSrc(inputValue);
    if (!src) {
      setPanelError("No se detecto un iframe o URL valida para embed.");
      return;
    }
    insertHtml(`<iframe src=\"${src}\" style=\"width:100%;min-height:420px;border:0;border-radius:12px;margin:16px 0;\" loading=\"lazy\" allowfullscreen=\"true\" title=\"Publicacion embebida\"></iframe><p><br/></p>`);
    closePanel();
  };

  const uploadToSupabase = async (file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).slice(2)}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("news_media")
      .upload(fileName, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from("news_media").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const triggerUpload = (type: "image" | "video" | "document") => {
    setUploadType(type);
    if (!fileInputRef.current) return;

    if (type === "image") fileInputRef.current.accept = "image/*";
    if (type === "video") fileInputRef.current.accept = "video/*";
    if (type === "document") fileInputRef.current.accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt";
    fileInputRef.current.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const publicUrl = await uploadToSupabase(file);
      if (uploadType === "image") {
        insertHtml(`<img src=\"${publicUrl}\" alt=\"${file.name}\" style=\"max-width:100%;border-radius:8px;margin:16px 0;\" /><p><br/></p>`);
      } else if (uploadType === "video") {
        insertHtml(`<video controls src=\"${publicUrl}\" style=\"max-width:100%;border-radius:8px;margin:16px 0;\"></video><p><br/></p>`);
      } else {
        insertHtml(`<a href=\"${publicUrl}\" target=\"_blank\" rel=\"noopener noreferrer\">${file.name}</a><p><br/></p>`);
      }
    } catch (error) {
      console.error("Error al subir archivo:", error);
      setPanelError("No se pudo subir el archivo.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const clipboardItems = Array.from(e.clipboardData.items || []);
    const pastedImageItem = clipboardItems.find((item) => item.type.startsWith("image/"));

    if (pastedImageItem) {
      e.preventDefault();
      const pastedFile = pastedImageItem.getAsFile();
      if (!pastedFile) return;

      setIsUploading(true);
      try {
        const publicUrl = await uploadToSupabase(pastedFile);
        insertHtml(`<img src="${publicUrl}" alt="Imagen pegada" style="max-width:100%;border-radius:8px;margin:16px 0;" /><p><br/></p>`);
      } catch (error) {
        console.error("Error al pegar imagen:", error);
        setPanelError("No se pudo subir la imagen pegada.");
      } finally {
        setIsUploading(false);
      }
      return;
    }

    const htmlData = e.clipboardData.getData("text/html");
    if (htmlData) {
      e.preventDefault();
      setIsUploading(true);
      try {
        const sourcePageUrlRaw = e.clipboardData.getData("text/uri-list") || "";
        const sourcePageUrl = normalizeHttpUrl(sourcePageUrlRaw) || undefined;
        const cleanedHtml = sanitizePastedHtml(htmlData);
        const htmlWithLocalizedImages = await localizePastedImages(cleanedHtml, sourcePageUrl);
        if (htmlWithLocalizedImages.trim()) {
          insertHtml(htmlWithLocalizedImages);
        }
      } finally {
        setIsUploading(false);
      }
      return;
    }

    const plainText = e.clipboardData.getData("text/plain");
    if (plainText) {
      e.preventDefault();
      runCommand("insertText", plainText);
    }
  };

  const handleMenuAction = (
    action:
      | "nuevo"
      | "deshacer"
      | "rehacer"
      | "copiar"
      | "cortar"
      | "pegar"
      | "h1"
      | "h2"
      | "h3"
      | "parrafo"
      | "quote"
      | "codigo"
      | "enlace"
      | "gif"
      | "embed"
      | "tabla"
      | "grafica"
      | "imagen"
      | "video"
      | "documento"
        | "descargar"
      | "limpiar",
  ) => {
    switch (action) {
      case "nuevo":
        if (editorRef.current) {
          editorRef.current.innerHTML = "";
          updateValue();
        }
        break;
      case "deshacer":
        runCommand("undo");
        break;
      case "rehacer":
        runCommand("redo");
        break;
      case "copiar":
        runCommand("copy");
        break;
      case "cortar":
        runCommand("cut");
        break;
      case "pegar":
        runCommand("paste");
        break;
      case "h1":
        runCommand("formatBlock", "H1");
        break;
      case "h2":
        runCommand("formatBlock", "H2");
        break;
      case "h3":
        runCommand("formatBlock", "H3");
        break;
      case "parrafo":
        runCommand("formatBlock", "P");
        break;
      case "quote":
        runCommand("formatBlock", "BLOCKQUOTE");
        break;
      case "codigo":
        runCommand("formatBlock", "PRE");
        break;
      case "enlace":
        openPanel("link");
        break;
      case "gif":
        openPanel("gif");
        break;
      case "embed":
        openPanel("embed");
        break;
      case "tabla":
        openPanel("table");
        break;
      case "grafica":
        openPanel("chart");
        break;
      case "imagen":
        triggerUpload("image");
        break;
      case "video":
        triggerUpload("video");
        break;
      case "documento":
        triggerUpload("document");
        break;
      case "descargar":
        onDownload?.();
        break;
      case "limpiar":
        runCommand("removeFormat");
        break;
    }
    setActiveMenu(null);
  };

  const menuConfig: Array<{
    key: "archivo" | "editar" | "insertar" | "formato" | "herramientas";
    label: string;
    items: Array<{ label: string; action: Parameters<typeof handleMenuAction>[0]; shortcut?: string }>;
  }> = [
    {
      key: "archivo",
      label: "Archivo",
      items: [
        { label: "Nuevo documento", action: "nuevo" },
        ...(onDownload ? [{ label: "Descargar", action: "descargar" as const }] : []),
      ],
    },
    {
      key: "editar",
      label: "Editar",
      items: [
        { label: "Deshacer", action: "deshacer", shortcut: "Ctrl+Z" },
        { label: "Rehacer", action: "rehacer", shortcut: "Ctrl+Y" },
        { label: "Copiar", action: "copiar", shortcut: "Ctrl+C" },
        { label: "Cortar", action: "cortar", shortcut: "Ctrl+X" },
        { label: "Pegar", action: "pegar", shortcut: "Ctrl+V" },
      ],
    },
    {
      key: "insertar",
      label: "Insertar",
      items: [
        { label: "Enlace", action: "enlace" },
        { label: "GIF por URL", action: "gif" },
        { label: "Embed", action: "embed" },
        { label: "Tabla", action: "tabla" },
        { label: "Grafica", action: "grafica" },
        { label: "Imagen", action: "imagen" },
        { label: "Video", action: "video" },
        { label: "Documento", action: "documento" },
      ],
    },
    {
      key: "formato",
      label: "Formato",
      items: [
        { label: "Parrafo", action: "parrafo" },
        { label: "Titulo 1", action: "h1" },
        { label: "Titulo 2", action: "h2" },
        { label: "Titulo 3", action: "h3" },
        { label: "Cita", action: "quote" },
        { label: "Codigo", action: "codigo" },
      ],
    },
    {
      key: "herramientas",
      label: "Herramientas",
      items: [{ label: "Limpiar formato", action: "limpiar" }],
    },
  ];

  return (
    <div ref={containerRef} className="rounded-xl border border-slate-300 overflow-hidden bg-white shadow-sm">
      <div className="border-b border-slate-300 bg-slate-50">
        <div className="relative flex flex-wrap items-center gap-1 p-2 border-b border-slate-200">
          {menuConfig.map((menu) => (
            <div key={menu.key} className="relative">
              <button
                type="button"
                className={`${menuButtonClass} ${activeMenu === menu.key ? "bg-black/10" : ""}`}
                onClick={() => setActiveMenu((current) => (current === menu.key ? null : menu.key))}
              >
                {menu.label}
                <ChevronDown size={14} />
              </button>
              {activeMenu === menu.key && (
                <div className="absolute z-30 mt-1 w-56 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                  {menu.items.map((item) => (
                    <button
                      key={`${menu.key}-${item.label}`}
                      type="button"
                      onClick={() => handleMenuAction(item.action)}
                      className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center justify-between"
                    >
                      <span>{item.label}</span>
                      {item.shortcut && <span className="text-xs text-slate-400">{item.shortcut}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1 p-2">
          <button type="button" onClick={() => runCommand("undo")} className={toolButtonClass} title="Deshacer"><Undo2 size={16} /></button>
          <button type="button" onClick={() => runCommand("redo")} className={toolButtonClass} title="Rehacer"><Redo2 size={16} /></button>
          <span className={dividerClass}></span>

          <select onChange={(e) => runCommand("formatBlock", e.target.value)} defaultValue="P" className="bg-white border border-slate-300 rounded px-2 py-1 text-sm text-slate-700">
              <option value="P">Parrafo</option>
              <option value="H1">Titulo 1</option>
              <option value="H2">Titulo 2</option>
              <option value="H3">Titulo 3</option>
              <option value="BLOCKQUOTE">Cita</option>
              <option value="PRE">Codigo</option>
            </select>
          <select onChange={(e) => runCommand("fontName", e.target.value)} defaultValue="Arial" className="bg-white border border-slate-300 rounded px-2 py-1 text-sm text-slate-700">
              <option value="Arial">Arial</option>
              <option value="Verdana">Verdana</option>
              <option value="Tahoma">Tahoma</option>
              <option value="Trebuchet MS">Trebuchet MS</option>
              <option value="Georgia">Georgia</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Garamond">Garamond</option>
              <option value="Palatino Linotype">Palatino</option>
              <option value="Courier New">Courier New</option>
              <option value="Lucida Console">Lucida Console</option>
            </select>
          <select onChange={(e) => runCommand("fontSize", e.target.value)} defaultValue="3" className="bg-white border border-slate-300 rounded px-2 py-1 text-sm text-slate-700">
              <option value="1">10px</option>
              <option value="2">13px</option>
              <option value="3">16px</option>
              <option value="4">18px</option>
              <option value="5">24px</option>
              <option value="6">32px</option>
              <option value="7">48px</option>
            </select>
          <span className={dividerClass}></span>

          <button type="button" onClick={() => runCommand("bold")} className={toolButtonClass} title="Negrita"><Bold size={16} /></button>
          <button type="button" onClick={() => runCommand("italic")} className={toolButtonClass} title="Cursiva"><Italic size={16} /></button>
          <button type="button" onClick={() => runCommand("underline")} className={toolButtonClass} title="Subrayado"><Underline size={16} /></button>
          <button type="button" onClick={() => runCommand("strikeThrough")} className={toolButtonClass} title="Tachado"><Minus size={16} /></button>
          <input type="color" onChange={(e) => runCommand("foreColor", e.target.value)} className="h-8 w-8 rounded border border-slate-300 bg-transparent" title="Color de texto" />
          <input type="color" onChange={(e) => runCommand("hiliteColor", e.target.value)} className="h-8 w-8 rounded border border-slate-300 bg-transparent" title="Color de fondo" />
          <span className={dividerClass}></span>

          <button type="button" onClick={() => runCommand("justifyLeft")} className={toolButtonClass} title="Alinear izquierda"><AlignLeft size={16} /></button>
          <button type="button" onClick={() => runCommand("justifyCenter")} className={toolButtonClass} title="Centrar"><AlignCenter size={16} /></button>
          <button type="button" onClick={() => runCommand("justifyRight")} className={toolButtonClass} title="Alinear derecha"><AlignRight size={16} /></button>
          <button type="button" onClick={() => runCommand("justifyFull")} className={toolButtonClass} title="Justificar"><AlignJustify size={16} /></button>
          <button type="button" onClick={() => runCommand("insertUnorderedList")} className={toolButtonClass} title="Lista con viñetas"><List size={16} /></button>
          <button type="button" onClick={() => runCommand("insertOrderedList")} className={toolButtonClass} title="Lista numerada"><ListOrdered size={16} /></button>
          <button type="button" onClick={() => runCommand("formatBlock", "BLOCKQUOTE")} className={toolButtonClass} title="Cita"><Quote size={16} /></button>
          <button type="button" onClick={() => runCommand("insertHorizontalRule")} className={toolButtonClass} title="Linea horizontal"><Minus size={16} /></button>
          <button type="button" onClick={() => runCommand("formatBlock", "PRE")} className={toolButtonClass} title="Bloque de codigo"><Code2 size={16} /></button>
          <button type="button" onClick={() => runCommand("removeFormat")} className={toolButtonClass} title="Quitar formato"><Eraser size={16} /></button>
          <span className={dividerClass}></span>

          <button type="button" onClick={() => openPanel("link")} className={toolButtonClass} title="Insertar enlace"><Link2 size={16} /></button>
          <button type="button" onClick={() => openPanel("gif")} className={toolButtonClass} title="Insertar GIF por URL"><ImageIcon size={16} /></button>
          <button type="button" onClick={() => openPanel("embed")} className={toolButtonClass} title="Insertar embed"><Code2 size={16} /></button>
          <button type="button" onClick={() => openPanel("table")} className={toolButtonClass} title="Insertar tabla"><Table2 size={16} /></button>
          <button type="button" onClick={() => openPanel("chart")} className={toolButtonClass} title="Insertar grafica"><BarChart3 size={16} /></button>

          <div className="relative">
            <button type="button" onClick={() => setShowEmojiPicker((prev) => !prev)} className={toolButtonClass} title="Emojis"><Smile size={16} /></button>
            {showEmojiPicker && (
              <div className="absolute z-20 mt-2 w-64 rounded-xl border border-slate-300 bg-white p-3 shadow-xl">
                <div className="grid grid-cols-5 gap-2">
                  {emojiList.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="text-xl rounded-md hover:bg-slate-100 p-1"
                      onClick={() => {
                        insertHtml(`${emoji} `);
                        setShowEmojiPicker(false);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <span className={dividerClass}></span>
          <button type="button" onClick={() => triggerUpload("image")} className={toolButtonClass} title="Subir imagen" disabled={isUploading}>
            {isUploading && uploadType === "image" ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
          </button>
          <button type="button" onClick={() => triggerUpload("video")} className={toolButtonClass} title="Subir video" disabled={isUploading}>
            {isUploading && uploadType === "video" ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
          </button>
          <button type="button" onClick={() => triggerUpload("document")} className={toolButtonClass} title="Subir documento" disabled={isUploading}>
            {isUploading && uploadType === "document" ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
          </button>

          {(onDownload || onDownloadFormatChange) && (
            <>
              <span className={dividerClass}></span>
              <div className="ml-auto flex items-center gap-2">
                {onDownloadFormatChange && (
                  <select
                    value={downloadFormat || "html"}
                    onChange={(e) => onDownloadFormatChange(e.target.value as "html" | "word" | "pdf")}
                    className="bg-white border border-slate-300 rounded px-2 py-1 text-sm text-slate-700"
                  >
                    <option value="html">HTML</option>
                    <option value="word">Word (.doc)</option>
                    <option value="pdf">PDF</option>
                  </select>
                )}
                {onDownload && (
                  <button
                    type="button"
                    onClick={onDownload}
                    className="px-3 py-1.5 rounded border border-slate-300 text-sm text-slate-700 hover:bg-slate-100"
                    title="Descargar documento"
                  >
                    Descargar
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />

      {activePanel && (
        <div className="border-b border-slate-200 bg-slate-50 p-3 flex flex-col gap-2 md:flex-row md:items-center">
          {activePanel === "table" ? (
            <>
              <input value={tableRows} onChange={(e) => setTableRows(e.target.value)} className="bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 w-full md:w-28" placeholder="Filas" />
              <input value={tableCols} onChange={(e) => setTableCols(e.target.value)} className="bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 w-full md:w-28" placeholder="Columnas" />
            </>
          ) : activePanel === "chart" ? (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                type="text"
                value={chartTitle}
                onChange={(e) => setChartTitle(e.target.value)}
                className="bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-700"
                placeholder="Titulo de la grafica"
              />
              <textarea
                value={chartDataInput}
                onChange={(e) => setChartDataInput(e.target.value)}
                className="md:col-span-2 bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 min-h-[92px]"
                placeholder="Formato por linea: Etiqueta:Valor"
              />
            </div>
          ) : (
            <input
              type="text"
              value={panelInput}
              onChange={(e) => setPanelInput(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-700"
              placeholder={
                activePanel === "link"
                  ? "https://ejemplo.com"
                  : activePanel === "gif"
                    ? "https://.../animacion.gif"
                    : "Pega iframe completo o URL de publicacion"
              }
            />
          )}
          <button type="button" onClick={applyPanelAction} className="px-3 py-2 rounded bg-[var(--accent-cyan)] text-black font-semibold text-sm">Aplicar</button>
          <button type="button" onClick={closePanel} className="px-3 py-2 rounded border border-slate-300 text-sm text-slate-700">Cancelar</button>
          {panelError && <p className="text-xs text-red-300">{panelError}</p>}
        </div>
      )}

      <div className="relative">
        {!value && !isFocused && (
          <div className="pointer-events-none absolute top-4 left-4 text-slate-400">{placeholder}</div>
        )}
        <div
          ref={editorRef}
          contentEditable
          onInput={updateValue}
          onPaste={handlePaste}
          onBlur={() => {
            setIsFocused(false);
            updateValue();
          }}
          onFocus={() => setIsFocused(true)}
          className="min-h-[520px] p-6 text-slate-800 focus:outline-none max-w-none leading-7"
        />
      </div>
    </div>
  );
}
