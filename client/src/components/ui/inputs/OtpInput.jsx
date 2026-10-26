import { useRef, useState, useEffect, memo, Fragment } from "react";

// labelledBy names the group for screen readers; autoFocus puts the cursor in the first box
const OtpInput = memo(function OtpInput({ value, onChange, length = 6, labelledBy, describedBy, invalid = false, autoFocus = false, align = "center" }) {
  const [otp, setOtp] = useState(new Array(length).fill(""));
  const inputRefs = useRef([]);

  useEffect(() => {
    if (autoFocus) inputRefs.current[0]?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const valArr = value.split("");
    const newOtp = new Array(length).fill("");
    for (let i = 0; i < length; i++) {
      if (valArr[i]) newOtp[i] = valArr[i];
    }
    setOtp(newOtp);
  }, [value, length]);

  const handleChange = (e, index) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    // Phone autofill drops the whole code into one box: spread it across the boxes
    if (val.length >= length) {
      const newOtp = val.slice(0, length).split("");
      setOtp(newOtp);
      onChange(newOtp.join(""));
      inputRefs.current[length - 1]?.focus();
      return;
    }
    if (e.target.value && !val) return;

    const newOtp = [...otp];
    newOtp[index] = val.substring(val.length - 1);
    setOtp(newOtp);

    const combined = newOtp.join("");
    onChange(combined);

    if (val && index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0 && inputRefs.current[index - 1]) {
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        onChange(newOtp.join(""));
        inputRefs.current[index - 1].focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1].focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").replace(/[^0-9]/g, "").slice(0, length);
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
    onChange(newOtp.join(""));

    const nextIndex = Math.min(pastedData.length, length - 1);
    if (inputRefs.current[nextIndex]) {
      inputRefs.current[nextIndex].focus();
    }
  };

  return (
    <div role="group" aria-labelledby={labelledBy} aria-describedby={describedBy} className={`flex items-center gap-1.5 md:gap-2 ${align === "start" ? "justify-start" : "justify-center"}`}>
      {otp.map((digit, index) => (
        <Fragment key={`otp-digit-${index}`}>
          <input
            ref={(ref) => (inputRefs.current[index] = ref)}
            id={`otp-input-${index}`}
            name={`otp-input-${index}`}
            aria-label={`Digit ${index + 1} of ${length}`}
            aria-invalid={invalid || undefined}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            value={digit}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={handlePaste}
            className={`w-11 h-12 md:w-12 md:h-14 text-center text-xl font-bold border rounded-xl outline-none transition-all shadow-sm ${
              invalid
                ? "border-red-600 bg-red-50 text-red-900 focus:ring-2 focus:ring-red-600"
                : "border-gray-500 bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-900/50"
            }`}
            maxLength={index === 0 ? length : 1}
          />
          {index === 2 && (
            <div className="w-3 h-[2px] bg-gray-300 rounded-full shrink-0 mx-0.5" />
          )}
        </Fragment>
      ))}
    </div>
  );
});

export default OtpInput;
