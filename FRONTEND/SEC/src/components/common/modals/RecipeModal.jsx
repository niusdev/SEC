import { useState, useEffect } from "react";
import IngredientSelectorModal from "./IngredientSelectorModal";

export default function RecipeModal({ isOpen, onClose, ingredientesDisponiveis, onSave }) {
  const [nome, setNome] = useState("");
  const [rendimento, setRendimento] = useState("");
  const [ingredientesSelecionados, setIngredientesSelecionados] = useState([]);
  const [custoProducao, setCustoProducao] = useState("0.00");
  const [modoPreparo, setModoPreparo] = useState("");
  const [mostrarModoPreparo, setMostrarModoPreparo] = useState(false);
  const [showIngredientesModal, setShowIngredientesModal] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setNome("");
      setRendimento("");
      setIngredientesSelecionados([]);
      setCustoProducao("0.00");
      setModoPreparo("");
      setMostrarModoPreparo(false);
      setErrors({});
    }
  }, [isOpen]);

  useEffect(() => {
    const total = ingredientesSelecionados.reduce((soma, ingrediente) => {
      const preco = parseFloat(ingrediente.preco || 0);
      const quantidade = parseFloat(ingrediente.quantidade || 0);
      return soma + preco * quantidade;
    }, 0);
    setCustoProducao(total.toFixed(2));
  }, [ingredientesSelecionados]);

  const validate = () => {
    const newErrors = {};
    if (!nome.trim()) {
      newErrors.nome = "O nome da receita é obrigatório.";
    }
    if (!rendimento || rendimento <= 0) {
      newErrors.rendimento = "O rendimento deve ser maior que zero.";
    }
    if (ingredientesSelecionados.length === 0) {
      newErrors.ingredientes = "A receita deve ter pelo menos um ingrediente.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    onSave({
      nome,
      rendimento,
      ingredientes: ingredientesSelecionados,
      custo_producao: parseFloat(custoProducao),
      modo_preparo: modoPreparo,
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white rounded-2xl p-6 w-[400px] max-h-[95vh] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">Cadastrar Receita:</h2>

          {/* Nome */}
          <label className="block mb-1 font-semibold">Nome:</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Insira o nome da receita"
            className={`w-full p-2 border rounded mb-2 focus:outline-none focus:ring-2
              ${errors.nome ? "border-red-500 focus:ring-red-500" : nome ? "border-green-600 focus:ring-green-600" : "border-gray-300"}
            `}
          />
          {errors.nome && <p className="text-red-500 text-xs mb-2">{errors.nome}</p>}

          {/* Rendimento */}
          <label className="block mb-1 font-semibold">Rendimento (porções):</label>
          <input
            type="number"
            value={rendimento}
            onChange={(e) => setRendimento(e.target.value)}
            placeholder="ex: 2"
            min={1}
            className={`w-full p-2 border rounded mb-2 focus:outline-none focus:ring-2
              ${errors.rendimento
                ? "border-red-500 focus:ring-red-500"
                : rendimento && rendimento > 0
                ? "border-green-600 focus:ring-green-600"
                : "border-gray-300"}
            `}
          />
          {errors.rendimento && <p className="text-red-500 text-xs mb-2">{errors.rendimento}</p>}

          {/* Ingredientes */}
          <label className="block mb-1 font-semibold">Ingredientes:</label>
          <button
            onClick={() => setShowIngredientesModal(true)}
            className={`px-3 py-1 rounded text-sm mb-2
              ${ingredientesSelecionados.length > 0 ? "bg-green-600 hover:bg-green-700" : "bg-gray-400"}
              text-white
            `}
          >
            EDITAR LISTA
          </button>
          {errors.ingredientes && (
            <p className="text-red-500 text-xs mb-2">{errors.ingredientes}</p>
          )}

          {/* Custo de produção */}
          <label className="block mb-1 font-semibold">Custo de produção (R$):</label>
          <input
            type="text"
            value={custoProducao}
            disabled
            className="w-full p-2 border rounded mb-3 bg-gray-100 border-gray-300"
          />

          {/* Toggle modo de preparo */}
          <p
            className="underline text-sm cursor-pointer mb-3 text-blue-600 hover:text-blue-800"
            onClick={() => setMostrarModoPreparo(!mostrarModoPreparo)}
          >
            {mostrarModoPreparo ? "Ocultar modo de preparo" : "Modo de preparo"}
          </p>

          {/* Modo de preparo */}
          {mostrarModoPreparo && (
            <textarea
              value={modoPreparo}
              onChange={(e) => setModoPreparo(e.target.value)}
              placeholder="Descreva o modo de preparo da receita (opcional)..."
              className="w-full p-2 border rounded mb-3 bg-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-green-600"
              rows={6}
            />
          )}

          {/* Botões */}
          <div className="flex justify-between">
            <button
              className="bg-orange-400 text-white px-4 py-2 rounded hover:bg-orange-500"
              onClick={onClose}
            >
              VOLTAR
            </button>
            <button
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              onClick={handleSubmit}
            >
              CADASTRAR
            </button>
          </div>
        </div>
      </div>

      <IngredientSelectorModal
        isOpen={showIngredientesModal}
        onClose={() => setShowIngredientesModal(false)}
        ingredientesDisponiveis={ingredientesDisponiveis}
        selecionados={ingredientesSelecionados}
        onUpdate={(resultado) => setIngredientesSelecionados(resultado)}
      />
    </>
  );
}
