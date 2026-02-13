
-- Create updated_at function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create blog_posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  category TEXT,
  image_url TEXT,
  read_time TEXT,
  author TEXT DEFAULT 'Equipe BarberSoft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read blog posts"
ON public.blog_posts FOR SELECT USING (true);

CREATE POLICY "Super admin can insert blog posts"
ON public.blog_posts FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY "Super admin can update blog posts"
ON public.blog_posts FOR UPDATE USING (is_super_admin());

CREATE POLICY "Super admin can delete blog posts"
ON public.blog_posts FOR DELETE USING (is_super_admin());

CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public) VALUES ('blog-images', 'blog-images', true);

CREATE POLICY "Blog images are publicly accessible"
ON storage.objects FOR SELECT USING (bucket_id = 'blog-images');

CREATE POLICY "Super admin can upload blog images"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'blog-images' AND is_super_admin());

CREATE POLICY "Super admin can update blog images"
ON storage.objects FOR UPDATE USING (bucket_id = 'blog-images' AND is_super_admin());

CREATE POLICY "Super admin can delete blog images"
ON storage.objects FOR DELETE USING (bucket_id = 'blog-images' AND is_super_admin());
