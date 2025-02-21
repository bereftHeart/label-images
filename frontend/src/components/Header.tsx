import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { Link } from "react-router-dom";

const Header: React.FC = () => {
  const auth = useContext(AuthContext);

  return (
    <div className="fixed top-0 z-10 w-full shadow-md text-base-content bg-base-100 flex justify-center">
      <div className="navbar bg-base-100 max-w-7xl">
        <div className="flex-1 md:block hidden">
          <Link to="/" className="text-xl cursor-pointer hover:text-primary">
            Label images
          </Link>
        </div>
        {auth?.user ? (
          <div className="md:flex-none flex-1 flex justify-end items-center gap-4">
            <span>{auth.user}</span>
            <button
              onClick={auth.logout}
              className="btn btn-outline btn-neutral w-24"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex-none">
            <Link to="/login" className="btn btn-accent w-24">
              Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
