import { useContext } from "react"
import { AuthContext } from "../contexts/AuthContext"

const Dashboard: React.FC = () => {
    const auth = useContext(AuthContext)
    return (
        <div>
            <button onClick={auth?.logout} className="btn">Logout</button>
        </div>
    )
}

export default Dashboard