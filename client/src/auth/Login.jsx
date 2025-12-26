import { useAuth0 } from "@auth0/auth0-react";

const Login = () => {
  const { loginWithRedirect } = useAuth0();

  return (
    <button
      onClick={() => loginWithRedirect()}
      className="w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 
                 bg-white/10 border border-white/20 text-white
                 hover:bg-white/30 hover:border-white/40 cursor-pointer"
    >
      Login to UrbanFlow
    </button>
  );
};

export default Login;