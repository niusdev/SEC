import React, { useState, useEffect } from "react";
import PageHeader from "../../components/common/PageHeader";
import ListContainer from "../../components/common/ListContainer";
import OrderItem from "../../components/common/orders/OrderItem";
import OrderModal from "../../components/common/modals/OrderModal";
import OrderDetailsModal from "../../components/common/modals/OrderDetailsModal";
import OrderEditModal from "../../components/common/modals/OrderEditModal";
import ConfirmarExclusãoModal from "../../components/common/modals/ConfirmarExclusãoModal";

export default function Orders() {
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [isOrderEditModalOpen, setIsOrderEditModalOpen] = useState(false);
  const [pedidoParaEditar, setPedidoParaEditar] = useState(null);

  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [pedidoParaExcluir, setPedidoParaExcluir] = useState(null);

  // Estado para armazenar usuário lido do localStorage
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Lê o usuário do localStorage e faz parse
    const userStorage = localStorage.getItem("user");
    if (userStorage) {
      try {
        setUser(JSON.parse(userStorage));
      } catch {
        setUser(null);
      }
    }
  }, []);

  // Permissões baseadas no perfil do usuário
  const podeExcluir = user?.perfil === "SUPERVISOR_SENIOR";
  const podeEditar = user?.perfil === "SUPERVISOR_SENIOR" || user?.perfil === "SUPERVISOR_JUNIOR";
  const podeModificarStatus = podeEditar; // só seniors e juniors podem modificar status

  const receitas = [
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
    // ... demais receitas
  ];

  const [pedidos, setPedidos] = useState([
    {
      id: "d35R4TT89-T7_g",
      dataPedido: "30/09/2025",
      nome_cliente: "Teste",
      valorTotal: 100.0,
      status: "PENDENTE",
      telefone: "99999-9999",
      receitas: [{ id: "r1", quantidade: 2 }],
    },
  ]);

  const handleAddOrder = () => setIsOrderModalOpen(true);

  const handleSaveOrder = (novoPedido) => {
    const pedidoComId = { ...novoPedido, id: String(Date.now()) };
    setPedidos((prev) => [...prev, pedidoComId]);
  };

  const handleEditOrder = (pedido) => {
    if (!podeEditar) {
      alert("Você não tem permissão para editar pedidos.");
      return;
    }
    setPedidoParaEditar(pedido);
    setIsOrderEditModalOpen(true);
  };

  const handleSaveEditedOrder = (pedidoAtualizado) => {
    setPedidos((prev) =>
      prev.map((p) => (p.id === pedidoAtualizado.id ? pedidoAtualizado : p))
    );
    setIsOrderEditModalOpen(false);
  };

  const handleStatusChange = (id, newStatus) => {
    if (!podeModificarStatus) {
      alert("Você não tem permissão para modificar o status.");
      return;
    }
    setPedidos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );
  };

  const handleViewDetails = (pedido) => {
    setSelectedOrder(pedido);
    setDetailsOpen(true);
  };

  const handleSearch = (value) => {
    console.log("Buscando por:", value);
  };

  const abrirConfirmacaoExclusao = (pedido) => {
    if (!podeExcluir) {
      alert("Você não tem permissão para excluir pedidos.");
      return;
    }
    setPedidoParaExcluir(pedido);
    setIsConfirmDeleteOpen(true);
  };

  const confirmarExclusao = () => {
    if (!pedidoParaExcluir) return;

    setPedidos((prev) => prev.filter((p) => p.id !== pedidoParaExcluir.id));
    setPedidoParaExcluir(null);
    setIsConfirmDeleteOpen(false);
  };

  const cancelarExclusao = () => {
    setPedidoParaExcluir(null);
    setIsConfirmDeleteOpen(false);
  };

  return (
    <div className="flex flex-col p-4 h-screen">
      <PageHeader
        title="Pedidos"
        searchPlaceholder="Digite o id ou nome do titular do pedido para encontrá-lo..."
        onSearch={handleSearch}
        mainAction="Adicionar novo pedido"
        onMainAction={handleAddOrder}
        showFilter
        showSort
      />

      <ListContainer height="100">
        {pedidos.map((p) => (
          <OrderItem
            key={p.id}
            id={p.id}
            date={p.dataPedido}
            clientName={p.nome_cliente}
            total={p.valorTotal}
            status={p.status}
            onChangeStatus={(newStatus) => handleStatusChange(p.id, newStatus)}
            onViewDetails={() => handleViewDetails(p)}
            onEdit={() => handleEditOrder(p)}
            onDelete={() => abrirConfirmacaoExclusao(p)}
            disableEdit={!podeEditar}
            disableDelete={!podeExcluir}
            disableStatusChange={!podeModificarStatus}
          />
        ))}
      </ListContainer>

      {isOrderModalOpen && (
        <OrderModal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          receitasDisponiveis={receitas}
          onSave={handleSaveOrder}
        />
      )}

      {isOrderEditModalOpen && pedidoParaEditar && (
        <OrderEditModal
          isOpen={isOrderEditModalOpen}
          onClose={() => setIsOrderEditModalOpen(false)}
          pedido={pedidoParaEditar}
          receitasDisponiveis={receitas}
          onSave={handleSaveEditedOrder}
        />
      )}

      <OrderDetailsModal
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        order={selectedOrder}
        receitasDisponiveis={receitas}
      />

      <ConfirmarExclusãoModal
        isOpen={isConfirmDeleteOpen}
        onClose={cancelarExclusao}
        onConfirm={confirmarExclusao}
        mensagem={`Deseja realmente excluir o pedido de ${pedidoParaExcluir?.nome_cliente || ""}?`}
      />
    </div>
  );
}
