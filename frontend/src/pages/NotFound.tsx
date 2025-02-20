import { Link } from "react-router-dom"

const NotFoundPage: React.FC = () => {


    return (
        <div className="relative flex justify-center items-center flex-col gap-4 w-full h-full">
            <h1 className="text-6xl">Oops 404!</h1>
            <Link to="/" className="btn btn-primary">Go back to Home</Link>
        </div>
    )
}

export default NotFoundPage