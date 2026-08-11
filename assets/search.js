(() => {
  "use strict";

  const searchInput = document.querySelector("#title-search");
  const results = Array.from(document.querySelectorAll("[data-search-result]"));
  const tagCheckboxes = Array.from(document.querySelectorAll('input[name="article-tag"]'));
  const modeRadios = Array.from(document.querySelectorAll('input[name="tag-mode"]'));
  const resultStatus = document.querySelector("#search-result-status");
  const selectedTagCount = document.querySelector("#selected-tag-count");
  const clearButton = document.querySelector("#clear-search");
  const noResults = document.querySelector("#no-search-results");
  const googleForm = document.querySelector("#google-site-search");
  const googleQuery = document.querySelector("#google-query");
  const googleButton = document.querySelector("#google-search-button");

  if (!searchInput || results.length === 0) return;

  const normalize = (value) => value.normalize("NFKC").toLocaleLowerCase();
  const indexedResults = results.map((element) => ({
    element,
    title: normalize(element.querySelector(".post-link").textContent),
    tags: element.dataset.tags ? element.dataset.tags.split("|") : []
  }));

  const updateResults = () => {
    const terms = normalize(searchInput.value).trim().split(/\s+/).filter(Boolean);
    const selectedTags = tagCheckboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value);
    const mode = modeRadios.find((radio) => radio.checked)?.value || "any";
    let visibleCount = 0;

    indexedResults.forEach(({ element, title, tags }) => {
      const matchesTitle = terms.every((term) => title.includes(term));
      const matchesTags = selectedTags.length === 0 || (mode === "all"
        ? selectedTags.every((tag) => tags.includes(tag))
        : selectedTags.some((tag) => tags.includes(tag)));
      const visible = matchesTitle && matchesTags;
      element.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    resultStatus.textContent = `${visibleCount}件の記事`;
    selectedTagCount.textContent = `（${selectedTags.length}件選択）`;
    noResults.hidden = visibleCount !== 0;
    clearButton.disabled = terms.length === 0 && selectedTags.length === 0 && mode === "any";
    googleButton.disabled = searchInput.value.trim().length === 0;
  };

  searchInput.addEventListener("input", updateResults);
  tagCheckboxes.forEach((checkbox) => checkbox.addEventListener("change", updateResults));
  modeRadios.forEach((radio) => radio.addEventListener("change", updateResults));

  clearButton.addEventListener("click", () => {
    searchInput.value = "";
    tagCheckboxes.forEach((checkbox) => { checkbox.checked = false; });
    modeRadios.find((radio) => radio.value === "any").checked = true;
    updateResults();
    searchInput.focus();
  });

  googleForm.addEventListener("submit", (event) => {
    const query = searchInput.value.trim();
    if (!query) {
      event.preventDefault();
      return;
    }
    googleQuery.value = `site:kaityo256.github.io ${query}`;
  });

  updateResults();
})();
