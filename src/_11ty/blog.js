const INTERNAL_ELEVENTY_TAGS = new Set(["all", "nav", "post", "posts"]);

/**
 * Create a clean URL-safe slug preserving Unicode letters (Hebrew & Latin) and numbers.
 */
export function taxSlug(str) {
  const cleaned = String(str || "")
    .trim()
    .toLowerCase()
    .replace(/['"״׳`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || encodeURIComponent(String(str || "").trim());
}

function normalizeStringList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Extract normalized category objects for a post's data cascade.
 */
export function getPostCategories(data = {}) {
  const lang = data.lang || "he";
  const combined = [
    ...normalizeStringList(data.categories),
    ...normalizeStringList(data.category),
  ];

  const seen = new Set();
  const result = [];
  for (const name of combined) {
    const slug = taxSlug(name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    result.push({
      name,
      slug,
      url: `/${lang}/posts/category/${slug}/`,
    });
  }
  return result;
}

/**
 * Extract normalized tag objects for a post's data cascade, excluding Eleventy system tags.
 */
export function getPostTags(data = {}) {
  const lang = data.lang || "he";
  const combined = [
    ...normalizeStringList(data.postTags),
    ...normalizeStringList(data.tags),
  ].filter((t) => !INTERNAL_ELEVENTY_TAGS.has(t.toLowerCase()));

  const seen = new Set();
  const result = [];
  for (const name of combined) {
    const slug = taxSlug(name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    result.push({
      name,
      slug,
      url: `/${lang}/posts/tag/${slug}/`,
    });
  }
  return result;
}

function getPublishedPostsByLang(collectionApi, lang) {
  return collectionApi
    .getAll()
    .filter(
      (item) =>
        item.data?.isPost === true &&
        item.data?.lang === lang &&
        item.url &&
        (!item.data.draft || process.env.BUILD_DRAFTS === "true")
    )
    .sort((a, b) => b.date - a.date);
}

function aggregateTaxonomies(posts, extractor) {
  const map = new Map();
  for (const post of posts) {
    const entries = extractor(post.data);
    for (const entry of entries) {
      if (!map.has(entry.slug)) {
        map.set(entry.slug, {
          name: entry.name,
          slug: entry.slug,
          url: entry.url,
          posts: [],
        });
      }
      map.get(entry.slug).posts.push(post);
    }
  }

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      count: item.posts.length,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function registerBlogPlugin(eleventyConfig) {
  // Drafts preprocessor: skip any template with draft: true unless BUILD_DRAFTS=true
  eleventyConfig.addPreprocessor("drafts", "*", (data) => {
    if (data.draft && process.env.BUILD_DRAFTS !== "true") {
      return false;
    }
  });

  // Per-language post collections
  eleventyConfig.addCollection("posts_he", (collectionApi) =>
    getPublishedPostsByLang(collectionApi, "he")
  );

  eleventyConfig.addCollection("posts_en", (collectionApi) =>
    getPublishedPostsByLang(collectionApi, "en")
  );

  // Main blog index descriptors — ONLY emitted for languages with >= 1 published post
  eleventyConfig.addCollection("blogIndexes", (collectionApi) => {
    const indexes = [];
    for (const lang of ["he", "en"]) {
      const posts = getPublishedPostsByLang(collectionApi, lang);
      if (posts.length === 0) continue;

      indexes.push({
        lang,
        title: lang === "he" ? "רשימות" : "Notes",
        url: `/${lang}/posts/`,
        posts,
        categories: aggregateTaxonomies(posts, getPostCategories),
        tags: aggregateTaxonomies(posts, getPostTags),
      });
    }
    return indexes;
  });

  // Category archive descriptors — ONLY emitted for categories with >= 1 published post
  eleventyConfig.addCollection("blogCategories", (collectionApi) => {
    const archives = [];
    for (const lang of ["he", "en"]) {
      const posts = getPublishedPostsByLang(collectionApi, lang);
      if (posts.length === 0) continue;

      const categories = aggregateTaxonomies(posts, getPostCategories);
      for (const cat of categories) {
        archives.push({
          lang,
          taxonomy: "category",
          name: cat.name,
          slug: cat.slug,
          url: cat.url,
          posts: cat.posts,
          count: cat.count,
          allCategories: categories,
          indexUrl: `/${lang}/posts/`,
        });
      }
    }
    return archives;
  });

  // Tag archive descriptors — ONLY emitted for tags with >= 1 published post
  eleventyConfig.addCollection("blogTags", (collectionApi) => {
    const archives = [];
    for (const lang of ["he", "en"]) {
      const posts = getPublishedPostsByLang(collectionApi, lang);
      if (posts.length === 0) continue;

      const tags = aggregateTaxonomies(posts, getPostTags);
      for (const tag of tags) {
        archives.push({
          lang,
          taxonomy: "tag",
          name: tag.name,
          slug: tag.slug,
          url: tag.url,
          posts: tag.posts,
          count: tag.count,
          allTags: tags,
          indexUrl: `/${lang}/posts/`,
        });
      }
    }
    return archives;
  });

  // Filters
  eleventyConfig.addFilter("postCategories", (data) => getPostCategories(data));
  eleventyConfig.addFilter("postTags", (data) => getPostTags(data));

  eleventyConfig.addFilter("formatPostDate", (dateVal, lang = "he") => {
    if (!dateVal) return "";
    const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
    if (Number.isNaN(d.getTime())) return String(dateVal);

    const locale = lang === "he" ? "he-IL" : "en-US";
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(d);
  });

  eleventyConfig.addFilter("readingTime", (content, lang = "he") => {
    const plain = String(content || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const words = plain ? plain.split(" ").length : 0;
    const mins = Math.max(1, Math.round(words / 190));

    if (lang === "he") {
      return mins === 1 ? "דקת קריאה אחת" : `${mins} דק׳ קריאה`;
    }
    return `${mins} min read`;
  });

  eleventyConfig.addFilter("adjacentPosts", (posts, currentUrl) => {
    if (!Array.isArray(posts) || posts.length < 2) {
      return { newer: null, older: null };
    }
    const idx = posts.findIndex((p) => p.url === currentUrl);
    if (idx === -1) return { newer: null, older: null };

    return {
      newer: idx > 0 ? posts[idx - 1] : null,
      older: idx < posts.length - 1 ? posts[idx + 1] : null,
    };
  });

  eleventyConfig.addFilter("encodeUrlPath", (url) => {
    if (!url) return "";
    return encodeURI(String(url));
  });

  eleventyConfig.addFilter(
    "resolveTranslatedUrl",
    (currentUrl, targetLang, translationKey, collections) => {
      const fallback = targetLang === "en" ? "/en/" : "/";
      if (!collections) return fallback;

      const targetPosts =
        targetLang === "he" ? collections.posts_he : collections.posts_en;

      // 1. Direct translated post match via translationKey
      if (translationKey && Array.isArray(targetPosts)) {
        const match = targetPosts.find(
          (p) => p.data?.translationKey === translationKey
        );
        if (match?.url) return match.url;
      }

      // 2. If currently inside /posts/ and target language also has posts, link to target /posts/
      if (
        typeof currentUrl === "string" &&
        currentUrl.includes("/posts/") &&
        Array.isArray(targetPosts) &&
        targetPosts.length > 0
      ) {
        return `/${targetLang}/posts/`;
      }

      return fallback;
    }
  );
}
