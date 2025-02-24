import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation, useNavigate } from "react-router-dom";
import userService from "../services/user";
import { notify } from "../common/functions";

const schema = z.object({
  code: z
    .string()
    .length(6, "Code must be exactly 6 digits")
    .regex(/^\d+$/, "Only numbers allowed"),
});

const Verification: React.FC = () => {
  const { state } = useLocation();
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const {
    register,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      await userService.verifyUser({
        email: state.email,
        code: data.code,
      });

      notify("Verify success. You can login now", "success");
      navigate("/login");
    } catch (error: any) {
      console.error(error);
      setError("code", {
        type: "manual",
        message: error?.response?.data?.message ?? "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setCountdown(60);
      setCanResend(false);
      await userService.resendVerification(state.email);

      notify("Verification code sent", "success");
    } catch (error: any) {
      console.error(error);
      setError("code", {
        type: "manual",
        message: error?.message ?? "An error occurred",
      });
    }
  };

  return (
    <div className="flex justify-center items-center w-full h-full">
      <div className="flex justify-center items-center max-w-xl w-full h-fit py-8 mx-4 bg-base-200 rounded-box shadow-xl">
        <div className="flex flex-col justify-center items-center gap-3 w-full max-w-80">
          <h2 className="text-2xl text-primary">Sign up</h2>

          <form
            className="flex flex-col gap-2 w-full"
            onSubmit={handleSubmit(onSubmit)}
          >
            <p className="text-secondary">
              Enter the 6-digit code sent to your email.
            </p>

            <input
              type="text"
              className="input input-bordered w-full max-w-xs"
              placeholder="Verification code"
              {...register("code")}
            />
            {errors.code && (
              <span className="text-error">{errors.code.message}</span>
            )}

            <button
              disabled={loading}
              className="btn btn-primary"
              type="submit"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </form>

          {/* Resend code */}
          <div className="mt-4 text-center">
            <button
              className="btn btn-secondary"
              onClick={handleResend}
              disabled={!canResend}
            >
              {canResend ? "Resend Code" : `Resend in ${countdown}s`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Verification;
