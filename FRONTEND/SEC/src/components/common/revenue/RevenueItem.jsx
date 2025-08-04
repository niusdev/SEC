import { ScanEye, Pencil, Trash } from "lucide-react";

export default function RevenueItem({ receita, onEdit, onDelete, onView }) {
  const perfilUsuario = JSON.parse(localStorage.getItem("user"))?.perfil || "";

  // Só sênior pode deletar, juniors não podem
  const podeDeletar = perfilUsuario === "SUPERVISOR_SENIOR";

  return (
    <div className="bg-gray-200 p-4 rounded-lg shadow-md mb-4 flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold">{receita.nome}</h3>
        <div className="mt-1 border rounded px-2 py-1 text-sm bg-white inline-block">
          <strong>Rendimento:</strong> {receita.rendimento} porções &nbsp;&nbsp;
          <strong>Custo de Produção (R$):</strong> {receita.custo_producao}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button 
          className="flex gap-2 items-center justify-center hover:cursor-pointer bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
          onClick={onView}
        >
          Ver mais detalhes
          <ScanEye size={18} />
        </button>
        <div className="flex flex-1 gap-2">
          <button
            className="flex gap-2 items-center justify-center hover:cursor-pointer bg-green-700 hover:bg-green-800 text-white px-3 py-1 rounded"
            onClick={onEdit}
          >
            Editar
            <Pencil size={18} />
          </button>
          <button
            className={`flex gap-2 items-center justify-center text-white px-3 py-1 rounded ${
              podeDeletar
                ? "bg-red-500 hover:bg-red-600 cursor-pointer"
                : "bg-red-300 cursor-not-allowed opacity-60"
            }`}
            onClick={podeDeletar ? onDelete : undefined}
            disabled={!podeDeletar}
            title={podeDeletar ? "Deletar receita" : "Apenas supervisores seniors podem deletar"}
          >
            Deletar
            <Trash size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
