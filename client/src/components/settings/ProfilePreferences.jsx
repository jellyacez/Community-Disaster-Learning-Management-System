import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserCircle02Icon, Mail01Icon } from "@hugeicons/core-free-icons";
import { authClient } from "../../lib/auth-client";
import { saveOfflinePersonName } from "../../lib/LocalSave/nameService";
import { preparePersonName } from "../../utils/personName";
import toast from "react-hot-toast";

const EMPTY_NAME = { first_name: "", middle_name: "", last_name: "" };
const NAME_INPUTS = [
  { key: "first_name", label: "First name", autoComplete: "given-name" },
  {
    key: "middle_name",
    label: "Middle name (optional)",
    autoComplete: "additional-name",
  },
  { key: "last_name", label: "Last name", autoComplete: "family-name" },
];

export default function ProfilePreferences({ currentUser }) {
  const queryClient = useQueryClient();
  const [names, setNames] = useState(EMPTY_NAME);
  const [errors, setErrors] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const hasStructuredName = Boolean(
    currentUser?.first_name && currentUser?.last_name,
  );

  useEffect(() => {
    // Never guess name components by splitting a legacy full name.
    setNames({
      first_name: currentUser?.first_name || "",
      middle_name: currentUser?.middle_name || "",
      last_name: currentUser?.last_name || "",
    });
    setErrors({});
  }, [
    currentUser?.id,
    currentUser?.first_name,
    currentUser?.middle_name,
    currentUser?.last_name,
  ]);

  const refreshUser = (data) => {
    // Update an existing cached session; never create a partial auth session.
    queryClient.setQueryData(["session"], (previous) =>
      previous?.user && String(previous.user.id) === String(currentUser.id)
        ? { ...previous, user: { ...previous.user, ...data } }
        : previous,
    );
    queryClient.invalidateQueries({ queryKey: ["session"] });
    queryClient.invalidateQueries({ queryKey: ["userDashboard"] });
  };

  const queueName = async (data) => {
    const result = await saveOfflinePersonName(currentUser.id, data);
    if (result.status === "failed") {
      toast.error(result.error);
      return;
    }
    refreshUser(data);
    if (result.status === "queued_memory_only") {
      toast(
        result.warning ||
          "Saved for this session only. Keep this tab open until your changes sync.",
        { icon: "⚠️", duration: 6000 },
      );
    } else {
      toast.success(
        "Name saved on this device. It will sync when you are online.",
      );
    }
  };

  const handleUpdateProfile = async (event) => {
    event.preventDefault();
    if (isUpdating || !currentUser?.id) return;
    const { errors: nextErrors, data } = preparePersonName(names);
    setErrors(nextErrors);
    if (!data) {
      document.getElementById(`profile-${Object.keys(nextErrors)[0]}`)?.focus();
      return;
    }
    if (
      NAME_INPUTS.every(({ key }) => data[key] === (currentUser[key] || ""))
    ) {
      toast("No name changes to save.");
      return;
    }
    setIsUpdating(true);
    try {
      if (!navigator.onLine) {
        await queueName(data);
        return;
      }
      const { error } = await authClient.updateUser(data);
      if (error) {
        if (
          !navigator.onLine ||
          error.code === "ERR_NETWORK" ||
          error.message?.toLowerCase().includes("network")
        ) {
          await queueName(data);
        } else {
          toast.error(error.message || "Failed to update your name.");
        }
        return;
      }
      refreshUser(data);
      toast.success("Profile updated successfully!");
    } catch (error) {
      if (
        !navigator.onLine ||
        error.code === "ERR_NETWORK" ||
        error.message?.toLowerCase().includes("network")
      ) {
        await queueName(data);
      } else {
        toast.error("Could not update your name. Try again.");
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <form
      onSubmit={handleUpdateProfile}
      noValidate
      className="flex w-full flex-col space-y-6 p-6 md:p-8"
    >
      <div className="flex flex-col gap-5 md:flex-row md:gap-12">
        <div className="shrink-0 md:w-1/3">
          <h4 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-slate-100">
            <HugeiconsIcon
              icon={UserCircle02Icon}
              className="h-5 w-5 text-red-500"
            />
            Your name
          </h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            This name appears on your profile and newly issued certificates.
          </p>
          {!hasStructuredName && (
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
              Current name:{" "}
              <strong className="break-words">
                {currentUser?.name || "Not provided"}
              </strong>
              . Please confirm your name in the separate fields. Your current
              name stays unchanged until you save.
            </p>
          )}
        </div>
        <div className="w-full min-w-0 space-y-4 md:max-w-md md:flex-1">
          {NAME_INPUTS.map((field) => (
            <div key={field.key}>
              <label
                htmlFor={`profile-${field.key}`}
                className="mb-1 block text-sm font-semibold text-gray-700 dark:text-slate-200"
              >
                {field.label}
              </label>
              <input
                id={`profile-${field.key}`}
                name={field.key}
                type="text"
                autoComplete={field.autoComplete}
                value={names[field.key]}
                disabled={isUpdating}
                maxLength={100}
                required={field.key !== "middle_name"}
                aria-invalid={Boolean(errors[field.key])}
                aria-describedby={
                  errors[field.key]
                    ? `profile-${field.key}-error`
                    : "profile-name-help"
                }
                onChange={(event) => {
                  setNames((previous) => ({
                    ...previous,
                    [field.key]: event.target.value,
                  }));
                  setErrors((previous) => ({
                    ...previous,
                    [field.key]: undefined,
                  }));
                }}
                className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
              {errors[field.key] && (
                <p
                  id={`profile-${field.key}-error`}
                  role="alert"
                  className="mt-1 text-xs text-red-700 dark:text-red-300"
                >
                  {errors[field.key]}
                </p>
              )}
            </div>
          ))}
          <p
            id="profile-name-help"
            className="text-xs text-gray-500 dark:text-slate-400"
          >
            Numbers are not allowed. Accented letters, spaces, hyphens,
            apostrophes and periods are accepted.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-4 md:flex-row md:gap-12">
        <div className="md:w-1/3 md:shrink-0">
          <h4 className="flex items-center gap-2 font-bold text-gray-900 dark:text-slate-100">
            <HugeiconsIcon icon={Mail01Icon} className="h-5 w-5 text-red-500" />
            <label htmlFor="emailAddress">Email address</label>
          </h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Your email cannot be changed here.
          </p>
        </div>
        <div className="w-full md:max-w-md md:flex-1">
          <input
            id="emailAddress"
            type="email"
            value={currentUser?.email || ""}
            disabled
            readOnly
            className="min-h-11 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isUpdating || !currentUser?.id}
          className="min-h-11 cursor-pointer rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUpdating ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
