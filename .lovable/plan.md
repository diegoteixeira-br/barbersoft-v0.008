

# Margem de Lucro nos Produtos

## O que muda para voce
- No formulario de cadastro/edicao de produto, um campo automatico mostrara a **porcentagem de lucro** calculada em tempo real com base no preco de custo e preco de venda
- Na tabela de produtos, uma nova coluna **"Margem"** exibira a porcentagem de lucro de cada produto com cores indicativas (verde para boa margem, amarelo para margem baixa, vermelho para prejuizo)

## Como vai funcionar
1. Ao preencher o preco de custo e o preco de venda no formulario, a margem de lucro aparece automaticamente abaixo dos campos de preco
2. Formula: `((preco_venda - preco_custo) / preco_custo) * 100`
3. Na tabela de produtos, a coluna "Margem" fica entre "Venda" e "Estoque"
4. Cores: verde (acima de 30%), amarelo (10-30%), vermelho (abaixo de 10% ou negativo)

---

## Detalhes Tecnicos

### Arquivos alterados

**1. `src/components/financeiro/ProductFormModal.tsx`**
- Adicionar um campo somente-leitura abaixo dos inputs de preco de custo e venda
- Usar `form.watch("cost_price")` e `form.watch("sale_price")` para calcular a margem em tempo real
- Exibir: "Margem de Lucro: 50%" com cor condicional
- Se custo for 0, mostrar "N/A" (evitar divisao por zero)

**2. `src/components/financeiro/ProductsTable.tsx`**
- Adicionar nova coluna "Margem" no header entre "Venda" e "Estoque"
- Calcular `((sale_price - cost_price) / cost_price) * 100` para cada produto
- Exibir com Badge colorido:
  - Verde: margem >= 30%
  - Amarelo: margem entre 10% e 30%
  - Vermelho: margem < 10%
- Se cost_price for 0, mostrar "-"

### Nenhuma alteracao no banco de dados
- A margem e calculada em tempo real, nao precisa de nova coluna no banco

