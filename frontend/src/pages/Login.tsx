import { useContext, useState } from "react";
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { loginCredentials } from "../common/type";
import { AuthContext } from "../contexts/AuthContext";


const Login: React.FC = () => {
    const auth = useContext(AuthContext);
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors }
    } = useForm<loginCredentials>({
        defaultValues: {
            email: localStorage.getItem("email") || "",
            rememberMe: localStorage.getItem("rememberMe") === "true"
        }
    })

    const onSubmit = async (data: loginCredentials) => {
        try {
            setLoading(true)
            await auth?.login(data)

        } catch (error: any) {
            console.error(error)
            setError("email", {
                type: "manual",
                message: error?.response?.data?.message ?? "Invalid email or password"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex justify-center items-center w-full h-full">
            <div className="flex justify-center items-center max-w-xl w-full h-fit py-8 mx-4 bg-base-200 rounded-box shadow-xl">
                <div className="flex flex-col justify-center items-center gap-3 w-full max-w-80">
                    <h2 className="text-2xl text-primary">Welcome back!</h2>

                    <form
                        className="flex flex-col gap-2 w-full"
                        onSubmit={handleSubmit(onSubmit)}
                    >
                        <div className="flex flex-col gap-2 justify-center min-h-64">
                            <label className="input input-bordered w-full flex items-center gap-2">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 16 16"
                                    fill="currentColor"
                                    className="h-4 w-4 opacity-70">
                                    <path
                                        d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0 1 15 5.293V4.5A1.5 1.5 0 0 0 13.5 3h-11Z" />
                                    <path
                                        d="M15 6.954 8.978 9.86a2.25 2.25 0 0 1-1.956 0L1 6.954V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5V6.954Z" />
                                </svg>
                                <input
                                    autoFocus
                                    type="email"
                                    className="grow"
                                    placeholder="Email"
                                    aria-label="Email"
                                    {...register('email', {
                                        required: 'Email is required'
                                    })}
                                />
                            </label>
                            {errors.email && (
                                <span className="text-xs text-error">
                                    {errors.email.message}
                                </span>
                            )}

                            <label className="input input-bordered w-full flex items-center gap-2">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 16 16"
                                    fill="currentColor"
                                    className="h-4 w-4 opacity-70"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M14 6a4 4 0 0 1-4.899 3.899l-1.955 1.955a.5.5 0 0 1-.353.146H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2.293a.5.5 0 0 1 .146-.353l3.955-3.955A4 4 0 1 1 14 6Zm-4-2a.75.75 0 0 0 0 1.5.5.5 0 0 1 .5.5.75.75 0 0 0 1.5 0 2 2 0 0 0-2-2Z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <input
                                    type="password"
                                    className="grow"
                                    placeholder="password"
                                    {...register('password', {
                                        required: 'Password is required'
                                    })}
                                />
                            </label>
                            {errors.password && (
                                <span className="text-xs text-error">
                                    {errors.password.message}
                                </span>
                            )}

                            <div className="w-full">
                                <label className="cursor-pointer label gap-2 justify-start">
                                    <input type="checkbox" className="checkbox checkbox-xs checkbox-accent" {...register('rememberMe')} />
                                    <span className="label-text">Remember me</span>
                                </label>
                            </div>

                            <div className="flex justify-between items-center w-full">
                                <span className="text-base-content">
                                    Do not have an account?
                                </span>
                                <Link
                                    to="/register"
                                    className="text-primary hover:underline hover:opacity-50"
                                >
                                    Register here
                                </Link>
                            </div>
                        </div>

                        <div className="flex justify-center w-full mt-2">
                            <button
                                type="submit"
                                className="btn btn-primary btn-outline w-32"
                                disabled={loading}
                            >
                                {loading ? 'Logging in...' : 'Log in'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
