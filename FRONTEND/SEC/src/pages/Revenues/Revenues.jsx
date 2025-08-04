import { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import RevenueItem from "../../components/common/revenue/RevenueItem";
import ListContainer from "../../components/common/ListContainer";
import RecipeModal from "../../components/common/modals/RecipeModal";
import DetalhesRevenueModal from "../../components/common/modals/DetalhesRevenueModal";
import RecipeEditModal from "../../components/common/modals/RecipeEditModal";
import ConfirmarExclusãoModal from "../../components/common/modals/ConfirmarExclusãoModal"

export default function Revenues() {
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [receitaSelecionada, setReceitaSelecionada] = useState(null);
  const [receitaParaEditar, setReceitaParaEditar] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [receitaParaExcluir, setReceitaParaExcluir] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const abrirEditar = (receita) => {
    setReceitaParaEditar(receita);
    setShowEditModal(true);
  };

  const abrirDetalhes = (receita) => {
    setReceitaSelecionada(receita);
    setShowDetalhesModal(true);
  };

  const abrirExcluir = (receita) => {
    setReceitaParaExcluir(receita);
    setShowDeleteModal(true);
  };

  const confirmarExclusao = () => {
    if (!receitaParaExcluir) return;
    setReceitas((prev) => prev.filter((r) => r.id !== receitaParaExcluir.id));
    setReceitaParaExcluir(null);
  };

  const handleSearch = (value) => {
    console.log("Buscando por:", value);
  };

  const handleAddRevenue = () => {
    setShowRecipeModal(true);
  };

  const ingredientesDisponiveis = [
    { id: "1", nome: "Farinha", unidade: "g", estoque: 1000, preco: 25 },
    { id: "2", nome: "Ovo", unidade: "un", estoque: 30, preco: 25 },
    { id: "3", nome: "Leite", unidade: "ml", estoque: 500, preco: 25 },
  ];

  const [receitas, setReceitas] = useState([
    {
      id: "r1",
      nome: "Bolo de Cenoura",
      rendimento: 12,
      custo_producao: 9,
      modo_preparo: "Misture tudo e asse.",
      ingredientes: [
        { id: "1", nome: "Farinha", unidade: "g", estoque: 1000, quantidade: 300, preco: 25.0 },
        { id: "2", nome: "Ovo", unidade: "un", estoque: 30, quantidade: 3, preco: 25.0 },
        { id: "3", nome: "Leite", unidade: "ml", estoque: 500, quantidade: 200, preco: 25.0 },
      ],
    },
  ]);

  return (
    <div className="flex flex-col p-4 h-screen">
      <PageHeader
        title="Receitas"
        searchPlaceholder="Digite o id ou nome da receita para encontrá-la..."
        onSearch={handleSearch}
        mainAction="Adicionar uma nova receita"
        onMainAction={handleAddRevenue}
        showFilter
        showSort
      />

      <ListContainer height="100">
        {receitas.map((r) => (
          <RevenueItem
            key={r.id}
            receita={r}
            onView={() => abrirDetalhes(r)}
            onEdit={() => abrirEditar(r)}
            onDelete={() => abrirExcluir(r)}
          />
        ))}
      </ListContainer>

      {/* Modal para criar receita */}
      <RecipeModal
        isOpen={showRecipeModal}
        onClose={() => setShowRecipeModal(false)}
        ingredientesDisponiveis={ingredientesDisponiveis}
        onSave={(novaReceita) => {
          const receitaComId = { ...novaReceita, id: Date.now().toString() };
          setReceitas((prev) => [...prev, receitaComId]);
          setShowRecipeModal(false);
        }}
      />

      {/* Modal de detalhes da receita */}
      <DetalhesRevenueModal
        isOpen={showDetalhesModal}
        onClose={() => setShowDetalhesModal(false)}
        receita={receitaSelecionada}
      />

      {/* Modal para editar receita */}
      <RecipeEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        ingredientesDisponiveis={ingredientesDisponiveis}
        receitaParaEditar={receitaParaEditar}
        onUpdate={(receitaAtualizada) => {
          setReceitas((prev) =>
            prev.map((r) => (r.id === receitaAtualizada.id ? receitaAtualizada : r))
          );
          setShowEditModal(false);
        }}
      />

      {/* Modal de confirmação de exclusão */}
      <ConfirmarExclusãoModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmarExclusao}
        mensagem={`Tem certeza que deseja excluir a receita "${receitaParaExcluir?.nome}"?`}
      />
    </div>
  );
}
