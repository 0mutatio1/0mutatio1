const { useEffect, useMemo, useState } = React;

const POSTS_DIR = "content/posts/";
const TRANSLATION_LANGUAGES = [
  { code: "", label: "Original" },
  { code: "zh-CN", label: "Chinese" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "pt", label: "Portuguese" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
];
const GOOGLE_TRANSLATE_LANGUAGES = TRANSLATION_LANGUAGES
  .map((language) => language.code)
  .filter(Boolean)
  .join(",");
let translateScriptPromise = null;

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, source) => {
      return `<img src="${normalizeAssetPath(source)}" alt="${alt}">`;
    })
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, href) => {
      if (href.startsWith("#")) {
        return `<a href="${href}">${text}</a>`;
      }

      return `<a href="${href}" target="_blank" rel="noreferrer">${text}</a>`;
    })
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function normalizeAssetPath(source) {
  return source.replace(/^(\.\.\/)+images\//, "images/");
}

function normalizeSearchText(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function postMatchesQuery(post, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  return normalizeSearchText(post.title).includes(normalizedQuery);
}

function extractFencedCodeBlocks(markdown) {
  const codeBlocks = [];
  const text = markdown.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_match, language, code) => {
    const index = codeBlocks.push({ language, code: code.replace(/\n$/, "") }) - 1;
    return `\n\n[[CODE_BLOCK_${index}]]\n\n`;
  });

  return { text, codeBlocks };
}

function plainHeadingText(value) {
  return value.replace(/[*_`#]/g, "").trim();
}

function markdownToHtml(markdown) {
  const { text, codeBlocks } = extractFencedCodeBlocks(markdown);
  const blocks = text.trim().split(/\n{2,}/).filter(Boolean);
  let sectionTitle = "";

  return blocks
    .map((block) => {
      const text = block.trim();
      const codeBlock = text.match(/^\[\[CODE_BLOCK_(\d+)]]$/);

      if (codeBlock) {
        const { language, code } = codeBlocks[Number(codeBlock[1])];
        const languageClass = language ? ` class="language-${escapeHtml(language)}"` : "";
        return `<pre class="code-block"><code${languageClass}>${escapeHtml(code)}</code></pre>`;
      }

      if (text.startsWith("# ")) {
        const [heading, ...rest] = text.split("\n");
        sectionTitle = plainHeadingText(heading.slice(2));
        return `<h2>${inlineMarkdown(heading.slice(2))}</h2>${rest.length > 0 ? markdownToHtml(rest.join("\n")) : ""}`;
      }

      if (text.startsWith("## ")) {
        const [heading, ...rest] = text.split("\n");
        sectionTitle = plainHeadingText(heading.slice(3));
        return `<h3>${inlineMarkdown(heading.slice(3))}</h3>${rest.length > 0 ? markdownToHtml(rest.join("\n")) : ""}`;
      }

      if (text.startsWith("### ")) {
        const [heading, ...rest] = text.split("\n");
        const className = sectionTitle.toLowerCase() === "faq" ? ' class="faq-question"' : "";
        return `<h4${className}>${inlineMarkdown(heading.slice(4))}</h4>${rest.length > 0 ? markdownToHtml(rest.join("\n")) : ""}`;
      }

      if (text === "---") {
        return "<hr>";
      }

      if (text.startsWith(">")) {
        const quote = text
          .split("\n")
          .map((line) => line.replace(/^>\s?/, ""))
          .join("<br>");
        return `<blockquote>${inlineMarkdown(quote)}</blockquote>`;
      }

      if (/^!\[[^\]]*\]\([^)]+\)$/.test(text)) {
        const image = text.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        return `<figure><img src="${normalizeAssetPath(image[2])}" alt="${escapeHtml(image[1])}"></figure>`;
      }

      if (text.split("\n").every((line) => line.startsWith("- "))) {
        const items = text
          .split("\n")
          .map((line) => `<li>${inlineMarkdown(line.slice(2))}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }

      if (text.split("\n").every((line) => /^\d+\.\s+/.test(line))) {
        const items = text
          .split("\n")
          .map((line) => `<li>${inlineMarkdown(line.replace(/^\d+\.\s+/, ""))}</li>`)
          .join("");
        return `<ol>${items}</ol>`;
      }

      return `<p>${inlineMarkdown(text.replace(/\n/g, " "))}</p>`;
    })
    .join("");
}

function slugFromFile(file) {
  return file.split("/").pop().replace(/\.md$/i, "");
}

function titleFromMarkdown(markdown, fallback) {
  const heading = markdown.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : fallback.replaceAll("-", " ");
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function parseFrontMatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: markdown };
  }

  const data = match[1].split("\n").reduce((frontMatter, line) => {
    const separator = line.indexOf(":");
    if (separator === -1) return frontMatter;

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    frontMatter[key] = value;
    return frontMatter;
  }, {});

  return { data, body: match[2] };
}

function githubRepoFromLocation() {
  if (!location.hostname.endsWith(".github.io")) return null;

  const owner = location.hostname.replace(".github.io", "");
  const pathParts = location.pathname.split("/").filter(Boolean);
  const repo = pathParts[0] || `${owner}.github.io`;

  return { owner, repo };
}

async function discoverFromDirectoryListing() {
  const response = await fetch(POSTS_DIR, { cache: "no-store" });
  if (!response.ok) return [];

  const html = await response.text();
  const documentFragment = new DOMParser().parseFromString(html, "text/html");

  return [...documentFragment.querySelectorAll("a")]
    .map((link) => decodeURIComponent(link.getAttribute("href") || ""))
    .filter((href) => href.toLowerCase().endsWith(".md"))
    .map((href) => `${POSTS_DIR}${href.split("/").pop()}`);
}

async function discoverFromGitHub() {
  const repo = githubRepoFromLocation();
  if (!repo) return [];

  const apiUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}/contents/${POSTS_DIR.replace(/\/$/, "")}`;
  const response = await fetch(apiUrl, {
    cache: "no-store",
    headers: { Accept: "application/vnd.github+json" },
  });

  if (!response.ok) return [];

  const entries = await response.json();
  if (!Array.isArray(entries)) return [];

  return entries
    .filter((entry) => entry.type === "file" && entry.name.toLowerCase().endsWith(".md"))
    .map((entry) => `${POSTS_DIR}${entry.name}`);
}

async function discoverPostFiles() {
  const localFiles = await discoverFromDirectoryListing().catch(() => []);
  if (localFiles.length > 0) return localFiles;

  const githubFiles = await discoverFromGitHub().catch(() => []);
  if (githubFiles.length > 0) return githubFiles;

  throw new Error("No Markdown posts found.");
}

async function loadPost(file) {
  const response = await fetch(file, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load ${file}`);
  }

  const markdown = await response.text();
  const { data, body } = parseFrontMatter(markdown);
  const id = slugFromFile(file);
  const createdAt = data.createdAt || data.date || "";

  return {
    id,
    file,
    title: data.title || titleFromMarkdown(body, id),
    date: data.date || formatDate(createdAt),
    createdAt,
    category: data.category || "Notes",
    body,
  };
}

function sortPostsByNewest(posts) {
  return [...posts].sort((first, second) => {
    const byDate = second.createdAt.localeCompare(first.createdAt);
    return byDate || first.title.localeCompare(second.title);
  });
}

function idFromHash() {
  return decodeURIComponent(location.hash.replace(/^#/, ""));
}

function updatePostHash(id) {
  if (!id || idFromHash() === id) return;

  history.replaceState(null, "", `#${encodeURIComponent(id)}`);
}

function clearGoogleTranslateCookie() {
  const expired = "googtrans=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
  document.cookie = expired;
  document.cookie = `${expired};domain=${location.hostname}`;
}

function loadGoogleTranslateScript() {
  if (window.google?.translate?.TranslateElement) {
    return Promise.resolve();
  }

  if (translateScriptPromise) {
    return translateScriptPromise;
  }

  translateScriptPromise = new Promise((resolve, reject) => {
    window.initGoogleTranslate = function initGoogleTranslate() {
      if (!window.google?.translate?.TranslateElement) {
        reject(new Error("Google Translate did not initialize."));
        return;
      }

      new window.google.translate.TranslateElement({
        pageLanguage: "en",
        includedLanguages: GOOGLE_TRANSLATE_LANGUAGES,
        autoDisplay: false,
      }, "google_translate_element");
      resolve();
    };

    const script = document.createElement("script");
    script.src = "https://translate.google.com/translate_a/element.js?cb=initGoogleTranslate";
    script.async = true;
    script.onerror = () => reject(new Error("Google Translate could not be loaded."));
    document.head.appendChild(script);
  });

  return translateScriptPromise;
}

async function waitForGoogleTranslateSelect() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const translateSelect = document.querySelector(".goog-te-combo");
    if (translateSelect) return translateSelect;

    await wait(150);
  }

  return null;
}

function dispatchSelectChange(select) {
  select.dispatchEvent(new Event("change", { bubbles: true }));

  const legacyEvent = document.createEvent("HTMLEvents");
  legacyEvent.initEvent("change", true, true);
  select.dispatchEvent(legacyEvent);
}

function isPageTranslated() {
  return document.documentElement.className.includes("translated");
}

function articleBodyText() {
  return document.querySelector(".article-body")?.textContent || "";
}

function setGoogleTranslateLanguage(translateSelect, languageCode) {
  translateSelect.value = languageCode;
  dispatchSelectChange(translateSelect);
}

function resetPageTranslation(setTranslationStatus) {
  clearGoogleTranslateCookie();
  setTranslationStatus("");

  if (document.documentElement.className.includes("translated")) {
    location.reload();
  }
}

async function requestPageTranslation(languageCode, setTranslationStatus) {
  if (!languageCode) {
    resetPageTranslation(setTranslationStatus);
    return;
  }

  let attempts = 0;
  const originalArticleText = articleBodyText();
  setTranslationStatus("Translating...");

  try {
    await loadGoogleTranslateScript();
  } catch {
    setTranslationStatus("Translation unavailable");
    return;
  }

  const translateSelect = await waitForGoogleTranslateSelect();
  if (!translateSelect) {
    setTranslationStatus("Translation unavailable");
    return;
  }

  async function tryTranslate() {
    setGoogleTranslateLanguage(translateSelect, languageCode);
    await wait(700);

    if (
      isPageTranslated() &&
      translateSelect.value === languageCode &&
      articleBodyText() !== originalArticleText
    ) {
      setTranslationStatus("");
      return;
    }

    attempts += 1;
    if (attempts < 12) {
      tryTranslate();
      return;
    }

    setTranslationStatus(isPageTranslated() ? "" : "Translation unavailable");
  }

  tryTranslate();
}

function warmUpTranslator() {
  const warmUp = () => {
    loadGoogleTranslateScript()
      .then(waitForGoogleTranslateSelect)
      .catch(() => {});
  };

  window.setTimeout(warmUp, 0);
}

function App() {
  const [posts, setPosts] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [query, setQuery] = useState("");
  const [translationLanguage, setTranslationLanguage] = useState("");
  const [translationStatus, setTranslationStatus] = useState("");
  const [status, setStatus] = useState("Loading posts...");

  useEffect(() => {
    let ignore = false;

    discoverPostFiles()
      .then((files) => Promise.all(files.map(loadPost)))
      .then((loadedPosts) => {
        if (ignore) return;

        const sortedPosts = sortPostsByNewest(loadedPosts);
        const hashId = idFromHash();
        const activePost = sortedPosts.find((post) => post.id === hashId) || sortedPosts[0];

        setPosts(sortedPosts);
        setActiveId(activePost?.id || "");
        setStatus(sortedPosts.length > 0 ? "" : "No posts found.");
      })
      .catch(() => {
        if (!ignore) {
          setStatus("Posts could not be loaded. Use a local server or GitHub Pages to read Markdown files.");
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    warmUpTranslator();
  }, []);

  useEffect(() => {
    function handleHashChange() {
      const hashId = idFromHash();
      if (posts.some((post) => post.id === hashId)) {
        setActiveId(hashId);
      }
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [posts]);

  useEffect(() => {
    updatePostHash(activeId);
  }, [activeId]);

  const activePost = posts.find((post) => post.id === activeId) || posts[0];
  const visiblePosts = useMemo(() => {
    return posts.filter((post) => postMatchesQuery(post, query));
  }, [posts, query]);

  useEffect(() => {
    if (visiblePosts.length > 0 && !visiblePosts.some((post) => post.id === activeId)) {
      setActiveId(visiblePosts[0].id);
    }
  }, [activeId, visiblePosts]);

  return (
    React.createElement(React.Fragment, null,
      React.createElement("header", { className: "site-header notranslate", translate: "no" },
        React.createElement("a", { className: "brand", href: "index.html", "aria-label": "Personal Blog home" }, "Personal Blog"),
        React.createElement("p", null, "Essays, notes, and small lessons from building, reading, and paying attention.")
      ),
      React.createElement("main", { className: "reader-layout" },
        React.createElement("aside", { className: "article-list notranslate", translate: "no", "aria-label": "Articles" },
          React.createElement("div", { className: "list-header" },
            React.createElement("h1", null, "Articles"),
            React.createElement("label", { className: "search-field" },
              React.createElement("span", { className: "visually-hidden" }, "Search articles"),
              React.createElement("input", {
                type: "search",
                placeholder: "Search",
                value: query,
                onChange: (event) => setQuery(event.target.value),
              })
            )
          ),
          React.createElement("nav", { className: "post-list", "aria-label": "Article list" },
            visiblePosts.map((post) => (
              React.createElement("button", {
                className: `post-card${post.id === activeId ? " active" : ""}`,
                key: post.id,
                type: "button",
                onClick: () => setActiveId(post.id),
              },
                React.createElement("span", { className: "post-title" }, post.title),
                React.createElement("span", { className: "post-meta" }, `${post.date} · ${post.category}`)
              )
            )),
            !status && visiblePosts.length === 0 && React.createElement("p", { className: "empty-state" }, "No articles found."),
            status && React.createElement("p", { className: "status-message" }, status)
          )
        ),
        React.createElement("article", { className: "article-pane", "aria-live": "polite" },
          activePost
            ? React.createElement(React.Fragment, null,
                React.createElement("div", { className: "article-header-row" },
                  React.createElement("p", { className: "article-meta notranslate", translate: "no" }, `${activePost.date} · ${activePost.category}`),
                  React.createElement("div", { className: "translate-tools notranslate", translate: "no", "aria-label": "Translate article" },
                    React.createElement("label", { className: "translation-select" },
                      React.createElement("span", null, "Translate"),
                      React.createElement("select", {
                        value: translationLanguage,
                        onChange: (event) => {
                          const languageCode = event.target.value;
                          setTranslationLanguage(languageCode);
                          requestPageTranslation(languageCode, setTranslationStatus);
                        },
                      },
                        TRANSLATION_LANGUAGES.map((language) => (
                          React.createElement("option", { key: language.code, value: language.code }, language.label)
                        ))
                      )
                    ),
                    React.createElement("span", {
                      className: `translation-status${translationStatus ? " active" : ""}`,
                      "aria-live": "polite",
                    },
                      translationStatus && React.createElement("span", { className: "translation-spinner", "aria-hidden": "true" }),
                      React.createElement("span", null, translationStatus)
                    )
                  )
                ),
                React.createElement("div", {
                  className: "article-body",
                  dangerouslySetInnerHTML: { __html: markdownToHtml(activePost.body) },
                })
              )
            : React.createElement("p", { className: "status-message" }, status)
        )
      ),
      React.createElement("footer", { className: "site-footer notranslate", translate: "no" },
        React.createElement("p", null, `© ${new Date().getFullYear()} Personal Blog`)
      )
    )
  );
}

ReactDOM.createRoot(document.querySelector("#root")).render(React.createElement(App));
