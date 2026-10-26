import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { PASSWORD_RULES } from "../../constants/passwordRules";

export default function PasswordRequirements({ password, id }) {
  return (
    <ul id={id} className="mt-2 space-y-1.5 px-1">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.id}
            className={`text-xs flex items-center gap-1.5 transition-colors duration-300 font-medium ${met ? "text-green-700" : "text-gray-600"}`}
          >
            <HugeiconsIcon aria-hidden="true" icon={met ? CheckmarkCircle02Icon : Alert01Icon} className="w-4 h-4" />
            <span className="sr-only">{met ? "Done: " : "Still needed: "}</span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
