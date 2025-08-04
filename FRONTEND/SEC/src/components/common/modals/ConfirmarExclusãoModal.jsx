export default function ConfirmarExclusãoModal({ isOpen, onClose, onConfirm, mensagem }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-md w-[90%] max-w-sm text-center">
        <h2 className="text-lg font-semibold mb-4">{mensagem}</h2>
        <div className="flex justify-center gap-4">
          <button
            onClick={onClose}
            className="hover:cursor-pointer bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="hover:cursor-pointer bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
