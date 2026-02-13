import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Palette, Loader2, Eye, Edit3, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import type { BlogPost } from "@/hooks/useBlogPosts";

const CATEGORIES = ["Gestão", "Tecnologia", "Marketing", "Tendências", "Financeiro"];

interface BlogPostFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: BlogPost | null;
  onSave: (post: any) => void;
  isSaving: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function BlogPostFormModal({ open, onOpenChange, post, onSave, isSaving }: BlogPostFormModalProps) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [readTime, setReadTime] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [content, setContent] = useState("");
  const [generatingContent, setGeneratingContent] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [suggestingTitle, setSuggestingTitle] = useState(false);

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setSlug(post.slug);
      setCategory(post.category || "");
      setExcerpt(post.excerpt || "");
      setReadTime(post.read_time || "");
      setImageUrl(post.image_url || "");
      setContent(post.content || "");
    } else {
      setTitle("");
      setSlug("");
      setCategory("");
      setExcerpt("");
      setReadTime("");
      setImageUrl("");
      setContent("");
    }
  }, [post, open]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!post) setSlug(slugify(value));
  };

  const handleSuggestTitle = async () => {
    setSuggestingTitle(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-blog-title", {
        body: { category: category || null },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      const suggested = data.title || "";
      setTitle(suggested);
      if (!post) setSlug(slugify(suggested));
      toast.success("Título sugerido com sucesso!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao sugerir título");
    } finally {
      setSuggestingTitle(false);
    }
  };

  const handleGenerateContent = async () => {
    if (!title.trim()) {
      toast.error("Digite um título antes de gerar o conteúdo.");
      return;
    }
    setGeneratingContent(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-blog-content", {
        body: { title },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setContent(data.content || "");
      setExcerpt(data.excerpt || "");
      setReadTime(data.read_time || "5 min");
      toast.success("Conteúdo gerado com sucesso!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar conteúdo");
    } finally {
      setGeneratingContent(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!title.trim()) {
      toast.error("Digite um título antes de gerar a imagem.");
      return;
    }
    setGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-blog-image", {
        body: { title },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setImageUrl(data.image_url || "");
      toast.success("Imagem gerada com sucesso!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar imagem");
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSubmit = () => {
    if (!title.trim() || !slug.trim()) {
      toast.error("Título e slug são obrigatórios.");
      return;
    }
    onSave({
      ...(post ? { id: post.id } : {}),
      title,
      slug,
      category,
      excerpt,
      read_time: readTime,
      image_url: imageUrl,
      content,
      author: "Equipe BarberSoft",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {post ? "Editar Artigo" : "Novo Artigo"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Title + AI buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Título</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSuggestTitle}
                disabled={suggestingTitle}
                className="text-xs gap-1"
              >
                {suggestingTitle ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Lightbulb className="h-3 w-3" />
                )}
                💡 Sugerir Título
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Ex: Como Aumentar o Faturamento da Sua Barbearia"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateContent}
                disabled={generatingContent || !title.trim()}
                className="shrink-0"
              >
                {generatingContent ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Gerar Artigo com IA
              </Button>
            </div>
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label>Slug (URL)</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="como-aumentar-faturamento-barbearia"
            />
          </div>

          {/* Category + Read Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tempo de leitura</Label>
              <Input
                value={readTime}
                onChange={(e) => setReadTime(e.target.value)}
                placeholder="5 min"
              />
            </div>
          </div>

          {/* Excerpt */}
          <div className="space-y-2">
            <Label>Resumo (Excerpt)</Label>
            <Textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Breve resumo do artigo..."
              rows={2}
            />
          </div>

          {/* Image URL + AI button */}
          <div className="space-y-2">
            <Label>Imagem de Capa</Label>
            <div className="flex gap-2">
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="URL da imagem de capa"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateImage}
                disabled={generatingImage || !title.trim()}
                className="shrink-0"
              >
                {generatingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Palette className="h-4 w-4 mr-2" />
                )}
                Gerar Capa com IA
              </Button>
            </div>
            {imageUrl && (
              <div className="mt-2 rounded-lg overflow-hidden border max-h-48">
                <img src={imageUrl} alt="Preview" className="w-full h-48 object-cover" />
              </div>
            )}
          </div>

          {/* Content with Markdown editor/preview */}
          <div className="space-y-2">
            <Label>Conteúdo (Markdown)</Label>
            <Tabs defaultValue="edit" className="w-full">
              <TabsList className="mb-2">
                <TabsTrigger value="edit" className="gap-1">
                  <Edit3 className="h-3 w-3" /> Editar
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-1">
                  <Eye className="h-3 w-3" /> Preview
                </TabsTrigger>
              </TabsList>
              <TabsContent value="edit">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escreva o conteúdo em Markdown..."
                  rows={16}
                  className="font-mono text-sm"
                />
              </TabsContent>
              <TabsContent value="preview">
                <div className="border rounded-lg p-4 min-h-[300px] max-h-[500px] overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
                  {content ? (
                    <ReactMarkdown>{content}</ReactMarkdown>
                  ) : (
                    <p className="text-muted-foreground">Nenhum conteúdo para pré-visualizar.</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {post ? "Salvar Alterações" : "Publicar Artigo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
