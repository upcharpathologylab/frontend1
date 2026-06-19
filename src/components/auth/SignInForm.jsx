import { ChevronDown, Eye, EyeOff, LockKeyhole, Phone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { loginUser, resetPasswordWithOTP, sendResetOTP, verifyResetOTP } from "../../api/api.js";
import { storeAuthSession } from "./authStorage.js";

const initialValues = {
  phone: "",
  password: "",
  resetOtp: Array(6).fill(""),
  newPassword: ""
};

const cleanPhone = (value) => String(value || "").replace(/\D/g, "").slice(-10);
const otpValue = (otp) => otp.join("");

function FieldLabel({ children }) {
  return <span className="mb-1.5 block text-sm font-black text-navy-950 md:mb-3 md:text-xl">{children}</span>;
}

function PhoneField({ value, onChange, error }) {
  return (
    <label>
      <FieldLabel>Phone Number</FieldLabel>
      <div className={`flex h-11 overflow-hidden rounded-lg border bg-white md:h-[74px] ${error ? "border-red-300" : "border-blue-100"}`}>
        <div className="flex w-20 items-center justify-center gap-1.5 border-r border-blue-100 text-sm font-black text-navy-950 md:w-36 md:gap-2 md:text-xl">
          +91 <ChevronDown className="h-4 w-4 md:h-5 md:w-5" />
        </div>
        <input name="phone" value={value} onChange={onChange} inputMode="numeric" placeholder="Enter your phone number" className="min-w-0 flex-1 px-4 text-sm font-bold text-navy-900 outline-none placeholder:text-navy-500 md:px-7 md:text-xl" />
        <div className="grid w-11 place-items-center text-navy-700 md:w-20">
          <Phone className="h-5 w-5 md:h-8 md:w-8" />
        </div>
      </div>
      {error ? <p className="mt-2 text-sm font-bold text-red-600">{error}</p> : null}
    </label>
  );
}

function PasswordField({ label = "Password", name = "password", value, onChange, error, placeholder = "Enter your password" }) {
  const [visible, setVisible] = useState(false);
  return (
    <label>
      <FieldLabel>{label}</FieldLabel>
      <div className={`auth-field ${error ? "border-red-300" : "border-blue-100"}`}>
        <LockKeyhole className="h-5 w-5 shrink-0 text-navy-950 md:h-8 md:w-8" />
        <input name={name} type={visible ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} className="auth-input" />
        <button type="button" onClick={() => setVisible((current) => !current)} className="grid h-9 w-9 place-items-center text-navy-950 md:h-10 md:w-10" aria-label="Toggle password">
          {visible ? <EyeOff className="h-5 w-5 md:h-6 md:w-6" /> : <Eye className="h-5 w-5 md:h-6 md:w-6" />}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm font-bold text-red-600">{error}</p> : null}
    </label>
  );
}

function OtpBoxes({ value, onChange, error }) {
  const refs = useRef([]);
  return (
    <div>
      <FieldLabel>Enter OTP</FieldLabel>
      <div className="grid grid-cols-6 gap-3">
        {value.map((digit, index) => (
          <input
            key={index}
            ref={(node) => {
              refs.current[index] = node;
            }}
            value={digit}
            onChange={(event) => {
              const next = [...value];
              next[index] = event.target.value.replace(/\D/g, "").slice(-1);
              onChange(next);
              if (next[index] && index < 5) refs.current[index + 1]?.focus();
            }}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !digit && index > 0) refs.current[index - 1]?.focus();
            }}
            inputMode="numeric"
            maxLength={1}
            placeholder="-"
            className="h-10 rounded-lg border border-blue-100 bg-white text-center text-base font-black text-navy-950 outline-none focus:border-upchar-green focus:ring-4 focus:ring-upchar-green/10 md:h-14 md:text-lg"
          />
        ))}
      </div>
      {error ? <p className="mt-2 text-sm font-bold text-red-600">{error}</p> : null}
    </div>
  );
}

function Divider() {
  return (
    <div className="my-4 flex items-center gap-4 text-sm font-black text-navy-950 md:my-10 md:gap-5">
      <span className="h-px flex-1 bg-blue-100" />
      OR
      <span className="h-px flex-1 bg-blue-100" />
    </div>
  );
}

function SignInForm({ onModeChange, onSuccess }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = window.setInterval(() => setCooldown((current) => Math.max(current - 1, 0)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const update = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: name === "phone" ? cleanPhone(value) : value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setApiError("");
  };

  const validateLogin = () => {
    const nextErrors = {};
    if (!/^[6-9]\d{9}$/.test(cleanPhone(values.phone))) nextErrors.phone = "Enter a valid Indian phone number.";
    if (!values.password) nextErrors.password = "Password is required.";
    else if (values.password.length < 8) nextErrors.password = "Password must be at least 8 characters.";
    return nextErrors;
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = validateLogin();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      const result = await loginUser({ phone: cleanPhone(values.phone), password: values.password });
      storeAuthSession(result);
      onSuccess?.(result.user, "Signed in successfully.");
    } catch (error) {
      setApiError(error.response?.data?.message || "Unable to sign in. Please check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const sendReset = async () => {
    const phone = cleanPhone(values.phone);
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setErrors({ phone: "Enter a valid Indian phone number." });
      return;
    }
    if (cooldown) return;

    setSubmitting(true);
    try {
      await sendResetOTP({ phone });
      setResetMode(true);
      setResetOtpSent(true);
      setCooldown(30);
    } catch (error) {
      setApiError(error.response?.data?.message || "Unable to send reset OTP.");
    } finally {
      setSubmitting(false);
    }
  };

  const savePassword = async () => {
    const nextErrors = {};
    if (otpValue(values.resetOtp).length !== 6) nextErrors.resetOtp = "Enter the 6-digit OTP.";
    if (!values.newPassword || values.newPassword.length < 8) nextErrors.newPassword = "Password must be at least 8 characters.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      const payload = { phone: cleanPhone(values.phone), otp: otpValue(values.resetOtp), password: values.newPassword };
      await verifyResetOTP(payload);
      await resetPasswordWithOTP(payload);
      setResetMode(false);
      setResetOtpSent(false);
      setValues((current) => ({ ...current, password: "", resetOtp: Array(6).fill(""), newPassword: "" }));
      setApiError("");
    } catch (error) {
      setApiError(error.response?.data?.message || "Unable to reset password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="auth-card auth-card-signin">
      <div className="grid gap-4 md:gap-10">
        <PhoneField value={values.phone} onChange={update} error={errors.phone} />
        {!resetMode ? (
          <>
            <PasswordField value={values.password} onChange={update} error={errors.password} />
            <button type="button" onClick={sendReset} className="justify-self-end text-sm font-black text-upchar-green md:text-lg">
              Forgot Password?
            </button>
          </>
        ) : (
          <>
            <OtpBoxes value={values.resetOtp} onChange={(resetOtp) => setValues((current) => ({ ...current, resetOtp }))} error={errors.resetOtp} />
            <p className="text-center text-sm font-bold text-navy-500">
              Didn't receive OTP?{" "}
              <button type="button" onClick={sendReset} disabled={!resetOtpSent || cooldown > 0 || submitting} className="font-black text-upchar-green disabled:text-navy-400">
                Resend OTP ({`00:${String(cooldown || 30).padStart(2, "0")}`})
              </button>
            </p>
            <PasswordField label="New Password" name="newPassword" value={values.newPassword} onChange={update} error={errors.newPassword} placeholder="Set new password" />
          </>
        )}
      </div>

      {apiError ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{apiError}</p> : null}

      {resetMode ? (
        <button type="button" onClick={savePassword} disabled={submitting} className="auth-primary-btn mt-5 md:mt-8">
          {submitting ? "Saving..." : "Save New Password"}
        </button>
      ) : (
        <button type="submit" disabled={submitting} className="auth-primary-btn mt-5 md:mt-12">
          {submitting ? "Signing In..." : "Sign In"}
        </button>
      )}
      <Divider />
      <button type="button" onClick={() => onModeChange("signup")} className="auth-outline-btn">
        Sign Up
      </button>
    </form>
  );
}

export default SignInForm;
