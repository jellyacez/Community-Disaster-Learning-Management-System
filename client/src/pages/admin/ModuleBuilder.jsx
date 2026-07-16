import React, { useEffect, useState } from "react";

/**
 * ---------------------------------------------------------------------------
 * Module Builder — Module > Levels > Steps
 * ---------------------------------------------------------------------------
 * Replaces the old flat "TAB 3: TRAINING MODULES CONSTRUCTOR" block in
 * Dashboard.jsx, where a module held a single flat list of steps
 * (module.flows). Modules now hold an ordered list of Levels, and each
 * Level holds its own ordered list of Steps (text / assessment), unchanged
 * in shape from before.
 *
 *   Module
 *     └─ Levels[]        (2–5 required, own title + description)
 *          └─ Steps[]     (same text/assessment step shape as before)
 *
 * Levels are sequential/locked on the resident-facing side (Level N
 * unlocked only after Level N-1 is complete) — that gating lives outside
 * this component; here we just guarantee level order is persisted
 * correctly so it can be enforced later.
 *
 * Level titles default to "Level 1:", "Level 2:", etc. and auto-renumber
 * to match position after a drag-reorder — UNLESS the admin has typed
 * into the title field themselves, in which case it's flagged
 * `isTitleCustom` and left alone regardless of where it ends up. Steps
 * follow the identical pattern one tier down: "Step 1:", "Step 2:", etc.,
 * auto-renumbering within their level unless hand-edited.
 *
 * Props:
 *   editingModule  — module object to edit, or null/undefined to create new
 *   onSave(module) — called with the finished module on submit
 *   onCancel()     — called when the admin backs out
 * ---------------------------------------------------------------------------
 */

const MIN_LEVELS = 2;
const MAX_LEVELS = 5;

function generateId(prefix) {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? `${prefix}_${crypto.randomUUID()}`
    : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyLevel(position) {
  return {
    id: generateId("level"),
    title: `Level ${position}:`,
    description: "",
    isTitleCustom: false,
    steps: [],
  };
}

function emptyFlowStep() {
  return {
    type: "text",
    title: "",
    isTitleCustom: false,
    textContent: "",
    videoUrl: "",
    assessmentType: "quiz",
    quizQuestions: [],
    situationalScenario: "",
    situationalGuide: "",
  };
}

function emptyQuizQuestion() {
  return { questionText: "", options: ["", "", "", ""], correctAnswerIndex: 0 };
}

// Renumber any level whose title was never hand-edited, matching its
// current position. Custom titles are left exactly as typed.
function renumberLevels(levels) {
  return levels.map((level, idx) =>
    level.isTitleCustom ? level : { ...level, title: `Level ${idx + 1}:` }
  );
}

// Same renumbering behavior as renumberLevels, one tier down: steps whose
// title was never hand-edited get relabeled "Step N:" to match their
// current position; steps the admin has typed a custom title into are
// left alone.
function renumberSteps(steps) {
  return steps.map((step, idx) =>
    step.isTitleCustom ? step : { ...step, title: `Step ${idx + 1}:` }
  );
}

// Defensive normalizer: accepts either the new { levels: [...] } shape or
// the legacy flat { flows: [...] } shape (old mock data) and always
// returns a valid levels array so the builder never crashes on old
// records. This is a stopgap, not a real migration — the mock data itself
// will be reshaped later.
function normalizeModuleLevels(module) {
  if (!module) {
    return [createEmptyLevel(1), createEmptyLevel(2)];
  }
  if (Array.isArray(module.levels) && module.levels.length > 0) {
    return module.levels.map((level, idx) => ({
      id: level.id ?? generateId("level"),
      title: level.title ?? `Level ${idx + 1}:`,
      description: level.description ?? "",
      isTitleCustom: level.isTitleCustom ?? true,
      steps: Array.isArray(level.steps) ? level.steps : [],
    }));
  }
  if (Array.isArray(module.flows) && module.flows.length > 0) {
    // Legacy flat module — fold all existing steps into a single level so
    // nothing is lost, and pad up to the new minimum of 2 levels.
    return [
      { ...createEmptyLevel(1), steps: module.flows },
      createEmptyLevel(2),
    ];
  }
  return [createEmptyLevel(1), createEmptyLevel(2)];
}

function StatusBanner({ banner }) {
  if (!banner) return null;
  return (
    <div
      role="status"
      className="p-2 rounded-lg text-[11px] font-medium"
      style={
        banner.tone === "error"
          ? { backgroundColor: "#fef2f2", color: "#991b1b" }
          : { backgroundColor: "#f0fdf4", color: "#065f46" }
      }
    >
      {banner.message}
    </div>
  );
}

export default function ModuleBuilder({ editingModule, onSave, onCancel, mode = "author", onApprove, onReject }) {
  const isReviewMode = mode === "review";

  const [moduleForm, setModuleForm] = useState({
    title: editingModule?.title ?? "",
    description: editingModule?.description ?? "",
    riskLevel: editingModule?.riskLevel ?? "Low",
    status: editingModule?.status ?? "Public",
  });

  const [levels, setLevels] = useState(() => normalizeModuleLevels(editingModule));
  const [activeLevelId, setActiveLevelId] = useState(() => normalizeModuleLevels(editingModule)[0]?.id ?? null);

  const [draggedLevelIndex, setDraggedLevelIndex] = useState(null);
  const [draggedStepIndex, setDraggedStepIndex] = useState(null);

  const [currentFlowStep, setCurrentFlowStep] = useState(emptyFlowStep());
  const [currentQuizQuestion, setCurrentQuizQuestion] = useState(emptyQuizQuestion());
  const [situationalImage, setSituationalImage] = useState(null);
  const [writtenMaterialFile, setWrittenMaterialFile] = useState(null);
  const [reviewNote, setReviewNote] = useState(editingModule?.reviewNote ?? "");

  const [banner, setBanner] = useState(null);

  // Reset the whole builder whenever a different module is loaded for editing
  // (e.g. admin clicks "View / Edit" on a different row while this is open).
  useEffect(() => {
    const initialLevels = normalizeModuleLevels(editingModule);
    setModuleForm({
      title: editingModule?.title ?? "",
      description: editingModule?.description ?? "",
      riskLevel: editingModule?.riskLevel ?? "Low",
      status: editingModule?.status ?? "Public",
    });
    setLevels(initialLevels);
    setActiveLevelId(initialLevels[0]?.id ?? null);
    setCurrentFlowStep(emptyFlowStep());
    setCurrentQuizQuestion(emptyQuizQuestion());
    setSituationalImage(null);
    setWrittenMaterialFile(null);
    setReviewNote(editingModule?.reviewNote ?? "");
    setBanner(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingModule?.id]);

  const notify = (message, tone = "success") => setBanner({ message, tone });

  const activeLevelIndex = levels.findIndex((l) => l.id === activeLevelId);
  const activeLevel = levels[activeLevelIndex] ?? null;

  const updateActiveLevelSteps = (nextSteps) => {
    setLevels(levels.map((l) => (l.id === activeLevelId ? { ...l, steps: nextSteps } : l)));
  };

  // --- Level management -----------------------------------------------

  const addLevel = () => {
    if (levels.length >= MAX_LEVELS) {
      notify(`A module can have at most ${MAX_LEVELS} levels.`, "error");
      return;
    }
    const newLevel = createEmptyLevel(levels.length + 1);
    setLevels([...levels, newLevel]);
    setActiveLevelId(newLevel.id);
  };

  const removeLevel = (levelId) => {
    if (levels.length <= 1) {
      notify("A module needs at least one level while you're building it.", "error");
      return;
    }
    const filtered = renumberLevels(levels.filter((l) => l.id !== levelId));
    setLevels(filtered);
    if (activeLevelId === levelId) {
      setActiveLevelId(filtered[0]?.id ?? null);
    }
  };

  const updateLevelField = (levelId, field, value) => {
    setLevels(
      levels.map((l) =>
        l.id === levelId
          ? { ...l, [field]: value, ...(field === "title" ? { isTitleCustom: true } : {}) }
          : l
      )
    );
  };

  const handleLevelDragStart = (index) => setDraggedLevelIndex(index);

  const handleLevelDragOver = (index) => {
    if (draggedLevelIndex === null || draggedLevelIndex === index) return;
    const updated = [...levels];
    const [moved] = updated.splice(draggedLevelIndex, 1);
    updated.splice(index, 0, moved);
    setDraggedLevelIndex(index);
    setLevels(updated);
  };

  const handleLevelDragEnd = () => {
    setDraggedLevelIndex(null);
    setLevels((current) => renumberLevels(current));
  };

  const moveLevel = (index, direction) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= levels.length) return;
    const updated = [...levels];
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    setLevels(renumberLevels(updated));
  };

  // --- Step management (scoped to the active level) ---------------------

  const handleStepDragStart = (index) => setDraggedStepIndex(index);

  const handleStepDragOver = (index) => {
    if (draggedStepIndex === null || draggedStepIndex === index || !activeLevel) return;
    const updated = [...activeLevel.steps];
    const [moved] = updated.splice(draggedStepIndex, 1);
    updated.splice(index, 0, moved);
    setDraggedStepIndex(index);
    updateActiveLevelSteps(updated);
  };

  const handleStepDragEnd = () => {
    setDraggedStepIndex(null);
    setLevels((current) =>
      current.map((l) => (l.id === activeLevelId ? { ...l, steps: renumberSteps(l.steps) } : l))
    );
  };

  const moveStep = (index, direction) => {
    if (!activeLevel) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeLevel.steps.length) return;
    const updated = [...activeLevel.steps];
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    updateActiveLevelSteps(renumberSteps(updated));
  };

  const defaultStepTitle = activeLevel ? `Step ${activeLevel.steps.length + 1}:` : "";
  const stepTitleValue = currentFlowStep.isTitleCustom ? currentFlowStep.title : defaultStepTitle;

  const addStepToFlow = () => {
    if (!activeLevel) return;
    const resolvedTitle = (currentFlowStep.isTitleCustom ? currentFlowStep.title : defaultStepTitle).trim();
    if (!resolvedTitle) return notify("Please enter a step name.", "error");
    if (currentFlowStep.type === "text" && !currentFlowStep.textContent.trim()) {
      return notify("Please fill in the documentation text block.", "error");
    }
    if (currentFlowStep.type === "assessment") {
      if (currentFlowStep.assessmentType === "quiz" && currentFlowStep.quizQuestions.length === 0) {
        return notify("Please add at least one multiple choice question.", "error");
      }
      if (
        currentFlowStep.assessmentType === "situational" &&
        !currentFlowStep.situationalScenario.trim()
      ) {
        return notify("Please describe the real-world scenario details.", "error");
      }
    }

    const stepWithMeta = { ...currentFlowStep, title: resolvedTitle };
    if (currentFlowStep.type === "text" && writtenMaterialFile) {
      stepWithMeta.attachedFileName = writtenMaterialFile.name;
    }
    if (
      currentFlowStep.type === "assessment" &&
      currentFlowStep.assessmentType === "situational" &&
      situationalImage
    ) {
      stepWithMeta.attachedImageName = situationalImage.name;
    }

    updateActiveLevelSteps([...activeLevel.steps, stepWithMeta]);
    setWrittenMaterialFile(null);
    setSituationalImage(null);
    setCurrentFlowStep(emptyFlowStep());
    notify(`Step added to ${activeLevel.title}.`);
  };

  const removeFlowStep = (index) => {
    if (!activeLevel) return;
    updateActiveLevelSteps(renumberSteps(activeLevel.steps.filter((_, i) => i !== index)));
  };

  const addQuizQuestionToStep = () => {
    if (!currentQuizQuestion.questionText.trim()) return notify("Please write a question.", "error");
    if (currentQuizQuestion.options.some((opt) => !opt.trim())) {
      return notify("Please fill out all choice options.", "error");
    }
    setCurrentFlowStep({
      ...currentFlowStep,
      quizQuestions: [...currentFlowStep.quizQuestions, currentQuizQuestion],
    });
    setCurrentQuizQuestion(emptyQuizQuestion());
  };

  // --- Blueprint preview --------------------------------------------------

  const previewBlueprint = () => {
    const summary = levels
      .map((level, lIdx) => {
        const stepLines = level.steps
          .map((s, sIdx) => `    ${lIdx + 1}.${sIdx + 1} [${s.type.toUpperCase()}] ${s.title}`)
          .join("\n");
        return `${lIdx + 1}. ${level.title}${level.description ? ` — ${level.description}` : ""}\n${stepLines || "    (no steps yet)"}`;
      })
      .join("\n\n");
    alert(`Current Module Blueprint:\n\n${summary}`);
  };

  // --- Submit ---------------------------------------------------------

  const validateModule = () => {
    if (!moduleForm.title.trim() || !moduleForm.description.trim()) {
      return "Please enter the module title and description.";
    }
    if (levels.length < MIN_LEVELS || levels.length > MAX_LEVELS) {
      return `A module needs between ${MIN_LEVELS} and ${MAX_LEVELS} levels.`;
    }
    for (const level of levels) {
      if (!level.description.trim()) return `${level.title} needs a description.`;
      if (level.steps.length === 0) return `${level.title} needs at least one step.`;
    }
    return null;
  };

  const buildModulePayload = (overrides = {}) => ({
    id: editingModule?.id ?? Date.now(),
    ...moduleForm,
    levels,
    approvalStatus: editingModule?.approvalStatus ?? "Pending",
    reviewNote,
    ...overrides,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const error = validateModule();
    if (error) return notify(error, "error");
    onSave(buildModulePayload());
  };

  const handleApprove = () => {
    const error = validateModule();
    if (error) return notify(error, "error");
    onApprove?.(buildModulePayload({ approvalStatus: "Approved" }));
  };

  const handleReject = () => {
    const title = moduleForm.title.trim() || "this module";
    if (!window.confirm(`Reject "${title}"? The author will need to revise and resubmit.`)) return;
    onReject?.(buildModulePayload({ approvalStatus: "Rejected" }));
  };

  if (!activeLevel) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <StatusBanner banner={banner} />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Module-level fields */}
        <div className="admin-card-panel w-full space-y-4">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-1.5">
            {editingModule ? "Modify Training Module" : "Setup New Training Module"}
          </h2>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
              Module Topic Title
            </label>
            <input
              type="text"
              placeholder="e.g., Protocol for Flash Floods"
              value={moduleForm.title}
              onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
              className="w-full p-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
              Short Description / Summary
            </label>
            <textarea
              rows="2"
              placeholder="Brief summary of scopes..."
              value={moduleForm.description}
              onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
              className="w-full p-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Risk Level</label>
              <select
                value={moduleForm.riskLevel}
                onChange={(e) => setModuleForm({ ...moduleForm, riskLevel: e.target.value })}
                className="w-full p-2 border border-gray-200 text-gray-700 rounded-xl text-xs"
              >
                <option value="Low">Low Risk</option>
                <option value="Medium">Medium Risk</option>
                <option value="High">High Urgency</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                Visibility State
              </label>
              <select
                value={moduleForm.status}
                onChange={(e) => setModuleForm({ ...moduleForm, status: e.target.value })}
                className="w-full p-2 border border-gray-200 text-gray-700 rounded-xl text-xs"
              >
                <option value="Public">Public</option>
                <option value="Private">Private Draft</option>
              </select>
            </div>
          </div>
        </div>

        {isReviewMode && (
          <div className="admin-card-panel w-full space-y-2" style={{ borderLeft: "4px solid #dc2626" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 font-mono">
                Head-Admin Review
              </h3>
              <span
                className={
                  (editingModule?.approvalStatus ?? "Pending") === "Approved"
                    ? "badge-ready"
                    : (editingModule?.approvalStatus ?? "Pending") === "Rejected"
                    ? "counter"
                    : "badge-review"
                }
              >
                {editingModule?.approvalStatus ?? "Pending"}
              </span>
            </div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
              Reviewer Notes (optional, visible to the author)
            </label>
            <textarea
              rows="2"
              placeholder="Feedback for the submitting officer..."
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              className="w-full p-2 bg-white border rounded-xl text-xs focus:outline-none"
            />
          </div>
        )}

        {/* Level tabs + level fields */}
        <div className="admin-card-panel w-full space-y-3">
          <div className="flex items-center justify-between border-b pb-1">
            <h3 className="text-xs font-bold uppercase text-gray-400 font-mono">
              Levels ({levels.length} / {MIN_LEVELS}–{MAX_LEVELS})
            </h3>
            <div className="flex items-center gap-2">
              {levels.length >= 2 && (
                <button
                  type="button"
                  onClick={previewBlueprint}
                  className="px-2.5 py-0.5 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-600 hover:text-white rounded-md transition-all"
                >
                  Preview Flow Blueprint
                </button>
              )}
              <button
                type="button"
                onClick={addLevel}
                disabled={levels.length >= MAX_LEVELS}
                className="px-2.5 py-0.5 text-[10px] font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-md disabled:opacity-40"
              >
                + Add Level
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            {levels.map((level, index) => (
              <div
                key={level.id}
                draggable
                onDragStart={() => handleLevelDragStart(index)}
                onDragOver={(e) => {
                  e.preventDefault();
                  handleLevelDragOver(index);
                }}
                onDragEnd={handleLevelDragEnd}
                onClick={() => setActiveLevelId(level.id)}
                className="flex items-center justify-between p-2.5 bg-gray-50 border rounded-xl text-xs cursor-pointer"
                style={
                  activeLevelId === level.id
                    ? { borderColor: "#dc2626", backgroundColor: "#fef2f2" }
                    : undefined
                }
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="cursor-grab text-gray-400">☰</span>
                  <span className="font-semibold text-gray-800 truncate">{level.title}</span>
                  <span className="counter" style={{ padding: "2px 6px", fontSize: "9px" }}>
                    {level.steps.length} step{level.steps.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => moveLevel(index, "up")}
                    disabled={index === 0}
                    className="px-1.5 py-0.5 bg-white border text-[10px] rounded"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveLevel(index, "down")}
                    disabled={index === levels.length - 1}
                    className="px-1.5 py-0.5 bg-white border text-[10px] rounded"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    onClick={() => removeLevel(level.id)}
                    className="text-red-600 ml-2 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Active level's own fields */}
          <div className="p-3 bg-gray-50 border border-gray-200 border-dashed rounded-xl space-y-2">
            <span className="text-[10px] uppercase font-bold text-gray-400 font-mono">
              Editing: {activeLevel.title}
            </span>
            <input
              type="text"
              placeholder="Level title (e.g., Level 1: Awareness Basics)"
              value={activeLevel.title}
              onChange={(e) => updateLevelField(activeLevel.id, "title", e.target.value)}
              className="w-full p-2 bg-white border rounded-xl text-xs focus:outline-none"
            />
            <textarea
              rows="2"
              placeholder="What does this level cover?"
              value={activeLevel.description}
              onChange={(e) => updateLevelField(activeLevel.id, "description", e.target.value)}
              className="w-full p-2 bg-white border rounded-xl text-xs focus:outline-none"
            />
          </div>
        </div>

        {/* Steps within the active level */}
        <div className="admin-card-panel w-full space-y-3">
          <h3 className="text-xs font-bold uppercase text-gray-400 font-mono border-b pb-1.5">
            Steps in {activeLevel.title}
          </h3>
          {activeLevel.steps.map((flow, index) => (
            <div
              key={index}
              draggable
              onDragStart={() => handleStepDragStart(index)}
              onDragOver={(e) => {
                e.preventDefault();
                handleStepDragOver(index);
              }}
              onDragEnd={handleStepDragEnd}
              className="flex items-center justify-between p-2.5 bg-gray-50 border rounded-xl text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="cursor-grab text-gray-400">☰</span>
                <span className="font-semibold text-gray-800">{flow.title}</span>
                <span className="counter" style={{ padding: "2px 6px", fontSize: "9px" }}>
                  {flow.type}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveStep(index, "up")}
                  disabled={index === 0}
                  className="px-1.5 py-0.5 bg-white border text-[10px] rounded"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveStep(index, "down")}
                  disabled={index === activeLevel.steps.length - 1}
                  className="px-1.5 py-0.5 bg-white border text-[10px] rounded"
                >
                  ▼
                </button>
                <button type="button" onClick={() => removeFlowStep(index)} className="text-red-600 ml-2 hover:underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Step builder for the active level */}
        <div className="admin-card-panel space-y-4">
          <h3 className="text-xs font-bold uppercase text-gray-400 border-b pb-1.5 font-mono">
            Step Content Configuration Builder
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Step title..."
              value={stepTitleValue}
              onChange={(e) =>
                setCurrentFlowStep({ ...currentFlowStep, title: e.target.value, isTitleCustom: true })
              }
              className="p-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
            />
            <select
              value={currentFlowStep.type}
              onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, type: e.target.value })}
              className="p-2 border border-gray-200 rounded-xl text-xs"
            >
              <option value="text">Instructional Materials</option>
              <option value="assessment">Assessment Verification</option>
            </select>
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200 border-dashed rounded-xl space-y-3">
            {currentFlowStep.type === "text" && (
              <div className="space-y-2">
                <textarea
                  rows="3"
                  placeholder="Type instructions here..."
                  value={currentFlowStep.textContent}
                  onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, textContent: e.target.value })}
                  className="w-full p-2 bg-white border rounded-xl text-xs focus:outline-none"
                />
                <div className="flex flex-col gap-1 bg-white p-2 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-gray-400 font-mono">
                    Upload Reference File (DOCX / Audio / Video Material)
                  </span>
                  <input
                    type="file"
                    accept=".docx, audio/*, video/*"
                    onChange={(e) => {
                      const targetFile = e.target.files[0];
                      if (targetFile) {
                        setWrittenMaterialFile(targetFile);
                        notify(`Instructional attachment staged: ${targetFile.name}`);
                      }
                    }}
                    className="text-[11px] text-gray-500 mt-1 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  />
                  {writtenMaterialFile && (
                    <p className="text-[10px] text-emerald-600 font-mono font-medium mt-0.5">
                      Staged Attachment: {writtenMaterialFile.name}
                    </p>
                  )}
                </div>
              </div>
            )}

            {currentFlowStep.type === "assessment" && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-600">Verification Type Selection:</span>
                  <select
                    value={currentFlowStep.assessmentType}
                    onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, assessmentType: e.target.value })}
                    className="p-1 border rounded bg-white"
                  >
                    <option value="quiz">Multiple Choice Quiz</option>
                    <option value="situational">Situational Scenario Case</option>
                  </select>
                </div>

                {currentFlowStep.assessmentType === "quiz" && (
                  <div className="space-y-2 border-t pt-2">
                    <input
                      type="text"
                      placeholder="Write quiz question text block..."
                      value={currentQuizQuestion.questionText}
                      onChange={(e) => setCurrentQuizQuestion({ ...currentQuizQuestion, questionText: e.target.value })}
                      className="w-full p-2 bg-white border rounded-xl text-xs focus:outline-none"
                    />
                    <div className="grid grid-cols-1 gap-2">
                      {currentQuizQuestion.options.map((opt, oIdx) => (
                        <input
                          key={oIdx}
                          type="text"
                          placeholder={`Choice Answer Option ${oIdx + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const updated = [...currentQuizQuestion.options];
                            updated[oIdx] = e.target.value;
                            setCurrentQuizQuestion({ ...currentQuizQuestion, options: updated });
                          }}
                          className="p-2 bg-white border rounded-xl text-xs focus:outline-none"
                          style={{
                            border:
                              currentQuizQuestion.correctAnswerIndex === oIdx
                                ? "2px solid #10b981"
                                : "1px solid #e2e8f0",
                            backgroundColor:
                              currentQuizQuestion.correctAnswerIndex === oIdx ? "#f0fdf4" : "#ffffff",
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-4 pt-1">
                      <select
                        value={currentQuizQuestion.correctAnswerIndex}
                        onChange={(e) =>
                          setCurrentQuizQuestion({
                            ...currentQuizQuestion,
                            correctAnswerIndex: parseInt(e.target.value, 10),
                          })
                        }
                        className="p-1 border rounded bg-white text-[11px] focus:outline-none"
                      >
                        <option value={0}>Option 1 is correct</option>
                        <option value={1}>Option 2 is correct</option>
                        <option value={2}>Option 3 is correct</option>
                        <option value={3}>Option 4 is correct</option>
                      </select>
                      <button
                        type="button"
                        onClick={addQuizQuestionToStep}
                        className="px-3 py-1 bg-white border rounded text-[11px] font-bold text-gray-700 hover:bg-gray-50"
                      >
                        + Save Question
                      </button>
                    </div>
                  </div>
                )}

                {currentFlowStep.assessmentType === "situational" && (
                  <div className="space-y-2 border-t pt-2">
                    <textarea
                      rows="2"
                      placeholder="Describe crisis scenario circumstances..."
                      value={currentFlowStep.situationalScenario}
                      onChange={(e) =>
                        setCurrentFlowStep({ ...currentFlowStep, situationalScenario: e.target.value })
                      }
                      className="w-full p-2 bg-white border rounded-xl text-xs focus:outline-none"
                    />
                    <div className="flex flex-col gap-1 bg-white p-2 border border-slate-200 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-gray-400 font-mono">
                        Upload Attachment Reference Picture
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const targetFile = e.target.files[0];
                          if (targetFile) {
                            setSituationalImage(targetFile);
                            notify(`Asset assigned successfully: ${targetFile.name}`);
                          }
                        }}
                        className="text-[11px] text-gray-500 mt-1 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                      />
                      {situationalImage && (
                        <p className="text-[10px] text-emerald-600 font-mono font-medium mt-0.5">
                          Staged Image: {situationalImage.name}
                        </p>
                      )}
                    </div>
                    <textarea
                      rows="1"
                      placeholder="Officer check rubric grading guides..."
                      value={currentFlowStep.situationalGuide}
                      onChange={(e) => setCurrentFlowStep({ ...currentFlowStep, situationalGuide: e.target.value })}
                      className="w-full p-2 bg-white border rounded-xl text-xs focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={addStepToFlow}
            className="w-full py-2 bg-gray-100 hover:bg-gray-200 border text-xs font-bold rounded-xl text-gray-700"
          >
            + Save Content Step Element to {activeLevel.title}
          </button>
        </div>

        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl text-xs uppercase tracking-wider"
            >
              Cancel
            </button>
          )}

          {isReviewMode ? (
            <>
              <button
                type="submit"
                className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl text-xs uppercase tracking-wider"
              >
                Save Edits
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="flex-1 py-3 bg-red-50 hover:bg-red-600 hover:text-white border border-red-200 text-red-600 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={handleApprove}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm"
              >
                Approve &amp; Publish
              </button>
            </>
          ) : (
            <button
              type="submit"
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm"
            >
              {editingModule ? "Commit Changes to Syllabus" : "Publish Training Module Layout"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}