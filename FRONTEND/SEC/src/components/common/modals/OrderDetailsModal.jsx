import { Info } from "lucide-react";

export default function OrderDetailsModal({ isOpen, onClose, order, receitasDisponiveis }) {
  if (!isOpen || !order) return null;

  // Para cada receita do pedido, pega o objeto receita completo para exibir detalhes
  const receitasDoPedido = order.receitas?.map(({ receitaId, quantidade }) => {
    const receita = receitasDisponiveis.find(r => r.id === receitaId);
    return { ...receita, quantidade };
  }) || [];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-[90%] max-w-lg border border-gray-200 max-h-[80vh] overflow-y-auto">
        
        <div className="flex items-center gap-2 mb-4">
          <Info className="text-blue-600" size={24} />
          <h2 className="text-2xl font-semibold text-gray-800">Detalhes do Pedido</h2>
        </div>

        {/* Dados do pedido */}
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 mb-6">
          <div>
            <p className="font-medium text-gray-500">Cliente</p>
            <p>{order.nome_cliente}</p>
          </div>
          <div>
            <p className="font-medium text-gray-500">Telefone</p>
            <p>{order.telefone || "-"}</p>
          </div>
          <div>
            <p className="font-medium text-gray-500">Data do Pedido</p>
            <p>{order.dataPedido}</p>
          </div>
          <div>
            <p className="font-medium text-gray-500">Status</p>
            <p>{order.status}</p>
          </div>
          <div className="col-span-2">
            <p className="font-medium text-gray-500">Valor Total</p>
            <p>R$ {order.valorTotal?.toFixed(2)}</p>
          </div>
        </div>

        {/* Lista de receitas */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Receitas no Pedido</h3>
          {receitasDoPedido.length > 0 ? (
            <ul className="max-h-60 overflow-y-auto divide-y divide-gray-200 border rounded p-2">
              {receitasDoPedido.map((r) => (
                <li key={r.id} className="py-2">
                  <p className="font-semibold text-gray-800">
                    {r.nome} — Quantidade: {r.quantidade}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    Custo Produção: R$ {r.custo_producao?.toFixed(2)}
                  </p>
                  {/* Ingredientes */}
                  {r.ingredientes && r.ingredientes.length > 0 && (
                    <div className="mb-1">
                      <p className="font-medium text-gray-600">Ingredientes:</p>
                      <ul className="list-disc list-inside text-gray-700 text-sm max-h-24 overflow-y-auto">
                        {r.ingredientes.map((ing) => (
                          <li key={ing.id}>
                            {ing.nome} — {ing.quantidade} {ing.unidade}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Modo de preparo */}
                  {r.modo_preparo && (
                    <div>
                      <p className="font-medium text-gray-600">Modo de preparo:</p>
                      <p className="whitespace-pre-line text-gray-700 text-sm">{r.modo_preparo}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">Nenhuma receita adicionada a este pedido.</p>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            type="button"
            className="px-5 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
