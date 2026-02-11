
# Salvar Audio da Demo e Atualizar Conteudo

## Problema
1. Cada vez que alguem abre a demo, o ElevenLabs gera o audio novamente, queimando tokens da API
2. O conteudo da demo precisa refletir corretamente o sistema

## Solucao

### 1. Cache permanente do audio no Supabase Storage

Criar um bucket `demo-audio` no Supabase Storage e uma edge function `generate-demo-audio` que:
- Recebe o indice do slide e o texto
- Verifica se o audio ja existe no bucket `demo-audio` (ex: `slide-0.mp3`, `slide-1.mp3`, etc.)
- Se existir, retorna a URL publica do arquivo
- Se nao existir, gera o audio via ElevenLabs, salva no bucket, e retorna a URL

Assim, o audio e gerado **apenas uma vez** e fica salvo para sempre. Todos os visitantes ouvem o mesmo audio ja salvo.

### 2. Atualizar o DemoTourModal

**Logica de audio** (`DemoTourModal.tsx`):
- Trocar a chamada direta ao `elevenlabs-tts` pela nova edge function `generate-demo-audio`
- A resposta sera um JSON com `{ audioUrl: "https://..." }` - a URL publica do Supabase Storage
- Manter o cache em memoria (Map) para nao buscar a URL novamente na mesma sessao
- Remover a funcao `preloadAllAudio` que fazia 7 chamadas paralelas ao ElevenLabs

**Conteudo dos slides** - Atualizar os textos de narracao (`narrationTexts`) e os CTAs para alinhar com a realidade:
- Trocar "Comecar Teste Gratis" no CTA final por "Conheca os Planos" com scroll para #precos
- Ajustar textos conforme necessario para descrever o sistema corretamente

### 3. Migracao de banco - Bucket de Storage

Criar migracao SQL para:
- Criar bucket `demo-audio` como publico
- Politica de SELECT publica (qualquer um pode ouvir)
- Politica de INSERT/UPDATE apenas para service_role (so a edge function salva)

## Detalhes Tecnicos

### Nova Edge Function: `supabase/functions/generate-demo-audio/index.ts`
- Recebe `{ slideIndex: number, text: string }`
- Verifica se `demo-audio/slide-{slideIndex}.mp3` existe no Storage
- Se sim: retorna `{ audioUrl: publicUrl }`
- Se nao: chama ElevenLabs API, faz upload do buffer para Storage, retorna URL publica
- Usa `SUPABASE_SERVICE_ROLE_KEY` para acessar o Storage

### Alteracoes no `DemoTourModal.tsx`
- `playNarration`: busca audio da nova edge function (que retorna URL do Storage)
- Remove `preloadAllAudio` (nao precisa mais - audio ja esta salvo)
- Pode fazer preload via `new Audio(url).preload = "auto"` nas URLs ja conhecidas
- CTA final: trocar href="/auth" por scroll para #precos

### Migracao SQL
```text
- INSERT INTO storage.buckets (id, name, public) VALUES ('demo-audio', 'demo-audio', true)
- Politica SELECT para anon (leitura publica)
- Politica INSERT/UPDATE para service_role
```
