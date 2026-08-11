export const scrollToFirstError = (containerId, activeErrorIds) => {
  const container = document.getElementById(containerId);
  if (!container || !activeErrorIds || activeErrorIds.length === 0) return;

  const errorElements = activeErrorIds
    .map((id) => document.getElementById(id))
    .filter((el) => el !== null);

  if (errorElements.length === 0) return;

  errorElements.sort((a, b) => {
    return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
  });

  const firstErrorEl = errorElements[0];
  const containerRect = container.getBoundingClientRect();
  const elementRect = firstErrorEl.getBoundingClientRect();

  const offset = elementRect.top - containerRect.top + container.scrollTop - 24;

  container.scrollTo({
    top: offset,
    behavior: "smooth",
  });
};
