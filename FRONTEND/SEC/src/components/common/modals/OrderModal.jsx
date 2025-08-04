  import { useEffect, useState } from "react";
  import { useForm, Controller } from "react-hook-form";
  import { Minus, Plus, Trash2 } from "lucide-react";
  import RecipeSelectorModal from "./RecipeSelectorModal";
  import PhoneField from "../PhoneField";

  export default function OrderModal({ isOpen, onClose, receitasDisponiveis, onSave }) {
    const {
      register,
      control,
      handleSubmit,
      setValue,
      reset,
      formState: { errors },
    } = useForm({
      defaultValues: {
        nomeCliente: "",
        telefoneCliente: "",
        dataPedido: "",
        status: "PENDENTE",
        itens: [],
      },
    });

    const [modalReceitaAberto, setModalReceitaAberto] = useState(false);
    const [itens, setItens] = useState([]);
    

    // Atualiza campo "itens" do react-hook-form sempre que o estado mudar
    useEffect(() => {
      setValue("itens", itens);
    }, [itens, setValue]);

    // Reseta formulário ao abrir o modal
    useEffect(() => {
      if (isOpen) {
        reset({
          nomeCliente: "",
          telefoneCliente: "",
          dataPedido: "",
          status: "PENDENTE",
          itens: [],
        });
        setItens([]);
      }
    }, [isOpen, reset]);

    const valorTotal = itens.reduce((acc, item) => {
      const receita = receitasDisponiveis.find((r) => r.id === item.id);
      return acc + (receita?.custo_producao || 0) * item.quantidade;
    }, 0).toFixed(2);

    const onSubmit = (data) => {
      if (itens.length === 0) {
        alert("Adicione ao menos uma receita.");
        return;
      }

      const pedido = {
        nome_cliente: data.nomeCliente,
        telefone: data.telefoneCliente,
        dataPedido: data.dataPedido,
        status: data.status,
        valorTotal: parseFloat(valorTotal),
        receitas: itens,
      };

      onSave(pedido);
      onClose();
    };

    const handleChangeQuantidade = (index, delta) => {
      setItens((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, quantidade: Math.max(1, item.quantidade + delta) } : item
        )
      );
    };

    const handleRemoveItem = (index) => {
      setItens((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUpdateReceitas = (selecionadasComQuantidade) => {
      const novosItens = selecionadasComQuantidade.map(({ id, quantidade }) => ({ id, quantidade }));
      setItens(novosItens);
      setModalReceitaAberto(false);
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white p-6 rounded-xl w-full max-w-[550px] max-h-[95vh] overflow-y-auto"
        >
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold">Cadastrar Pedido:</h2>
            <select
              {...register("status")}
              className="bg-red-500 text-white px-2 py-1 rounded"
            >
              <option value="PENDENTE">PENDENTE</option>
              <option value="CONCLUÍDO">CONCLUÍDO</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-3">
            {/* Nome do cliente */}
            <div>
              <label className="block font-semibold">Cliente:</label>
              <input
                {...register("nomeCliente", { required: "Informe o nome do cliente." })}
                className={`w-full border p-2 rounded ${
                  errors.nomeCliente ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.nomeCliente && (
                <p className="text-red-500 text-xs">{errors.nomeCliente.message}</p>
              )}
            </div>

            {/* Data */}
            <div>
              <label className="block font-semibold">Data:</label>
              <input
                type="date"
                {...register("dataPedido", { required: "Informe a data." })}
                className={`w-full border p-2 rounded ${
                  errors.dataPedido ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.dataPedido && (
                <p className="text-red-500 text-xs">{errors.dataPedido.message}</p>
              )}
            </div>

            {/* Telefone */}
            <div>
              <label className="block font-semibold">Telefone:</label>
              <PhoneField
                control={control}
                name="telefoneCliente"
                setValue={setValue}
                errorMessage={errors.telefoneCliente?.message}
              />
            </div>

            {/* Valor total */}
            <div>
              <label className="block font-semibold">Valor:</label>
              <input
                value={`R$ ${valorTotal}`}
                disabled
                className="w-full border p-2 rounded bg-gray-100"
                readOnly
              />
            </div>
          </div>

          {/* ITENS */}
          <div className="mb-3">
            <strong className="block mb-2">ITENS:</strong>
            <button
              type="button"
              onClick={() => setModalReceitaAberto(true)}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm mb-2"
            >
              Selecionar receita +
            </button>
            {itens.length === 0 && (
              <p className="text-red-500 text-xs">Adicione ao menos uma receita.</p>
            )}

            <div className="space-y-2">
              {itens.map((item, index) => {
                const receita = receitasDisponiveis.find((r) => r.id === item.id);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <span className="font-semibold">{receita?.nome}</span>
                    <div className="flex items-center gap-2">
                      <span>Qtd:</span>
                      <button
                        type="button"
                        onClick={() => handleChangeQuantidade(index, -1)}
                        className="bg-red-400 text-white px-2 rounded"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        value={item.quantidade}
                        readOnly
                        className="w-10 text-center border rounded"
                      />
                      <button
                        type="button"
                        onClick={() => handleChangeQuantidade(index, 1)}
                        className="bg-green-500 text-white px-2 rounded"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-orange-400 text-white px-4 py-2 rounded hover:bg-orange-500"
            >
              VOLTAR
            </button>
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              CADASTRAR
            </button>
          </div>

          <RecipeSelectorModal
            isOpen={modalReceitaAberto}
            onClose={() => setModalReceitaAberto(false)}
            receitasDisponiveis={receitasDisponiveis}
            selecionadas={itens.map(({ id, quantidade }) => ({ id, quantidade }))}
            onUpdate={handleUpdateReceitas}
          />
        </form>
      </div>
    );
  }
