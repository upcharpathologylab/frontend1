import { ChevronDown, Eye, EyeOff, LockKeyhole, Phone, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { registerUserWithOTP, sendSignupOTP, verifySignupOTP } from "../../api/api.js";
import { storeAuthSession } from "./authStorage.js";

const initialValues = {
  fullName: "",
  password: "",
  phone: "",
  otp: Array(6).fill("")
};

const cleanPhone = (value) => String(value || "").replace(/\D/g, "").slice(-10);
const otpValue = (otp) => otp.join("");

function validateBase(values) {
  const errors = {};
  if (!values.fullName.trim()) errors.fullName = "Full name is required.";
  if (!values.password) errors.password = "Password is required.";
  else if (values.password.length < 8) errors.password = "Password must be at least 8 characters.";
  if (!/^[6-9]\d{9}$/.test(cleanPhone(values.phone))) errors.phone = "Enter a valid Indian phone number.";
  return errors;
}

function FieldLabel({ children }) {
  return <span className="mb-1 block text-xs font-black text-navy-950 md:text-sm">{children}</span>;
}

function TextField({ label, name, value, onChange, placeholder, error, icon: Icon }) {
  return (
    <label>
      <FieldLabel>{label}</FieldLabel>
      <div className={`auth-field ${error ? "border-red-300" : "border-blue-100"}`}>
        <Icon className="h-4 w-4 shrink-0 text-navy-600 md:h-5 md:w-5" />
        <input name={name} value={value} onChange={onChange} placeholder={placeholder} className="auth-input" />
      </div>
      {error ? <p className="mt-1 text-xs font-bold text-red-600">{error}</p> : null}
    </label>
  );
}

function PasswordField({ value, onChange, error }) {
  const [visible, setVisible] = useState(false);
  return (
    <label>
      <FieldLabel>Password</FieldLabel>
      <div className={`auth-field ${error ? "border-red-300" : "border-blue-100"}`}>
        <LockKeyhole className="h-4 w-4 shrink-0 text-navy-600 md:h-5 md:w-5" />
        <input
          name="password"
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder="Create password"
          className="auth-input"
        />
        <button type="button" onClick={() => setVisible((current) => !current)} className="grid h-8 w-8 place-items-center text-navy-700" aria-label="Toggle password">
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? <p className="mt-0.5 text-[11px] font-bold text-red-600">{error}</p> : <p className="mt-0.5 text-[11px] font-bold text-navy-500">Password must be at least 8 characters long</p>}
    </label>
  );
}

function PhoneField({ value, onChange, error }) {
  return (
    <label>
      <FieldLabel>Phone Number</FieldLabel>
      <div className={`flex h-10 overflow-hidden rounded-lg border bg-white md:h-11 ${error ? "border-red-300" : "border-blue-100"}`}>
        <div className="grid w-11 place-items-center border-r border-blue-100 text-navy-600 md:w-12">
          <Phone className="h-4 w-4 md:h-5 md:w-5" />
        </div>
        <div className="flex w-16 items-center justify-center gap-1 border-r border-blue-100 text-xs font-black text-navy-950 md:w-20 md:text-sm">
          +91 <ChevronDown className="h-4 w-4" />
        </div>
        <input name="phone" value={value} onChange={onChange} inputMode="numeric" placeholder="Enter your phone number" className="min-w-0 flex-1 px-2.5 text-xs font-bold text-navy-900 outline-none placeholder:text-navy-500 md:px-3 md:text-sm" />
      </div>
      {error ? <p className="mt-0.5 text-[11px] font-bold text-red-600">{error}</p> : null}
    </label>
  );
}

function OtpBoxes({ value, onChange, error }) {
  const refs = useRef([]);

  const updateOtp = (index, nextValue) => {
    const digit = nextValue.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[index] = digit;
    onChange(next);
    if (digit && index < 5) refs.current[index + 1]?.focus();
  };

  return (
    <div>
      <FieldLabel>Enter OTP</FieldLabel>
      <div className="grid grid-cols-6 gap-1.5">
        {value.map((digit, index) => (
          <input
            key={index}
            ref={(node) => {
              refs.current[index] = node;
            }}
            value={digit}
            onChange={(event) => updateOtp(index, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !digit && index > 0) refs.current[index - 1]?.focus();
            }}
            inputMode="numeric"
            maxLength={1}
            placeholder="-"
            className="h-9 rounded-lg border border-blue-100 bg-white text-center text-sm font-black text-navy-950 outline-none focus:border-upchar-green focus:ring-4 focus:ring-upchar-green/10 md:h-9"
          />
        ))}
      </div>
      {error ? <p className="mt-0.5 text-[11px] font-bold text-red-600">{error}</p> : null}
    </div>
  );
}

function Divider() {
  return (
    <div className="my-2 flex items-center gap-3 text-[11px] font-black text-navy-950">
      <span className="h-px flex-1 bg-blue-100" />
      OR
      <span className="h-px flex-1 bg-blue-100" />
    </div>
  );
}

function SignUpForm({ onModeChange, onSuccess }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);

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

  const sendOtp = async () => {
    const nextErrors = validateBase(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || cooldown) return;

    setSendingOtp(true);
    try {
      await sendSignupOTP({ phone: cleanPhone(values.phone) });
      setOtpSent(true);
      setCooldown(30);
    } catch (error) {
      setApiError(error.response?.data?.message || "Unable to send OTP. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = validateBase(values);
    if (otpValue(values.otp).length !== 6) nextErrors.otp = "Enter the 6-digit OTP.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      const payload = { ...values, phone: cleanPhone(values.phone), otp: otpValue(values.otp) };
      await verifySignupOTP(payload);
      const result = await registerUserWithOTP(payload);
      storeAuthSession(result);
      onSuccess?.(result.user, "Account created successfully.");
    } catch (error) {
      setApiError(error.response?.data?.message || "Unable to create account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="auth-card auth-card-signup">
      <div className="grid gap-2 md:gap-2.5">
        <TextField label="Full Name" name="fullName" value={values.fullName} onChange={update} placeholder="Enter your full name" error={errors.fullName} icon={UserRound} />
        <PasswordField value={values.password} onChange={update} error={errors.password} />
        <PhoneField value={values.phone} onChange={update} error={errors.phone} />

        <button type="button" onClick={sendOtp} disabled={sendingOtp || cooldown > 0} className="auth-outline-btn">
          {sendingOtp ? "Sending..." : "Send OTP"}
        </button>
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-navy-500 md:text-xs">
          <ShieldCheck className="h-3.5 w-3.5" /> We will send an OTP to your phone number
        </p>

        <OtpBoxes value={values.otp} onChange={(otp) => setValues((current) => ({ ...current, otp }))} error={errors.otp} />
        <p className="text-center text-[11px] font-bold text-navy-500 md:text-xs">
          Didn't receive OTP?{" "}
          <button type="button" onClick={sendOtp} disabled={!otpSent || cooldown > 0 || sendingOtp} className="font-black text-upchar-green disabled:text-navy-400">
            Resend OTP ({`00:${String(cooldown || 30).padStart(2, "0")}`})
          </button>
        </p>
      </div>

      {apiError ? <p className="mt-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-700">{apiError}</p> : null}

      <button type="submit" disabled={submitting} className="auth-primary-btn mt-2.5">
        {submitting ? "Signing Up..." : "Sign Up"}
      </button>
      <Divider />
      <button type="button" onClick={() => onModeChange("signin")} className="auth-outline-btn">
        Sign In
      </button>
    </form>
  );
}

export default SignUpForm;
