
# Aceite de Termo via Email com Botao de Aceitacao

## Resumo
Adicionar um botao "Aceitar Termo" no email enviado ao profissional, que leva a uma pagina publica onde ele pode ler e aceitar o termo digitalmente. O aceite fica registrado no "Ver Aceites" e controla se o profissional pode ter agenda ativa.

## Mudancas necessarias

### 1. Banco de dados - Nova coluna `term_token` na tabela `barbers`
- Adicionar coluna `term_token UUID` na tabela barbers para gerar links unicos de aceite
- Criar uma RPC `accept_barber_term` que:
  - Recebe o token
  - Busca o barber pelo token
  - Insere o registro em `term_acceptances`
  - Limpa o token apos uso
- Criar uma RPC `get_barber_by_term_token` para buscar dados do barber pelo token (acesso publico/anon)
- Adicionar policy de SELECT publico na `partnership_terms` para termos ativos (necessario para a pagina publica)

### 2. Edge Function `send-barber-term` - Adicionar botao de aceite no email
- Gerar um UUID `term_token` e salvar no barber antes de enviar
- Incluir no HTML do email um botao grande e destacado "Aceitar Termo" com link para `/termo-profissional/{token}`
- Manter o conteudo do termo no email para leitura previa

### 3. Nova pagina publica `BarberTermAcceptance.tsx`
- Rota: `/termo-profissional/:token`
- Fluxo similar ao `InfluencerTermAcceptance.tsx`:
  - Carrega dados do barber via RPC `get_barber_by_term_token`
  - Busca o termo ativo da empresa
  - Exibe o termo completo com scroll obrigatorio
  - Checkbox de concordancia + botao "Assinar Digitalmente"
  - Tela de confirmacao apos aceite
- Se ja aceitou, mostra mensagem de "Termo ja aceito"

### 4. Controle de ativacao do profissional
- No `BarberCard.tsx`: se houver termo ativo e o profissional nao aceitou, o switch de ativo/inativo fica bloqueado (desabilitado) com tooltip explicando que precisa aceitar o termo primeiro
- Na `Agenda`: barbers sem aceite do termo ativo nao aparecem como opcao para agendamento (filtro no `useBarbers` ou no componente de agenda)

### 5. Rota no App.tsx
- Registrar `/termo-profissional/:token` como rota publica

## Detalhes tecnicos

**RPC `get_barber_by_term_token`:**
```sql
CREATE OR REPLACE FUNCTION get_barber_by_term_token(p_token UUID)
RETURNS JSON AS $$
  SELECT json_build_object(
    'id', b.id, 'name', b.name, 'email', b.email,
    'commission_rate', b.commission_rate,
    'company_id', b.company_id,
    'unit_name', u.name
  )
  FROM barbers b
  JOIN units u ON u.id = b.unit_id
  WHERE b.term_token = p_token
$$ LANGUAGE sql SECURITY DEFINER;
```

**RPC `accept_barber_term`:**
```sql
CREATE OR REPLACE FUNCTION accept_barber_term(
  p_token UUID, p_term_id UUID, p_content_snapshot TEXT,
  p_commission_rate INT, p_ip TEXT DEFAULT NULL, p_user_agent TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE v_barber_id UUID;
BEGIN
  SELECT id INTO v_barber_id FROM barbers WHERE term_token = p_token;
  IF v_barber_id IS NULL THEN RETURN FALSE; END IF;

  INSERT INTO term_acceptances (barber_id, term_id, user_id, content_snapshot, 
    commission_rate_snapshot, ip_address, user_agent)
  VALUES (v_barber_id, p_term_id, '00000000-0000-0000-0000-000000000000',
    p_content_snapshot, p_commission_rate, p_ip, p_user_agent);

  UPDATE barbers SET term_token = NULL WHERE id = v_barber_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Botao no email (HTML):**
```html
<a href="{siteUrl}/termo-profissional/{token}" 
   style="display:inline-block; background:#FF6B00; color:white; 
   padding:16px 32px; border-radius:8px; text-decoration:none; 
   font-weight:bold; font-size:16px;">
  Aceitar Termo de Parceria
</a>
```

**Bloqueio de agenda:** No `BarberCard`, desabilitar o Switch quando `hasActiveTerm && !termAcceptance` com tooltip "Aceite do termo pendente".

## Arquivos a criar/modificar
- **Criar**: `src/pages/BarberTermAcceptance.tsx`
- **Criar**: Migration SQL (RPCs + coluna term_token)
- **Modificar**: `supabase/functions/send-barber-term/index.ts`
- **Modificar**: `src/App.tsx` (nova rota publica)
- **Modificar**: `src/components/barbers/BarberCard.tsx` (bloqueio do switch)
- **Modificar**: `src/integrations/supabase/types.ts` (tipagem)
