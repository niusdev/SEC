import { Eye, Pencil, Trash2 } from "lucide-react";

export default function OrderItem({
  id = "d35R4TT89-T7_g",
  date = "00/00/0000",
  clientName = "nome do cliente",
  total = 100.0,
  status = "PENDENTE",
  onViewDetails,
  onEdit,
  onDelete,
  onChangeStatus,

  disableEdit = false,
  disableDelete = false,
  disableStatusChange = false,
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded bg-gray-100 shadow-sm border border-gray-200 mb-4 gap-4">
      {/* Esquerda */}
      <div className="flex items-center justify-between w-full ">
        <div className="text-sm">
          <strong className="block text-black">{id}</strong>
          <span className="text-gray-500">Pedido realizado em: {date}</span>
        </div>

        <div className="text-sm px-4 py-2 border border-gray-300 rounded bg-white">
          <p>
            Cliente: <strong>{clientName}</strong>
          </p>
          <p>
            Valor total: <strong>R$ {total.toFixed(2)}</strong>
          </p>
        </div>

        <div className="text-sm px-4 py-2 border border-gray-300 rounded bg-white">
          <label className="text-gray-600 block mb-1">Status:</label>
          <select
            value={status}
            onChange={(e) => {
              if (!disableStatusChange) onChangeStatus?.(e.target.value);
            }}
            disabled={disableStatusChange}
            className={`font-bold px-2 py-1 rounded text-white ${
              status === "PENDENTE"
                ? "bg-red-500"
                : status === "CONCLUÍDO"
                ? "bg-green-500"
                : "bg-gray-400"
            } ${disableStatusChange ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <option value="PENDENTE">PENDENTE</option>
            <option value="CONCLUÍDO">CONCLUÍDO</option>
            <option value="CANCELADO">CANCELADO</option>
          </select>
        </div>
      </div>

      {/* Ações */}
      <div className="flex flex-col gap-2">
        <button
          onClick={onViewDetails}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded flex items-center gap-1"
        >
          <Eye size={16} />
          Ver mais detalhes
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!disableEdit) onEdit?.();
            }}
            disabled={disableEdit}
            className={`bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded flex items-center gap-1 ${
              disableEdit ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <Pencil size={16} />
            Editar
          </button>

          <button
            onClick={() => {
              if (!disableDelete) onDelete?.();
            }}
            disabled={disableDelete}
            className={`bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded flex items-center gap-1 ${
              disableDelete ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <Trash2 size={16} />
            Deletar
          </button>
        </div>
      </div>
    </div>
  );
}
