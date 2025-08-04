import { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import ProdutoModal from "../../components/common/modals/ProdutoModal";
import ProductItem from "../../components/common/products/ProductItem";
import ListContainer from "../../components/common/ListContainer";
import ConfirmacaoModal from "../../components/common/modals/ConfirmarExclusãoModal";
import DetalhesProdutoModal from "../../components/common/modals/DetalhesProdutoModal";

export default function Stock() {
  const [showModal, setShowModal] = useState(false);
  const [produtos, setProdutos] = useState([
    {
      nome: "Leite condensado",
      unidades: 12,
      pesoPorUnidade: 0.395,
      unidadeMedida: "kg",
      validade: "30/09/2025",
      nivelMinimo: 5,
      precoCusto: 4.5,
      categoria: "Laticínios"
    }
  ]);

  const [produtoEmEdicao, setProdutoEmEdicao] = useState(null);
  const [produtoParaDeletar, setProdutoParaDeletar] = useState(null);
  const [confirmarDelecao, setConfirmarDelecao] = useState(false);
  const [produtoDetalhado, setProdutoDetalhado] = useState(null);

  // Obter perfil do usuário
  const perfil = JSON.parse(localStorage.getItem("user"))?.perfil || "FUNCIONARIO_COMUM";
  const podeCadastrar = perfil === "SUPERVISOR_JUNIOR" || perfil === "SUPERVISOR_SENIOR";
  const modoSomenteQuantidade = perfil === "FUNCIONARIO_COMUM";

  const handleViewDetails = (produto) => {
    setProdutoDetalhado(produto);
  };

  const handleSearch = (value) => {
    console.log("Buscando por:", value);
  };

  const handleAddProduct = () => {
    if (!podeCadastrar) return;
    setProdutoEmEdicao(null);
    setShowModal(true);
  };

  const handleEditProduct = (index) => {
    setProdutoEmEdicao(index);
    setShowModal(true);
  };

  const handleDeleteProduct = (index) => {
    if (perfil !== "SUPERVISOR_SENIOR") return;
    setProdutoParaDeletar(index);
    setConfirmarDelecao(true);
  };

  const handleConfirmarDelete = () => {
    if (produtoParaDeletar !== null) {
      const novaLista = produtos.filter((_, idx) => idx !== produtoParaDeletar);
      setProdutos(novaLista);
      setProdutoParaDeletar(null);
    }
  };

  const handleSubmitProduto = (produto) => {
    if (produtoEmEdicao !== null) {
      const atualizados = [...produtos];
      atualizados[produtoEmEdicao] = {
        ...produto,
        unidades: produto.quantidade,
        pesoPorUnidade: produto.pesoVolume,
        unidadeMedida: produto.unidade,
        validade: produto.validade
          ? new Date(produto.validade).toLocaleDateString("pt-BR")
          : "",
      };
      setProdutos(atualizados);
      setProdutoEmEdicao(null);
    } else {
      setProdutos([
        ...produtos,
        {
          ...produto,
          unidades: produto.quantidade,
          pesoPorUnidade: produto.pesoVolume,
          unidadeMedida: produto.unidade,
          validade: produto.validade
            ? new Date(produto.validade).toLocaleDateString("pt-BR")
            : "",
        },
      ]);
    }

    setShowModal(false);
  };

  return (
    <div className="flex flex-col p-4 h-screen">
      <PageHeader
        title="Estoque"
        searchPlaceholder="Digite o id ou nome do produto para encontrá-lo..."
        onSearch={handleSearch}
        mainAction="Adicionar novo produto"
        onMainAction={handleAddProduct}
        showFilter
        showSort
      />

      {/* Modal de Cadastro/Edição de Produto */}
      <ProdutoModal
        isOpen={showModal}
        onClose={() => {
          setProdutoEmEdicao(null);
          setShowModal(false);
        }}
        onSubmit={handleSubmitProduto}
        modoSomenteQuantidade={modoSomenteQuantidade && produtoEmEdicao !== null}
        initialData={
          produtoEmEdicao !== null
            ? {
                nome: produtos[produtoEmEdicao].nome,
                unidade: produtos[produtoEmEdicao].unidadeMedida || "G",
                pesoVolume: produtos[produtoEmEdicao].pesoPorUnidade,
                perecivel: !!produtos[produtoEmEdicao].validade,
                validade:
                  produtos[produtoEmEdicao].validade?.split("/").reverse().join("-") || "",
                nivelMinimo: produtos[produtoEmEdicao].nivelMinimo,
                precoCusto: produtos[produtoEmEdicao].precoCusto,
                quantidade: produtos[produtoEmEdicao].unidades,
                categoria: produtos[produtoEmEdicao].categoria || "INGREDIENTE",
              }
            : undefined
        }
      />

      <ListContainer height="100">
        {produtos.map((p, i) => (
          <ProductItem
            key={i}
            product={p}
            onEdit={() => handleEditProduct(i)}
            onDelete={() => handleDeleteProduct(i)}
            onDetails={() => handleViewDetails(p)}
          />
        ))}
      </ListContainer>

      <ConfirmacaoModal
        isOpen={confirmarDelecao}
        onClose={() => {
          setProdutoParaDeletar(null);
          setConfirmarDelecao(false);
        }}
        onConfirm={handleConfirmarDelete}
        mensagem={`Tem certeza que deseja deletar "${produtos[produtoParaDeletar]?.nome}"?`}
      />

      <DetalhesProdutoModal
        isOpen={!!produtoDetalhado}
        onClose={() => setProdutoDetalhado(null)}
        produto={produtoDetalhado}
      />
    </div>
  );
}
