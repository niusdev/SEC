import { useEffect, useState } from "react";
import { NumericFormat } from "react-number-format";

export default function ProdutoModal({ isOpen, onClose, onSubmit, initialData, modoSomenteQuantidade = false }) {
  const [formData, setFormData] = useState({
    nome: "",
    unidade: "G",
    pesoVolume: "",
    perecivel: false,
    validade: "",
    nivelMinimo: "",
    precoCusto: "",
    quantidade: "",
    categoria: "INGREDIENTE",
  });

  const [errors, setErrors] = useState({});

  const perfil = JSON.parse(localStorage.getItem("user"))?.perfil || "FUNCIONARIO_COMUM";
  const somenteEditarQuantidade = perfil === "FUNCIONARIO_COMUM";

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        nome: "",
        unidade: "G",
        pesoVolume: "",
        perecivel: false,
        validade: "",
        nivelMinimo: "",
        precoCusto: "",
        quantidade: "",
        categoria: "INGREDIENTE",
      });
    }
  }, [initialData, isOpen]);

  const validate = () => {
    const newErrors = {};

    if (!formData.nome.trim() && !somenteEditarQuantidade)
      newErrors.nome = "Nome é obrigatório.";
    if (
      (formData.pesoVolume === "" || isNaN(Number(formData.pesoVolume))) &&
      !somenteEditarQuantidade
    )
      newErrors.pesoVolume = "Peso/Volume inválido.";
    if (formData.perecivel && !formData.validade && !somenteEditarQuantidade)
      newErrors.validade = "Validade é obrigatória.";
    if (
      (formData.nivelMinimo === "" || isNaN(Number(formData.nivelMinimo))) &&
      !somenteEditarQuantidade
    )
      newErrors.nivelMinimo = "Nível mínimo inválido.";
    if (
      (formData.precoCusto === "" || isNaN(Number(formData.precoCusto))) &&
      !somenteEditarQuantidade
    )
      newErrors.precoCusto = "Preço de custo inválido.";
    if (formData.quantidade === "" || isNaN(Number(formData.quantidade)))
      newErrors.quantidade = "Quantidade inválida.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    setFormData({
      ...formData,
      [name]: newValue,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit(formData);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      unidade: "G",
      pesoVolume: "",
      perecivel: false,
      validade: "",
      nivelMinimo: "",
      precoCusto: "",
      quantidade: "",
      categoria: "INGREDIENTE",
    });
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-center items-center">
      <div className="bg-white p-6 rounded shadow-md w-[90%] max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {initialData ? "Editar Produto" : "Cadastrar Produto"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3 text-sm text-black">
          {/* Nome */}
          <div>
            <label>Nome:</label>
            <input
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              disabled={modoSomenteQuantidade}
              placeholder="Insira o nome do produto"
              className="w-full px-3 py-1.5 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
            />
            {errors.nome && <p className="text-red-500 text-xs">{errors.nome}</p>}
          </div>

          {/* Unidade */}
          <div>
            <label>Unidade:</label>
            <select
              name="unidade"
              value={formData.unidade}
              onChange={handleChange}
              disabled={modoSomenteQuantidade}
              className="w-full px-3 py-1.5 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
            >
              <option value="G">Gramas (G)</option>
              <option value="KG">Quilogramas (KG)</option>
              <option value="ML">Mililitros (ML)</option>
              <option value="L">Litros (L)</option>
              <option value="UN">Unidade (UN)</option>
            </select>
          </div>

          {/* Peso / Volume */}
          <div>
            <label>Peso / Volume:</label>
            <input
              name="pesoVolume"
              value={formData.pesoVolume}
              onChange={handleChange}
              disabled={modoSomenteQuantidade}
              placeholder="Ex: 100, 0.5, 200"
              className="w-full px-3 py-1.5 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
            />
            {errors.pesoVolume && <p className="text-red-500 text-xs">{errors.pesoVolume}</p>}
          </div>

          {/* Perecível */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="perecivel"
              checked={formData.perecivel}
              onChange={handleChange}
              disabled={modoSomenteQuantidade}
              className="focus:ring-green-600 disabled:opacity-50"
            />
            <label>Perecível?</label>
          </div>

          {/* Validade */}
          {formData.perecivel && (
            <div>
              <label>Validade:</label>
              <input
                type="date"
                name="validade"
                value={formData.validade}
                onChange={handleChange}
                disabled={modoSomenteQuantidade}
                className="w-full px-3 py-1.5 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
              />
              {errors.validade && (
                <p className="text-red-500 text-xs">{errors.validade}</p>
              )}
            </div>
          )}

          {/* Nível Mínimo */}
          <div>
            <label>Nível Mínimo:</label>
            <input
              name="nivelMinimo"
              value={formData.nivelMinimo}
              onChange={handleChange}
              disabled={modoSomenteQuantidade}
              placeholder="Ex: 10"
              className="w-full px-3 py-1.5 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
            />
            {errors.nivelMinimo && (
              <p className="text-red-500 text-xs">{errors.nivelMinimo}</p>
            )}
          </div>

          {/* Preço de Custo */}
          <div>
            <label>Preço de Custo (R$):</label>
            <NumericFormat
              name="precoCusto"
              value={formData.precoCusto}
              onValueChange={({ floatValue }) =>
                !somenteEditarQuantidade &&
                setFormData({ ...formData, precoCusto: floatValue || "" })
              }
              placeholder="Ex: R$ 5,99"
              thousandSeparator="."
              decimalSeparator=","
              prefix="R$ "
              allowNegative={false}
              disabled={modoSomenteQuantidade}
              className="w-full px-3 py-1.5 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
            />
            {errors.precoCusto && (
              <p className="text-red-500 text-xs">{errors.precoCusto}</p>
            )}
          </div>

          {/* Quantidade */}
          <div>
            <label>Quantidade:</label>
            <input
              name="quantidade"
              value={formData.quantidade}
              onChange={handleChange}
              placeholder="Ex: 100"
              className="w-full px-3 py-1.5 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600"
              autoFocus={modoSomenteQuantidade}
            />
            {errors.quantidade && (
              <p className="text-red-500 text-xs">{errors.quantidade}</p>
            )}
          </div>

          {/* Categoria */}
          <div>
            <label>Categoria:</label>
            <select
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              disabled={modoSomenteQuantidade}
              className="w-full px-3 py-1.5 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
            >
              <option value="INGREDIENTE">Ingrediente</option>
              <option value="PRODUTO_FINAL">Produto Final</option>
              <option value="OUTRO">Outro</option>
            </select>
          </div>

          {/* Botões */}
          <div className="flex gap-4 justify-between pt-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="w-1/2 hover:cursor-pointer bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
            >
              VOLTAR
            </button>
            <button
              type="submit"
              className="w-1/2 hover:cursor-pointer bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              {initialData ? "SALVAR" : "CADASTRAR"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
