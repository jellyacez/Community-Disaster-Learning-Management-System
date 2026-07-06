import { useRef, useState, useEffect, memo, Fragment } from "react";

const OtpInput = memo(function OtpInput({ value, onChange, length = 6 }) {
  const [otp, setOtp] = useState(new Array(length).fill(""));
  const inputRefs = useRef([]);

  useEffect(() => {
    const valArr = value.split("");
    const newOtp = new Array(length).fill("");
    for (let i = 0; i < length; i++) {
      if (valArr[i]) newOtp[i] = valArr[i];
    }
    setOtp(newOtp);
  }, [value, length]);

  const handleChange = (e, index) => {
    const val = e.target.value;
    if (isNaN(val)) return;

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
    <div className="flex items-center justify-center gap-1.5 md:gap-2">
      {otp.map((digit, index) => (
        <Fragment key={`otp-digit-${index}`}>
          <input
            ref={(ref) => (inputRefs.current[index] = ref)}
            id={`otp-input-${index}`}
            name={`otp-input-${index}`}
            aria-label={`Digit ${index + 1} of ${length}`}
            type="text"
            inputMode="numeric"
            value={digit}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={handlePaste}
            className="w-10 h-12 md:w-12 md:h-14 text-center text-xl font-bold border border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all bg-white shadow-sm"
            maxLength={1}
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
