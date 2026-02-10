

# Pagamento Dividido (Split Payment)

## O que muda para voce
Ao finalizar um atendimento, voce podera dividir o pagamento em 2 formas diferentes, com valores livres. Exemplos:
- R$ 20 em dinheiro + R$ 45 no PIX = R$ 65
- R$ 30 no debito + R$ 35 no credito = R$ 65
- Qualquer combinacao, desde que a soma bata com o total

## Como vai funcionar na tela
1. O modal de pagamento atual continua igual para pagamento com 1 metodo
2. Um botao "Dividir Pagamento" aparece abaixo dos metodos
3. Ao ativar, aparecem 2 linhas:
   - Linha 1: escolha do metodo + campo para digitar o valor (ex: Dinheiro - R$ 20,00)
   - Linha 2: escolha do metodo + valor restante calculado automaticamente (ex: PIX - R$ 45,00)
   - Voce pode editar qualquer um dos valores livremente
4. Validacao: os dois valores precisam ser maiores que zero e a soma deve ser igual ao total
5. Na tabela de transacoes, aparecerao 2 etiquetas lado a lado mostrando cada forma e valor

## Restricoes
- Cortesia e fidelidade nao podem ser divididos
- Os dois metodos devem ser diferentes entre si

---

## Detalhes Tecnicos

### Armazenamento
Sem mudanca no banco de dados. O campo `payment_method` (string) armazena o formato:
- Pagamento simples: `"pix"`
- Pagamento dividido: `"cash:20.00|pix:45.00"`

### Arquivos alterados

**1. `src/components/financeiro/PaymentMethodModal.tsx`**
- Adicionar toggle "Dividir Pagamento"
- Estados: `isSplit`, `splitMethod1`, `splitMethod2`, `splitAmount1`, `splitAmount2`
- Dois seletores de metodo + dois campos Input (type number, step 0.01)
- Ao digitar valor no campo 1, campo 2 calcula `total - valor1` automaticamente (editavel)
- Validacao: soma == total, ambos > 0, metodos diferentes
- `onConfirm` envia `"method1:amount1|method2:amount2"` quando split ativo

**2. `src/components/financeiro/PaymentMethodModal.tsx` (PaymentBadge)**
- Detectar `|` na string para identificar split
- Renderizar 2 badges com metodo + valor formatado

**3. `src/components/financeiro/CashFlowTab.tsx`**
- Atualizar calculo de `paymentBreakdown` para parsear formato split e distribuir valores corretamente entre os metodos

**4. `src/components/financeiro/TransactionsTable.tsx`**
- Nenhuma mudanca estrutural -- ja usa PaymentBadge

**5. `src/components/financeiro/CommissionReportTab.tsx`**
- Atualizar agrupamento por metodo para parsear formato split

