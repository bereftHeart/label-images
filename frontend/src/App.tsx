import "./App.css";
import { loginUser } from "./service/api";

function App() {
  const login = async () => {
    await loginUser("dathust215192@gmail.com", "Admin1234@");
  };
  return (
    <>
      <button onClick={login} className="btn btn-success">
        Login
      </button>
    </>
  );
}

export default App;
