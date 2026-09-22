import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, UserPlus } from "lucide-react";
import { AuthBrandPanel } from "./AuthBrandPanel";
import { FormField, SelectField } from "../../components/common/FormField";
import { ErrorBanner, SuccessBanner } from "../../components/common/UI";
import { addUser } from "../../api/endpoints";

export default function Signup() {
  const [title, setTitle] = useState("Mr.");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim() || !email.trim() || !/^\d{10}$/.test(phone)) {
      setError("Please fill in a valid name, email and 10 digit phone number.");
      return;
    }

    setLoading(true);
    try {
      // New admins are created against a default "Viewer" role (RoleId 2 per
      // the seeded data); an existing Super Admin can promote them afterwards
      // from the Roles / Admins screens.
      const res = await addUser({
        Title: title,
        Name: name,
        Email: email,
        Phone: phone,
        RoleId: 2,
        IsActive: true,
      });

      if (res.ErrorCode) {
        setError(res.Message || "Could not create your account.");
        return;
      }

      setSuccess(
        res.Message || "Account request submitted. You can now log in with the OTP flow."
      );
      setTimeout(() => navigate("/login"), 1800);
    } catch {
      // Self sign-up requires an authenticated session on this API (every
      // request must carry a UniqueKey), so an anonymous call will 401.
      setError(
        "Self sign-up isn't available yet — ask an existing admin to add you from the Admins page, then log in with your mobile number."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <div className="flex w-full md:w-[480px] flex-col justify-center px-8 sm:px-14">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Sign up
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1.5">
            Request access to the Flyomint Admin panel.
          </p>
        </div>

        {error && (
          <div className="mb-4">
            <ErrorBanner message={error} />
          </div>
        )}
        {success && (
          <div className="mb-4">
            <SuccessBanner message={success} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <SelectField
              id="title"
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            >
              <option value="Mr.">Mr.</option>
              <option value="Mrs.">Mrs.</option>
              <option value="Ms.">Ms.</option>
            </SelectField>
            <div className="col-span-2">
              <FormField
                id="name"
                label="Full Name"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
          <FormField
            id="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <FormField
            id="phone"
            label="Mobile Number"
            type="tel"
            inputMode="numeric"
            placeholder="8800880088"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            maxLength={10}
          />
          <button type="submit" className="btn-primary mt-1" disabled={loading}>
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <UserPlus size={16} />
            )}
            Request Access
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[var(--color-text-secondary)]">
          Already have an account?{" "}
          <Link to="/login" className="text-[var(--color-brand)] font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>

      <AuthBrandPanel />
    </div>
  );
}
