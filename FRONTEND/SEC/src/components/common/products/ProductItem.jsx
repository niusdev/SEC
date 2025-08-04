  import { ScanEye, SquarePen, Trash } from "lucide-react";
  import ListItem from "../../common/ListItem";

  export default function ProductItem({ product, onEdit, onDelete, onDetails }) {
    const pesoTotal = (product.unidades * product.pesoPorUnidade).toFixed(1);

    // Obter perfil do usuário
    const perfil = JSON.parse(localStorage.getItem("user"))?.perfil || "FUNCIONARIO_COMUM";

    const podeExcluir = perfil === "SUPERVISOR_SENIOR";

    return (
      <ListItem
        actions={
          <div className="flex flex-col gap-2">
            {/* Botão de detalhes - sempre visível */}
            <div>
              <button
                className="flex w-full justify-center gap-1 items-center bg-green-600 text-white text-sm px-3 py-1 rounded hover:bg-green-700 hover:cursor-pointer"
                onClick={onDetails}
              >
                Ver mais detalhes
                <ScanEye />
              </button>
            </div>

            {/* Botões de editar e deletar - condicionais */}
            <div className="flex justify-between gap-2">
              <button
                className="flex gap-1 items-center bg-emerald-500 text-white text-sm px-3 py-1 rounded hover:bg-emerald-600 w-1/2 disabled:opacity-50  hover:cursor-pointer"
                onClick={onEdit}
              >
                Editar
                <SquarePen size={16} />
              </button>

              <button
                className="flex gap-1 items-center bg-red-500 text-white text-sm px-3 py-1 rounded hover:bg-red-600 w-1/2 disabled:opacity-50  hover:cursor-pointer"
                onClick={onDelete}
                disabled={!podeExcluir}
              >
                Deletar
                <Trash size={16} />
              </button>
            </div>
          </div>
        }
      >
        <div className="flex gap-2 items-center">
          <div className="min-w-[200px]">
            <p className="text-lg font-semibold">{product.nome}</p>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">válido até: </span>{product.validade}
            </p>
          </div>

          <div className="flex flex-col text-sm bg-white p-2 rounded border border-gray-300">
            <span>
              <strong className="text-base font-semibold">Qtd em estoque:</strong><br />
            </span>
            <div className="flex flex-wrap gap-1">
              <span>
                unidades: <strong>{product.unidades}</strong>{" "}
              </span>
              <span>
                peso: <strong>{pesoTotal}</strong>{" "}
              </span>
              <span>
                unidade de medida: <strong>{product.unidadeMedida}</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-xs text-left border border-gray-300 rounded p-2">
            <p>
              <span className="text-gray-600">Categoria:</span>{" "}
              <span className="bg-orange-200 text-orange-800 px-2 py-0.5 rounded font-semibold text-xs">
                {product.categoria}
              </span>
            </p>
            <p className="text-gray-500">
              Qtd mínima: <span className="font-semibold">{product.nivelMinimo}{product.unidadeMedida}</span>
            </p>
          </div>
        </div>
      </ListItem>
    );
  }
