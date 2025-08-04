import { useForm } from "react-hook-form";
import { useState } from "react";
import { isEmail } from "validator";
import { useNavigate } from "react-router-dom";

import InputField from "../common/InputField";
import PasswordField from "../common/PasswordField";

export default function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false); 
  const [errorLogin, setErrorLogin] = useState(""); 

  const navigate = useNavigate();

const onSubmit = async (data) => {
  setLoading(true);
  setErrorLogin("");

  try {
    const response = await fetch("http://localhost:3000/api_confeitaria/autenticacao/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: data.email,
        senha: data.password,
      }),
    });

    const result = await response.json(); 

    if (!response.ok) {
      throw new Error(result.message || "Erro ao fazer login.");
    }

    localStorage.setItem("token", result.token);

    const expirationTimestamp = Math.floor(Date.now() / 1000) + result.expiresIn;
    localStorage.setItem("expiresAt", expirationTimestamp.toString());

    localStorage.setItem("user", JSON.stringify(result.userWithoutPass));

    navigate("/app/home");
  } catch (error) {
    console.error("Erro no login:", error.message);
    setErrorLogin(error.message);
  } finally {
    setLoading(false);
  }
};


  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <InputField
        type="text"
        placeholder="email@exemplo.com"
        {...register("email", {
          required: "Informe o email.",
          validate: (value) => isEmail(value) || "Email inválido."
        })}
        errorMessage={errors?.email?.message}
      />

      <PasswordField
        {...register("password", {
          required: "Informe a senha.",
          minLength: { value: 8, message: "A senha deve conter no mínimo 8 caracteres." }
        })}
        errorMessage={errors?.password?.message}
      />

      {errorLogin && ( 
        <p className="text-red-600 mt-2">{errorLogin}</p>
      )}

      <button
        type="submit"
        className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed" 
        disabled={loading} 
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}