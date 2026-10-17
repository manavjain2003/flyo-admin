import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, Loader2, Phone, ShieldCheck } from "lucide-react";
import { AuthBrandPanel } from "./AuthBrandPanel";
import { FormField } from "../../components/common/FormField";
import { ErrorBanner } from "../../components/common/UI";
import { getLoginOtp, login as loginApi } from "../../api/endpoints";
import { decryptAES } from "../../utils/crypto";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

type Step = "mobile" | "otp";

export default function Login() {
  const [step, setStep] = useState<Step>("mobile");
  const [mobile, setMobile] = useState("");
  const [userKey, setUserKey] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setSession } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^\d{10}$/.test(mobile)) {
      setError("Enter a valid 10 digit mobile number.");
      return;
    }

    setLoading(true);

    try {
      const res = await getLoginOtp(mobile);

      if (res.ErrorCode) {
        setError(res.Message || "Could not send OTP.");
        return;
      }

      setUserKey(res.UserKey);

      const decryptedOtp = decryptAES(res.OTP);

      if (decryptedOtp) {
        setOtp(decryptedOtp);
        setDevOtp(decryptedOtp);
      } else {
        setDevOtp(null);
        showToast("success", res.Message || "OTP sent successfully.");
      }

      setStep("otp");
    } catch {
      setError(
        "Something went wrong while requesting the OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!otp.trim()) {
      setError("Enter the OTP sent to your mobile.");
      return;
    }

    setLoading(true);

    try {
      const res = await loginApi(mobile, userKey, otp);

      if (res.ErrorCode || !res.UniqueKey) {
        setError(res.Message || "Invalid OTP. Please try again.");
        return;
      }

      await setSession(res.UniqueKey, res.Validity);
      navigate("/", { replace: true });
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#0b0f14] text-white">
      <div className="relative flex w-full md:w-[600px] flex-col justify-center px-8 sm:px-14">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">
            Login
          </h2>

          <p className="mt-1.5 text-sm text-gray-400">
            {step === "mobile"
              ? "Enter your registered mobile number to receive an OTP."
              : "Enter the OTP sent to your mobile number."}
          </p>
        </div>

        {error && (
          <div className="mb-4">
            <ErrorBanner message={error} />
          </div>
        )}

        {step === "mobile" ? (
          <form
            onSubmit={handleRequestOtp}
            className="flex flex-col gap-4"
          >
            <FormField
              id="mobile"
              label="Mobile Number"
              type="tel"
              inputMode="numeric"
              placeholder="8800880088"
              value={mobile}
              onChange={(e) =>
                setMobile(e.target.value.replace(/\D/g, ""))
              }
              maxLength={10}
              autoFocus
            />

            <button
              type="submit"
              className="btn-primary mt-1"
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Phone size={16} />
              )}
              Send OTP
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleLogin}
            className="flex flex-col gap-4"
          >
            {devOtp && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
                <p className="font-medium text-amber-400">
                  Testing mode — OTP:{" "}
                  <span className="font-semibold tracking-widest">
                    {devOtp}
                  </span>
                </p>

                <p className="mt-0.5 text-xs text-gray-500">
                  Shown here for testing only, since no live SMS gateway is
                  connected yet. Remove this before production.
                </p>
              </div>
            )}

            <FormField
              id="otp"
              label="OTP"
              type="text"
              inputMode="numeric"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, ""))
              }
              autoFocus
            />

            <button
              type="submit"
              className="btn-primary mt-1"
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ShieldCheck size={16} />
              )}
              Log In
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("mobile");
                setError(null);
                setDevOtp(null);
              }}
              className="self-center text-xs text-gray-500 hover:text-gray-300"
            >
              Use a different mobile number
            </button>
          </form>
        )}

        <div className="mt-6 flex items-center gap-2 text-[11px] text-gray-500">
          <KeyRound size={12} />
          Your session is authenticated via a signed UniqueKey issued after
          login.
        </div>

        <p className="mt-8 text-center text-sm text-gray-400">
          Need an account?{" "}
          <Link
            to="/signup"
            className="font-medium text-blue-400 hover:text-blue-300 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>

      <AuthBrandPanel />
    </div>
  );
}
