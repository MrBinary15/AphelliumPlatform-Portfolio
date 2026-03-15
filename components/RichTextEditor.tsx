"use client";

import { useRef, useState, useEffect } from "react";
import { Bold, Italic, Underline, Link2, Heading2, Heading3, Image as ImageIcon, Video, FileText, Loader2, List, ListOrdered } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadType, setUploadType] = useState<"image" | "video" | "document">("image");
  const supabase = createClient();

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      if (!value) {
        editorRef.current.innerHTML = "";
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, val: string | undefined = undefined) => {
    document.execCommand(command, false, val);
    if (editorRef.current) {
      editorRef.current.focus();
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleLink = () => {
    const url = prompt("Introduce el enlace (URL):");
    if (url) {
      execCommand("createLink", url);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('news_media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('news_media')
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      // Ensure editor has focus before inserting
      editorRef.current?.focus();
      
      if (uploadType === "image") {
        const imgHTML = `<img src="${publicUrl}" alt="${file.name}" style="max-width: 100%; border-radius: 0.5rem; margin-top: 1rem; margin-bottom: 1rem;" /><br/>`;
        execCommand("insertHTML", imgHTML);
      } else if (uploadType === "video") {
        const videoHTML = `<video controls style="max-width: 100%; border-radius: 0.5rem; margin-top: 1rem; margin-bottom: 1rem;" src="${publicUrl}"></video><br/>`;
        execCommand("insertHTML", videoHTML);
      } else {
        const linkHTML = `<a href="${publicUrl}" target="_blank" style="color: var(--accent-cyan); text-decoration: underline; word-break: break-all;">${file.name}</a><br/>`;
        execCommand("insertHTML", linkHTML);
      }
      
    } catch (err) {
      console.error("Error uploading media:", err);
      alert("Error al subir el archivo. Intenta de nuevo.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const triggerUpload = (type: "image" | "video" | "document") => {
    setUploadType(type);
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === "image" ? "image/*" : type === "video" ? "video/*" : ".pdf,.doc,.docx,.xls,.xlsx";
      fileInputRef.current.click();
    }
  };

  return (
    <div className="w-full bg-black/50 border border-white/10 rounded-xl overflow-hidden focus-within:border-[var(--accent-cyan)] transition-colors flex flex-col">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-white/10 bg-white/5">
        <button type="button" onClick={() => execCommand("bold")} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-white" title="Negrita">
          <Bold size={18} />
        </button>
        <button type="button" onClick={() => execCommand("italic")} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-white" title="Cursiva">
          <Italic size={18} />
        </button>
        <button type="button" onClick={() => execCommand("underline")} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-white" title="Subrayado">
          <Underline size={18} />
        </button>
        <div className="w-px h-6 bg-white/10 mx-1"></div>
        <button type="button" onClick={() => execCommand("formatBlock", "H2")} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-white" title="Título 2">
          <Heading2 size={18} />
        </button>
        <button type="button" onClick={() => execCommand("formatBlock", "H3")} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-white" title="Título 3">
          <Heading3 size={18} />
        </button>
        <div className="w-px h-6 bg-white/10 mx-1"></div>
        <button type="button" onClick={() => execCommand("insertUnorderedList")} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-white" title="Lista con viñetas">
          <List size={18} />
        </button>
        <button type="button" onClick={() => execCommand("insertOrderedList")} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-white" title="Lista numerada">
          <ListOrdered size={18} />
        </button>
        <button type="button" onClick={handleLink} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-white" title="Insertar Enlace">
          <Link2 size={18} />
        </button>
        <div className="w-px h-6 bg-white/10 mx-1"></div>
        <button type="button" onClick={() => triggerUpload("image")} disabled={isUploading} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-white disabled:opacity-50 flex items-center gap-1" title="Subir Imagen">
          {isUploading && uploadType === "image" ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
        </button>
        <button type="button" onClick={() => triggerUpload("video")} disabled={isUploading} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-white disabled:opacity-50 flex items-center gap-1" title="Subir Video">
          {isUploading && uploadType === "video" ? <Loader2 size={18} className="animate-spin" /> : <Video size={18} />}
        </button>
        <button type="button" onClick={() => triggerUpload("document")} disabled={isUploading} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-white disabled:opacity-50 flex items-center gap-1" title="Subir Documento">
          {isUploading && uploadType === "document" ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
        </button>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
        />
      </div>
      
      <div className="relative flex-1">
        {!value && (
          <div className="absolute top-4 left-4 text-gray-500 pointer-events-none">
            {placeholder}
          </div>
        )}
        <div 
          ref={editorRef}
          className="p-4 min-h-[300px] text-white focus:outline-none"
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          style={{ minHeight: "300px" }}
        />
      </div>
    </div>
  );
}
