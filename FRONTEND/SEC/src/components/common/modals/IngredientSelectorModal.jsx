import { useEffect, useState } from "react";
import { Minus, Plus, Trash2, Info, X } from "lucide-react";
import ListContainer from "../ListContainer";
import DetalhesRevenueModal from "./DetalhesRevenueModal";

export default function IngredientSelectorModal({
  isOpen,
  onClose,
  ingredientesDisponiveis,
  selecionados,
  onUpdate,
  receita = null,
}) {
  const [ingredientesSelecionados, setIngredientesSelecionados] = useState([]);
  const [quantidades, setQuantidades] = useState({});
  const [abrirDetalhes, setAbrirDetalhes] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIngredientesSelecionados(selecionados);
      const novaQtd = {};
      selecionados.forEach((i) => {
        novaQtd[i.id] = i.quantidade || 0;
      });
      setQuantidades(novaQtd);
    }
  }, [isOpen, selecionados]);

  const toggleIngrediente = (ingrediente) => {
    if (ingrediente.estoque === 0) return;

    const existe = ingredientesSelecionados.find((i) => i.id === ingrediente.id);
    if (existe) {
      setIngredientesSelecionados((prev) => prev.filter((i) => i.id !== ingrediente.id));
      setQuantidades((prev) => {
        const novo = { ...prev };
        delete novo[ingrediente.id];
        return novo;
      });
    } else {
      setIngredientesSelecionados((prev) => [...prev, ingrediente]);
      setQuantidades((prev) => ({ ...prev, [ingrediente.id]: 0 }));
    }
  };

  const ajustarQuantidade = (id, novaQtd) => {
    const valor = Math.max(Number(novaQtd), 0);
    setQuantidades((prev) => ({ ...prev, [id]: valor }));
  };

  const excluirIngrediente = (id) => {
    setIngredientesSelecionados((prev) => prev.filter((i) => i.id !== id));
    setQuantidades((prev) => {
      const novo = { ...prev };
      delete novo[id];
      return novo;
    });
  };

  const handleConfirmar = () => {
    const todosComQuantidade = ingredientesSelecionados.every(
      (ing) => quantidades[ing.id] > 0
    );

    if (!todosComQuantidade) {
      alert("Todos os ingredientes selecionados devem ter uma quantidade maior que 0.");
      return;
    }

    const resultado = ingredientesSelecionados.map((ingrediente) => ({
      ...ingrediente,
      quantidade: quantidades[ingrediente.id] || 0,
    }));

    onUpdate(resultado);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-white w-[520px] max-h-[90vh] rounded-xl p-6 shadow-lg relative flex flex-col">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-red-500"
            type="button"
          >
            <X size={20} />
          </button>

          <h2 className="text-xl font-bold mb-4">Lista de ingredientes da Receita</h2>

          <input
            type="text"
            placeholder="Buscar Ingrediente"
            className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
          />

          <ListContainer height="h-[250px]" className="mb-6">
            {ingredientesDisponiveis.map((ingrediente) => {
              const selecionado = ingredientesSelecionados.some((i) => i.id === ingrediente.id);
              const isDisabled = ingrediente.estoque === 0;

              return (
                <div
                  key={ingrediente.id}
                  className={`flex items-center justify-between border rounded px-3 py-2 mb-1 ${
                    isDisabled ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <label className="flex items-center gap-3 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={isDisabled}
                      checked={selecionado}
                      onChange={() => toggleIngrediente(ingrediente)}
                      className="cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{ingrediente.nome}</span>
                      <span className="text-gray-400 text-xs">
                        Estoque: {ingrediente.estoque}
                        {ingrediente.unidade} — R$ {Number(ingrediente.preco).toFixed(2)}
                      </span>
                    </div>
                  </label>

                  {selecionado && !isDisabled && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        className="w-16 p-1 border rounded text-center text-sm"
                        value={quantidades[ingrediente.id] || 0}
                        onChange={(e) => ajustarQuantidade(ingrediente.id, e.target.value)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </ListContainer>

          {ingredientesSelecionados.length > 0 && (
            <>
              <h3 className="text-sm font-bold mb-2">Ingredientes selecionados</h3>
              <ListContainer height="h-[180px]">
                {ingredientesSelecionados.map((ingrediente) => (
                  <div
                    key={ingrediente.id}
                    className="flex items-center justify-between border p-2 rounded mb-1"
                  >
                    <div>
                      <p className="font-medium">{ingrediente.nome}</p>
                      <p className="text-xs text-gray-500">
                        Qtd: {quantidades[ingrediente.id] || 0} {ingrediente.unidade} — Preço unitário: R${" "}
                        {Number(ingrediente.preco).toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={() => excluirIngrediente(ingrediente.id)}
                      className="text-red-500 hover:text-red-700"
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </ListContainer>
            </>
          )}

          <div className="flex justify-between mt-auto pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
              type="button"
            >
              VOLTAR
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => setAbrirDetalhes(true)}
                className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                type="button"
                disabled={!ingredientesSelecionados.length}
              >
                <Info size={16} />
                Detalhes
              </button>
              <button
                onClick={handleConfirmar}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                type="button"
              >
                CONCLUIR
              </button>
            </div>
          </div>
        </div>
      </div>

      <DetalhesRevenueModal
        isOpen={abrirDetalhes}
        onClose={() => setAbrirDetalhes(false)}
        receita={{
          ...receita,
          ingredientes: ingredientesSelecionados.map((ingrediente) => ({
            ...ingrediente,
            quantidade: quantidades[ingrediente.id] || 0,
          })),
        }}
      />
    </>
  );
}
