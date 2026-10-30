export default {
  layout: "post.njk",
  lang: "en",
  isPost: true,
  isCustomLayout: true,
  eleventyComputed: {
    permalink: (data) => {
      if (data.draft && process.env.BUILD_DRAFTS !== "true") {
        return false;
      }
      const slug = data.slug || data.page.fileSlug;
      return `/en/posts/${slug}/index.html`;
    },
  },
};
