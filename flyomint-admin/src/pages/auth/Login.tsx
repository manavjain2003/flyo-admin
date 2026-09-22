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
      // Testing convenience only: the API echoes the OTP back (encrypted) so
      // testers don't need a live SMS gateway hooked up yet. Decrypt it and
      // show it on screen until a real SMS flow is wired in. Remove this
      // before shipping to production.
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
      setError("Something went wrong while requesting the OTP. Please try again.");
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
      await setSession(res.UniqueKey);
      navigate("/", { replace: true });
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <div className="flex w-full md:w-[600px] flex-col justify-center px-8 sm:px-14">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Login
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1.5">
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
          <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
            <FormField
              id="mobile"
              label="Mobile Number"
              type="tel"
              inputMode="numeric"
              placeholder="8800880088"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
              maxLength={10}
              autoFocus
            />
            <button type="submit" className="btn-primary mt-1" disabled={loading}>
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Phone size={16} />
              )}
              Send OTP
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {devOtp && (
              <div className="rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-4 py-3 text-sm">
                <p className="text-[var(--color-warning)] font-medium">
                  Testing mode — OTP: <span className="tracking-widest font-semibold">{devOtp}</span>
                </p>
                <p className="text-[var(--color-text-muted)] text-xs mt-0.5">
                  Shown here for testing only, since no live SMS gateway is connected yet. Remove this before production.
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
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />
            <button type="submit" className="btn-primary mt-1" disabled={loading}>
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
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] self-center"
            >
              Use a different mobile number
            </button>
          </form>
        )}

        <div className="mt-6 flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
          <KeyRound size={12} />
          Your session is authenticated via a signed UniqueKey issued after login.
        </div>

        <p className="mt-8 text-center text-sm text-[var(--color-text-secondary)]">
          Need an account?{" "}
          <Link to="/signup" className="text-[var(--color-brand)] font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>

      <AuthBrandPanel />
    </div>
  );
}