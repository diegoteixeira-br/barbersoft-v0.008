import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { InstitutionalLayout } from '@/layouts/InstitutionalLayout';
import { SEOHead } from '@/components/seo/SEOHead';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { blogPosts as staticPosts, categories } from '@/data/blogPosts';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UnifiedPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  image: string;
  date: string;
  readTime: string;
}

const Blog = () => {
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  const { data: dbPosts = [] } = useQuery({
    queryKey: ['public-blog-posts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('blog_posts' as any)
        .select('*')
        .order('created_at', { ascending: false });
      return (data || []) as any[];
    },
  });

  // Merge static + DB posts, DB posts first
  const allPosts: UnifiedPost[] = [
    ...dbPosts.map((p: any) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt || '',
      category: p.category || 'Tecnologia',
      image: p.image_url || '/placeholder.svg',
      date: format(new Date(p.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR }),
      readTime: p.read_time || '5 min',
    })),
    ...staticPosts.map(p => ({
      id: String(p.id),
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      category: p.category,
      image: p.image,
      date: p.date,
      readTime: p.readTime,
    })),
  ];

  const filteredPosts = selectedCategory === 'Todos'
    ? allPosts
    : allPosts.filter(post => post.category === selectedCategory);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Blog BarberSoft',
    description: 'Dicas, novidades e tendências para gestão de barbearias',
    publisher: {
      '@type': 'Organization',
      name: 'BarberSoft'
    }
  };

  return (
    <InstitutionalLayout breadcrumbs={[{ label: 'Blog' }]}>
      <SEOHead
        title="Blog"
        description="Dicas de gestão, marketing digital, tendências de cortes e novidades sobre tecnologia para barbearias. Conteúdo exclusivo para donos de barbearias."
        canonical="/blog"
        schema={schema}
      />

      <article>
        <header className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Blog BarberSoft</h1>
          <p className="text-xl text-muted-foreground">
            Dicas, novidades e tendências para transformar sua barbearia em um negócio de sucesso.
          </p>
        </header>

        <section className="mb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge 
                key={category} 
                variant={category === selectedCategory ? 'default' : 'secondary'}
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </section>

        <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredPosts.map((post) => (
            <Link key={post.id} to={`/blog/${post.slug}`}>
              <Card className="group cursor-pointer hover:shadow-lg transition-shadow h-full">
                <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
                  <img 
                    src={post.image} 
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{post.category}</Badge>
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {post.excerpt}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {post.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {post.readTime}
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>

        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum artigo encontrado nesta categoria.</p>
          </div>
        )}

        <section className="text-center bg-muted p-8 rounded-xl">
          <h2 className="text-2xl font-bold mb-4">Quer receber conteúdo exclusivo?</h2>
          <p className="text-muted-foreground mb-6">
            Inscreva-se na nossa newsletter e receba dicas semanais para sua barbearia.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input 
              type="email" 
              placeholder="Seu melhor e-mail"
              className="flex-1 px-4 py-2 rounded-lg border bg-background"
            />
            <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              Inscrever
            </button>
          </div>
        </section>
      </article>
    </InstitutionalLayout>
  );
};

export default Blog;
